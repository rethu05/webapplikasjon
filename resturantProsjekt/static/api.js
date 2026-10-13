// Felles hjelpefunksjoner for kommunikasjon med serveren.
// Brukes av reservasjon.js, hentbestilling.js og rateservice.js.
(function () {
    "use strict";

    // Når HTML-filen åpnes direkte (file://) må vi peke eksplisitt på serveren
    const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";
    const TIDSAVBRUDD_MS = 10000;

    // Samme regler som serveren bruker
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

    class ApiFeil extends Error {
        constructor(melding, status) {
            super(melding);
            this.name = "ApiFeil";
            this.status = status;
        }
    }

    /**
     * Sender en forespørsel til serveren og returnerer JSON-svaret.
     * Kaster alltid ApiFeil med en melding som kan vises direkte til brukeren.
     */
    async function apiKall(sti, { method = "GET", body } = {}) {
        const kontroller = new AbortController();
        const timer = setTimeout(() => kontroller.abort(), TIDSAVBRUDD_MS);

        let respons;
        try {
            const headers = { Accept: "application/json" };
            if (body !== undefined) headers["Content-Type"] = "application/json";

            respons = await fetch(API_BASE + sti, {
                method,
                headers,
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: kontroller.signal,
            });
        } catch (err) {
            if (err.name === "AbortError") {
                throw new ApiFeil("Serveren brukte for lang tid på å svare. Prøv igjen om litt.", 0);
            }
            throw new ApiFeil("Får ikke kontakt med serveren. Sjekk at serveren kjører (npm start) og prøv igjen.", 0);
        } finally {
            clearTimeout(timer);
        }

        let data = null;
        const erJson = (respons.headers.get("content-type") || "").includes("application/json");
        if (erJson) {
            try {
                data = await respons.json();
            } catch (err) {
                data = null;
            }
        }

        if (!respons.ok) {
            const melding = (data && data.error) || `Serveren svarte med en feil (kode ${respons.status}). Prøv igjen.`;
            throw new ApiFeil(melding, respons.status);
        }

        if (data === null) {
            throw new ApiFeil("Serveren sendte et uventet svar. Prøv igjen.", respons.status);
        }
        return data;
    }

    /** Gjør tekst trygg å sette inn med innerHTML (hindrer at brukerinput tolkes som HTML/script). */
    function escapeHtml(verdi) {
        return String(verdi === undefined || verdi === null ? "" : verdi).replace(/[&<>"']/g, (tegn) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        })[tegn]);
    }

    /** Henter en feilmelding som kan vises til brukeren fra hva som helst som er kastet. */
    function feilmeldingFra(err) {
        if (err instanceof ApiFeil) return err.message;
        console.error(err);
        return "Noe gikk galt. Last inn siden på nytt og prøv igjen.";
    }

    window.KultiApi = { apiKall, escapeHtml, feilmeldingFra, ApiFeil, REGLER };
})();
