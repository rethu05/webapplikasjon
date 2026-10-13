/*
var button = document.getElementById("reservasjonButtonEl")
button.addEventListener("click", myFunction)

function myFunction() {
    window.location.href = "takkforreservasjon.html"
} 
*/

var knapp = document.getElementById("reservasjonButtonEl")
knapp.addEventListener("click", async (e) => {
    console.log("brukeren trykka på knappen")
    var navn = document.getElementById("navnInputEl").value;
    var adr = document.getElementById("adresseInputEl").value;
    var tlf = document.getElementById("telefonInputEl").value;
    var bordforhvorMange = document.getElementById("bordInputEl").value;
    var bordnr = Math.floor(Math.random()*20)+1;
    var bestillingsNr = Math.floor(Math.random() * 100000);
    var dato = new Date();
    try {
        const { data } = await axios.post("/reservasjon",
                                      {navn: navn, 
                                       adr:adr, 
                                       tlf:tlf,
                                    bordforhvorMange:bordforhvorMange,
                                       bestillingsNr: bestillingsNr,
                                      });
        var resultat = document.getElementById("resultatEl")
        resultat.innerHTML = "Din reservasjon har blitt lagt til og bestillingsnummeret er " + bestillingsNr;
    }
    
    catch (error) {
        console.log(error);
        return;
    }
    
});
