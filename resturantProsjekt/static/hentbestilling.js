(function () {
    "use strict";

    const form = document.getElementById("hentForm");
    if (!form) return;

    if (!window.KultiApi) {
        console.error("api.js er ikke lastet – kan ikke hente bestillinger.");
        return;
    }
    const { apiKall, escapeHtml, feilmeldingFra, REGLER } = window.KultiApi;

    const input = document.getElementById("hentBestillingEl");
    const resultatEl = document.getElementById("resultatBestillingEl");
    const knapp = document.getElementById("hentKnappEl");

    function formaterDato(iso) {
        const dato = new Date(iso);
        if (!iso || Number.isNaN(dato.getTime())) return "–";
        return dato.toLocaleString("no-NO", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function rad(label, verdi) {
        return `
            <div class="detalj-rad">
                <span class="detalj-label">${escapeHtml(label)}</span>
                <span class="detalj-verdi">${escapeHtml(verdi)}</span>
            </div>`;
    }

    function visReservasjon(r) {
        resultatEl.innerHTML = `
            <div class="detalj-kort">
                <div class="detalj-header">
                    <h2>Reservasjon funnet</h2>
                    <span class="badge-bord">Bord #${escapeHtml(r.bordnummer ?? "–")}</span>
                </div>
                ${rad("Bestillingsnummer:", r.bestillingsNr ?? "–")}
                ${rad("Navn:", r.navn || "–")}
                ${rad("Antall gjester:", r.bordforhvormange || "–")}
                ${rad("Telefon:", r.telefon || "–")}
                ${r.adresse ? rad("Adresse:", r.adresse) : ""}
                ${rad("Bestilt:", formaterDato(r.dato))}
            </div>`;
    }

    function visFeil(melding) {
        resultatEl.innerHTML = `<div class="feil-melding" role="alert">${escapeHtml(melding)}</div>`;
    }

    input.addEventListener("input", () => input.classList.remove("ugyldig"));

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (knapp.disabled) return;

        const nr = input.value.trim();
        if (!nr) {
            input.classList.add("ugyldig");
            input.focus();
            visFeil("Skriv inn bestillingsnummeret ditt.");
            return;
        }
        if (!REGLER.bestillingsNr.test(nr)) {
            input.classList.add("ugyldig");
            input.focus();
            visFeil("Bestillingsnummeret kan bare inneholde sifre (0–9).");
            return;
        }

        knapp.disabled = true;
        knapp.textContent = "Søker...";
        resultatEl.innerHTML = "";

        try {
            const reservasjon = await apiKall(`/reservasjon/${encodeURIComponent(nr)}`);
            visReservasjon(reservasjon);
        } catch (err) {
            visFeil(feilmeldingFra(err));
        } finally {
            knapp.disabled = false;
            knapp.textContent = "Hent Bestilling";
        }
    });
})();
