var knapp = document.getElementById("knapp")
knapp.addEventListener("click", knappTrykk)
function knappTrykk(){
  var x = document.getElementById("popup");
  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
    x.style.display = "none";
  }
}
popup.style.display = "none";
//HJELPEFUNKSJONER FRA W3SCHOOLS FOR Å LAGRE OG HENTE COOKIES
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 120 * 120 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

//Sjekk om brukeren har godtatt cookies fra før. Hvis brukeren har gjort det, så trenger du ikke å spørre igjen om dette.
//Hvis cookie finnes
if (getCookie("cookiesjekk") == "OK") {
    //Gjem cookiesjekken
    //Henter cookiesjekk inn i js
    var cookiesjekkEl = document.getElementById("cookiesjekk");
    //Gjem den
    cookiesjekkEl.style.display = "none";
    //Vis alle de der tekstene
}
//Hent ja-knappen    
var jaKnapp = document.getElementById("jaKnapp");
//Event listener på klikk
jaKnapp.addEventListener("click", lagreCookies)
//funksjon som lagrer riktig cookie
function lagreCookies() {
    console.log("Alt er på plass!")
    //Navnet på cookien blir cookiesjekk
    //Verdien på cookien blir "OK"
    setCookie("cookiesjekk", "OK", 14);
    console.log(getCookie("cookiesjekk"))
    //Henter cookiesjekk inn i js
    var cookiesjekkEl = document.getElementById("cookiesjekk");
    //Gjem den
    cookiesjekkEl.style.display = "none";
}
//hent nei-knappen  
//Hent ja-knappen    
var neiKnapp = document.getElementById("neiKnapp");
//Event listener på klikk
neiKnapp.addEventListener("click", håndterNei);

function håndterNei() {
    var cookiesjekkEl = document.getElementById("cookiesjekk");
    //Gjem den
    cookiesjekkEl.style.display = "none";
}