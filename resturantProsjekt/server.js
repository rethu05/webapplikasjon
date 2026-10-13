"use strict";

const express = require("express");
const path = require("path");
const fsp = require("fs").promises;
const cookieParser = require("cookie-parser");

const server = express();
const PORT = Number(process.env.PORT) || 3000;
// DATA_DIR kan overstyres (f.eks. ved testing) slik at ekte data ikke blir rørt
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const RESERVASJON_FIL = path.join(DATA_DIR, "modell.json");
const RATING_FIL = path.join(DATA_DIR, "ratings.json");

// Valideringsregler – de samme reglene brukes i nettleseren
const REGLER = {
  navnMin: 2,
  navnMaks: 80,
  adresseMaks: 120,
  telefon: /^\+?\d{8,15}$/,
  antallMin: 1,
  antallMaks: 30,
  kommentarMaks: 1000,
  bestillingsNr: /^\d{1,10}$/,
};

/* -------------------------------------------------------------------------- */
/*  Hjelpefunksjoner                                                          */
/* -------------------------------------------------------------------------- */

/** Feil med HTTP-status og en melding som er trygg å vise til brukeren. */
class HttpFeil extends Error {
  constructor(status, melding) {
    super(melding);
    this.name = "HttpFeil";
    this.status = status;
  }
}

/** Express 4 fanger ikke feil fra async-funksjoner – dette sender dem videre til feilhåndtereren. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Kjører filoperasjoner én og én per fil. Uten dette kan to samtidige
 * reservasjoner lese samme fil og overskrive hverandres endringer.
 */
const filkøer = new Map();
function medFillås(fil, oppgave) {
  const forrige = filkøer.get(fil) || Promise.resolve();
  const neste = forrige.then(oppgave);
  filkøer.set(fil, neste.catch(() => {}));
  return neste;
}

/** Leser en JSON-fil. Returnerer standardverdi hvis filen mangler eller er tom. */
async function lesJson(fil, standard, erGyldigFormat) {
  let innhold;
  try {
    innhold = await fsp.readFile(fil, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return standard;
    throw err;
  }

  if (innhold.trim() === "") return standard;

  let data;
  try {
    data = JSON.parse(innhold);
  } catch (err) {
    // Filen skal IKKE overskrives her – da ville alle eksisterende data gått tapt
    console.error(`Datafilen ${fil} inneholder ugyldig JSON: ${err.message}`);
    throw new HttpFeil(500, "De lagrede dataene er skadet. Kontakt restauranten.");
  }

  if (!erGyldigFormat(data)) {
    console.error(`Datafilen ${fil} har uventet format.`);
    throw new HttpFeil(500, "De lagrede dataene har feil format. Kontakt restauranten.");
  }
  return data;
}

/** Skriver til en midlertidig fil og bytter den inn, så filen aldri blir halvveis skrevet. */
async function skrivJson(fil, data) {
  await fsp.mkdir(path.dirname(fil), { recursive: true });
  const tmp = `${fil}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fsp.rename(tmp, fil);
}

const erObjekt = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const tilTekst = (v) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");

function validerReservasjon(body) {
  const navn = tilTekst(body.navn).replace(/\s+/g, " ");
  const adresse = tilTekst(body.adr).replace(/\s+/g, " ");
  const telefon = tilTekst(body.tlf).replace(/[\s-]/g, "");
  const antallTekst = tilTekst(body.bordforhvorMange);
  const antall = Number(antallTekst);

  const feil = [];
  if (navn.length < REGLER.navnMin || navn.length > REGLER.navnMaks) {
    feil.push(`Navn må være mellom ${REGLER.navnMin} og ${REGLER.navnMaks} tegn.`);
  }
  if (adresse.length > REGLER.adresseMaks) {
    feil.push(`Adressen kan være maks ${REGLER.adresseMaks} tegn.`);
  }
  if (!REGLER.telefon.test(telefon)) {
    feil.push("Telefonnummeret må bestå av 8–15 sifre.");
  }
  if (antallTekst === "" || !Number.isInteger(antall) || antall < REGLER.antallMin || antall > REGLER.antallMaks) {
    feil.push(`Antall personer må være et helt tall mellom ${REGLER.antallMin} og ${REGLER.antallMaks}.`);
  }

  return { feil, verdier: { navn, adresse, telefon, antall } };
}

/** Lager et bestillingsnummer som garantert ikke er i bruk fra før. */
function nyttBestillingsNr(reservasjoner) {
  const brukte = new Set(Object.values(reservasjoner).map((r) => Number(r && r.bestillingsNr)));
  for (let forsøk = 0; forsøk < 1000; forsøk++) {
    const nr = Math.floor(10000 + Math.random() * 90000);
    if (!brukte.has(nr)) return nr;
  }
  throw new HttpFeil(503, "Kunne ikke lage et ledig bestillingsnummer. Prøv igjen.");
}

/** Finner neste ledige nøkkel (reservasjon1, reservasjon2, ...) uten å overskrive eksisterende. */
function nesteNøkkel(reservasjoner) {
  const høyeste = Object.keys(reservasjoner).reduce((maks, nøkkel) => {
    const n = Number(nøkkel.replace(/^reservasjon/, ""));
    return Number.isInteger(n) && n > maks ? n : maks;
  }, 0);
  return `reservasjon${høyeste + 1}`;
}

/* -------------------------------------------------------------------------- */
/*  Middleware                                                                */
/* -------------------------------------------------------------------------- */

server.use(express.json({ limit: "10kb" }));
server.use(express.urlencoded({ extended: false, limit: "10kb" }));
server.use(cookieParser());

// CORS slik at sidene også fungerer når HTML-filene åpnes direkte (file://)
server.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

server.use(express.static(path.join(__dirname, "static")));

/* -------------------------------------------------------------------------- */
/*  Ruter                                                                     */
/* -------------------------------------------------------------------------- */

// Opprett ny reservasjon
server.post(
  "/reservasjon",
  asyncHandler(async (req, res) => {
    const { feil, verdier } = validerReservasjon(req.body || {});
    if (feil.length > 0) throw new HttpFeil(400, feil.join(" "));

    const reservasjon = await medFillås(RESERVASJON_FIL, async () => {
      const reservasjoner = await lesJson(RESERVASJON_FIL, {}, erObjekt);

      const ny = {
        navn: verdier.navn,
        adresse: verdier.adresse,
        bordnummer: Math.floor(Math.random() * 20) + 1,
        telefon: verdier.telefon,
        dato: new Date().toISOString(),
        bordforhvormange: String(verdier.antall),
        bestillingsNr: nyttBestillingsNr(reservasjoner),
      };

      reservasjoner[nesteNøkkel(reservasjoner)] = ny;
      await skrivJson(RESERVASJON_FIL, reservasjoner);
      return ny;
    });

    console.log(`Ny reservasjon: #${reservasjon.bestillingsNr} (${reservasjon.bordforhvormange} pers.)`);
    res.status(201).json({ message: "Reservasjon opprettet!", reservasjon });
  })
);

// Hent reservasjon med bestillingsnummer
server.get(
  "/reservasjon/:bestillingsNr",
  asyncHandler(async (req, res) => {
    const råNr = String(req.params.bestillingsNr).trim();
    if (!REGLER.bestillingsNr.test(råNr)) {
      throw new HttpFeil(400, "Bestillingsnummeret kan bare inneholde sifre.");
    }

    const nr = Number(råNr);
    const reservasjoner = await lesJson(RESERVASJON_FIL, {}, erObjekt);
    const funnet = Object.values(reservasjoner).find((r) => r && Number(r.bestillingsNr) === nr);

    if (!funnet) throw new HttpFeil(404, `Fant ingen reservasjon med bestillingsnummer ${nr}.`);
    res.json(funnet);
  })
);

// Lagre vurdering
server.post(
  "/api/rating",
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const rating = Number(body.rating);
    const kommentar = tilTekst(body.feedback);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new HttpFeil(400, "Vurderingen må være et helt tall fra 1 til 5.");
    }
    if (kommentar.length > REGLER.kommentarMaks) {
      throw new HttpFeil(400, `Kommentaren kan være maks ${REGLER.kommentarMaks} tegn.`);
    }

    await medFillås(RATING_FIL, async () => {
      const ratings = await lesJson(RATING_FIL, [], Array.isArray);
      ratings.push({ rating, kommentar, dato: new Date().toISOString() });
      await skrivJson(RATING_FIL, ratings);
    });

    res.status(201).json({ message: "Takk for din vurdering!", rating });
  })
);

/* -------------------------------------------------------------------------- */
/*  404 og feilhåndtering                                                     */
/* -------------------------------------------------------------------------- */

const erApiForespørsel = (req) => req.path.startsWith("/api/") || req.path.startsWith("/reservasjon");

server.use((req, res) => {
  if (erApiForespørsel(req)) {
    return res.status(404).json({ error: "Fant ikke det du spurte etter." });
  }
  res.status(404).send(`<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Siden finnes ikke</title>
  <style>
    body { font-family: sans-serif; text-align: center; background-color: #f7df68; color: #3a4f99; padding: 50px; }
    a { color: #3a4f99; font-weight: bold; }
  </style>
</head>
<body>
  <h1>404 - Finner ikke siden</h1>
  <p>Beklager, siden du leter etter finnes ikke.</p>
  <p><a href="/">Gå tilbake til forsiden</a></p>
</body>
</html>`);
});

// Sentral feilhåndterer – brukeren får alltid en forståelig JSON-melding, aldri en stack trace
// eslint-disable-next-line no-unused-vars
server.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = Number(err.status || err.statusCode) || 500;
  let melding;

  if (err.type === "entity.parse.failed") {
    status = 400;
    melding = "Forespørselen inneholdt ugyldig JSON.";
  } else if (err.type === "entity.too.large") {
    status = 413;
    melding = "Forespørselen er for stor.";
  } else if (err instanceof HttpFeil) {
    melding = err.message;
  } else if (status < 500) {
    melding = "Ugyldig forespørsel.";
  } else {
    status = 500;
    melding = "Det oppstod en uventet feil på serveren. Prøv igjen senere.";
  }

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} feilet:`, err);
  }
  res.status(status).json({ error: melding });
});

/* -------------------------------------------------------------------------- */
/*  Oppstart                                                                  */
/* -------------------------------------------------------------------------- */

const httpServer = server.listen(PORT, () => {
  console.log(`Serveren kjører på http://localhost:${PORT}`);
});

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} er allerede i bruk. Lukk det andre programmet, eller velg en annen port: PORT=3001 npm start`);
  } else if (err.code === "EACCES") {
    console.error(`Mangler tilgang til port ${PORT}. Prøv en port over 1024.`);
  } else {
    console.error("Kunne ikke starte serveren:", err);
  }
  process.exit(1);
});

process.on("unhandledRejection", (grunn) => {
  console.error("Uhåndtert promise-feil:", grunn);
});

process.on("uncaughtException", (err) => {
  console.error("Uventet feil – serveren avsluttes:", err);
  process.exit(1);
});
