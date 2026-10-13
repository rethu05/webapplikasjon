//Koden over fant vi ikke frem til, vi klarte ikke å vise noe permanent data på applikasjonen uheldigvis.
const resultatBestillingEl = document.getElementById("resultatBestillingEl");
const bestillingsNr = document.getElementById("hentBestillingEl");
const knapp = document.getElementById("hentKnappEl");

knapp.addEventListener("click", async (e) => {
  try {
    const { data } = await axios.get(`/reservasjon/${bestillingsNr.value}`);
    console.log("her fetcher vi den: " + bestillingsNr.value);
    var resultat = document.getElementById("resultatBestillingEl");
    resultat.innerHTML = "Navn " + data.navn + "\n Bordnummer " + data.bordnummer;
  } catch (error) {
    if (error.response.status === 404) {
      console.log("kom den hit da?")
      var resultat = document.getElementById("resultatBestillingEl");
      resultat.innerHTML = error.response.data;
    } else {
      console.log(error);
    }
  }
});
