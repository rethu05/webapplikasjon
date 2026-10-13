(function () {
    "use strict";

    const form = document.getElementById("reservasjonForm");
    if (!form) return;

    if (!window.KultiApi) {
        console.error("api.js er ikke lastet – reservasjon kan ikke sendes.");
        return;
    }
    const { apiKall, escapeHtml, feilmeldingFra, REGLER } = window.KultiApi;

    const knapp = document.getElementById("reservasjonButtonEl");
    const suksessBoks = document.getElementById("suksessBoks");
    const suksessTekst = document.getElementById("suksessTekst");
    const feilBoks = document.getElementById("feilBoks");
    const feilTekst = document.getElementById("feilTekst");

    const felt = {
        navn: document.getElementById("navnInputEl"),
        adresse: document.getElementById("adresseInputEl"),
        telefon: document.getElementById("telefonInputEl"),
        antall: document.getElementById("bordInputEl"),
    };

    function skjulMeldinger() {
        suksessBoks.hidden = true;
        feilBoks.hidden = true;
    }

    function nullstillFeltfeil() {
        Object.values(felt).forEach((input) => {
            input.classList.remove("ugyldig");
            input.removeAttribute("aria-invalid");
        });
    }

    function visFeil(meldinger, ugyldigeFelt = []) {
        suksessBoks.hidden = true;
        const liste = Array.isArray(meldinger) ? meldinger : [meldinger];
        feilTekst.innerHTML = liste.length > 1
            ? `<ul>${liste.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>`
            : `<p>${escapeHtml(liste[0])}</p>`;

        ugyldigeFelt.forEach((navn) => {
            felt[navn].classList.add("ugyldig");
            felt[navn].setAttribute("aria-invalid", "true");
        });
        if (ugyldigeFelt.length > 0) felt[ugyldigeFelt[0]].focus();

        feilBoks.hidden = false;
    }

    function visSuksess(r) {
        feilBoks.hidden = true;
        suksessTekst.innerHTML =
            `Takk, <strong>${escapeHtml(r.navn)}</strong>!<br>` +
            `Bord for <strong>${escapeHtml(r.bordforhvormange)} personer</strong> er reservert.<br>` +
            `Tildelt bordnummer: <strong>#${escapeHtml(r.bordnummer)}</strong><br>` +
            `Ditt bestillingsnummer er: <strong class="bestillingsnr">${escapeHtml(r.bestillingsNr)}</strong>`;
        suksessBoks.hidden = false;
    }

    /** Sjekker skjemaet før det sendes. Serveren sjekker de samme reglene på nytt. */
    function validerSkjema(verdier) {
        const meldinger = [];
        const ugyldige = [];

        if (verdier.navn.length < REGLER.navnMin || verdier.navn.length > REGLER.navnMaks) {
            meldinger.push(`Skriv inn navnet ditt (${REGLER.navnMin}–${REGLER.navnMaks} tegn).`);
            ugyldige.push("navn");
        }
        if (verdier.adresse.length > REGLER.adresseMaks) {
            meldinger.push(`Adressen kan være maks ${REGLER.adresseMaks} tegn.`);
            ugyldige.push("adresse");
        }
        if (!REGLER.telefon.test(verdier.telefon.replace(/[\s-]/g, ""))) {
            meldinger.push("Skriv inn et gyldig telefonnummer (8–15 sifre).");
            ugyldige.push("telefon");
        }
        const antall = Number(verdier.antall);
        if (verdier.antall === "" || !Number.isInteger(antall) || antall < REGLER.antallMin || antall > REGLER.antallMaks) {
            meldinger.push(`Antall personer må være mellom ${REGLER.antallMin} og ${REGLER.antallMaks}.`);
            ugyldige.push("antall");
        }
        return { meldinger, ugyldige };
    }

    // Fjern rød markering så snart brukeren retter feltet
    Object.values(felt).forEach((input) => {
        input.addEventListener("input", () => {
            input.classList.remove("ugyldig");
            input.removeAttribute("aria-invalid");
        });
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (knapp.disabled) return; // hindrer dobbel innsending

        skjulMeldinger();
        nullstillFeltfeil();

        const verdier = {
            navn: felt.navn.value.trim(),
            adresse: felt.adresse.value.trim(),
            telefon: felt.telefon.value.trim(),
            antall: felt.antall.value.trim(),
        };

        const { meldinger, ugyldige } = validerSkjema(verdier);
        if (meldinger.length > 0) {
            visFeil(meldinger, ugyldige);
            return;
        }

        knapp.disabled = true;
        knapp.textContent = "Reserverer...";

        try {
            const svar = await apiKall("/reservasjon", {
                method: "POST",
                body: {
                    navn: verdier.navn,
                    adr: verdier.adresse,
                    tlf: verdier.telefon,
                    bordforhvorMange: verdier.antall,
                },
            });

            if (!svar.reservasjon || !svar.reservasjon.bestillingsNr) {
                throw new Error("Svaret fra serveren manglet reservasjonsdata.");
            }

            visSuksess(svar.reservasjon);
            form.reset();
            felt.antall.value = "2";
        } catch (err) {
            visFeil(feilmeldingFra(err));
        } finally {
            knapp.disabled = false;
            knapp.textContent = "Bekreft Reservasjon";
        }
    });
})();
