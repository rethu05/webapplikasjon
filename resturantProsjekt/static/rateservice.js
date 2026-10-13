(function () {
    "use strict";

    const form = document.getElementById("ratingForm");
    if (!form) return;

    if (!window.KultiApi) {
        console.error("api.js er ikke lastet – kan ikke sende vurdering.");
        return;
    }
    const { apiKall, escapeHtml, feilmeldingFra, REGLER } = window.KultiApi;

    const knapp = document.getElementById("ratingKnappEl");
    const takkBoks = document.getElementById("ratingTakkBoks");
    const takkTekst = document.getElementById("takkTekst");
    const feilBoks = document.getElementById("ratingFeilBoks");
    const kommentarFelt = document.getElementById("tilbakemeldingEl");
    const tegnTeller = document.getElementById("tegnTeller");

    function visFeil(melding) {
        takkBoks.hidden = true;
        feilBoks.textContent = melding;
        feilBoks.hidden = false;
    }

    function oppdaterTeller() {
        tegnTeller.textContent = `${kommentarFelt.value.length} / ${REGLER.kommentarMaks}`;
    }

    kommentarFelt.addEventListener("input", oppdaterTeller);
    form.addEventListener("change", () => {
        feilBoks.hidden = true;
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (knapp.disabled) return;

        feilBoks.hidden = true;
        takkBoks.hidden = true;

        const valgt = form.querySelector('input[name="rating"]:checked');
        if (!valgt) {
            visFeil("Velg mellom 1 og 5 stjerner før du sender inn.");
            return;
        }

        const rating = Number(valgt.value);
        const kommentar = kommentarFelt.value.trim();
        if (kommentar.length > REGLER.kommentarMaks) {
            visFeil(`Kommentaren kan være maks ${REGLER.kommentarMaks} tegn.`);
            return;
        }

        knapp.disabled = true;
        knapp.textContent = "Sender inn...";

        try {
            await apiKall("/api/rating", {
                method: "POST",
                body: { rating, feedback: kommentar },
            });

            takkTekst.innerHTML = `Du ga oss <strong>${escapeHtml(rating)} av 5 stjerner</strong>.<br>` +
                "Vi setter stor pris på at du tok deg tid til å vurdere oss!";
            takkBoks.hidden = false;
            form.reset();
            oppdaterTeller();
        } catch (err) {
            visFeil(`Vurderingen ble ikke sendt. ${feilmeldingFra(err)}`);
        } finally {
            knapp.disabled = false;
            knapp.textContent = "Send Vurdering";
        }
    });
})();