const express = require("express");
const server = express();

server.use(express.urlencoded({ extended: false }));
server.use(express.json());

server.use(express.static("./static"));
const fs = require("fs");

const cookieParser = require("cookie-parser");
server.use(cookieParser());

server.post("/reservasjon", (req, res) => {
  fs.readFile("./data/modell.json", "utf8", (err, result) => {
    //Hvis filen ikke finnes, lager filen
    if (err) {
      if (err.code === "ENOENT") {
        console.log("Creating new modell.json file");
        result = "{}";
      }
      //Andre feil som ikke handler om at feilen ikke eksisterer
      else {
        console.log(err);
        return;
      }
    }
    //Hvis filen er tom
    if (result.trim() === "") {
      console.log("modell.json is empty");
      result = "{}";
    }

    var reservasjoner = JSON.parse(result);

    var reservasjon = {
      navn: req.body.navn,
      adresse: req.body.adr,
      bordnummer: Math.floor(Math.random() * 19) + 1,
      telefon: req.body.tlf,
      dato: new Date(),
      bordforhvormange: req.body.bordforhvorMange,
      bestillingsNr: req.body.bestillingsNr,
    };

    reservasjoner[
      "reservasjon" + Number(Object.keys(reservasjoner).length) + 1
    ] = reservasjon;

    reservasjoner = JSON.stringify(reservasjoner);

    fs.writeFile(
      "./data/modell.json",
      reservasjoner,
      { flag: "w" },
      (err, result) => {
        if (err) {
          console.log(err);
          return;
        }
        res.status(201).send("OK");
      }
    );
  });
});

server.get("/reservasjon/:bestillingsNr", (req, res) => {
  const fs = require("fs");
  const bestillingsNr = Number(req.params.bestillingsNr);
  console.log("Bestillings nr : " + bestillingsNr);
  fs.readFile("./data/modell.json", "utf8", (err, result) => {
    if (err) {
      console.log(err);
      res.sendStatus(500);
      return;
    }
    let reservasjoner = {};
    try {
      reservasjoner = JSON.parse(result);
    } catch (e) {
      res.status(500).send("Kunne ikke skjonne dataene i filen.");
      return;
    }
    
    const reservation =
      reservasjoner[
        Object.keys(reservasjoner).find(
          (key) => reservasjoner[key].bestillingsNr === bestillingsNr
        )
      ];

    if (reservation) {
      res.send(reservation);
    } else {
      res.status(404).send(`Kunne ikke finne reservasjon med bestillingsnummer ${bestillingsNr}.`);
    }
  });
});


server.get("*", (req, res) => {
  res.status(404).send("<h1>Finner ikke det du leter etter, kis</h1>");
});

server.listen(5000, () => {
  console.log("Serveren kjører, og lytter etter port 5000");
});
