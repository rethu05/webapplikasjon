(function () {
    "use strict";

    /* ---------------- Popup med informasjon om KULTI ---------------- */
    const infoKnapp = document.getElementById("knapp");
    const popup = document.getElementById("popup");
    const lukkPopup = document.getElementById("lukkPopup");

    function settPopupSynlig(synlig) {
        if (!popup) return;
        popup.style.display = synlig ? "block" : "none";
        if (infoKnapp) infoKnapp.setAttribute("aria-expanded", String(synlig));
        if (synlig && lukkPopup) lukkPopup.focus();
    }

    if (popup) settPopupSynlig(false);

    if (infoKnapp) {
        infoKnapp.addEventListener("click", () => settPopupSynlig(popup.style.display !== "block"));
    }
    if (lukkPopup) {
        lukkPopup.addEventListener("click", () => {
            settPopupSynlig(false);
            if (infoKnapp) infoKnapp.focus();
        });
    }

    // Lukk popup med Escape eller ved klikk utenfor
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && popup && popup.style.display === "block") settPopupSynlig(false);
    });
    document.addEventListener("click", (e) => {
        if (!popup || popup.style.display !== "block") return;
        if (!popup.contains(e.target) && !(infoKnapp && infoKnapp.contains(e.target))) {
            settPopupSynlig(false);
        }
    });

    /* ---------------- Cookies ---------------- */
    function setCookie(navn, verdi, dager) {
        try {
            const utløper = new Date(Date.now() + dager * 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = `${navn}=${encodeURIComponent(verdi)};expires=${utløper};path=/;SameSite=Lax`;
        } catch (err) {
            // Kan skje hvis nettleseren blokkerer cookies helt
            console.warn("Kunne ikke lagre cookie:", err);
        }
    }

    function getCookie(navn) {
        try {
            const prefiks = navn + "=";
            for (const del of document.cookie.split(";")) {
                const c = del.trim();
                if (c.startsWith(prefiks)) {
                    // decodeURIComponent kaster URIError ved ødelagt verdi – derfor try/catch
                    return decodeURIComponent(c.substring(prefiks.length));
                }
            }
        } catch (err) {
            console.warn("Kunne ikke lese cookie:", err);
        }
        return "";
    }

    const cookiesjekkEl = document.getElementById("cookiesjekk");
    const samtykke = getCookie("cookiesjekk");

    if (cookiesjekkEl) {
        cookiesjekkEl.style.display = samtykke === "OK" || samtykke === "AVSLATT" ? "none" : "block";

        const skjulBanner = () => {
            cookiesjekkEl.style.display = "none";
        };

        const jaKnapp = document.getElementById("jaKnapp");
        if (jaKnapp) {
            jaKnapp.addEventListener("click", () => {
                setCookie("cookiesjekk", "OK", 30);
                skjulBanner();
            });
        }

        const neiKnapp = document.getElementById("neiKnapp");
        if (neiKnapp) {
            neiKnapp.addEventListener("click", () => {
                setCookie("cookiesjekk", "AVSLATT", 7);
                skjulBanner();
            });
        }
    }
})();