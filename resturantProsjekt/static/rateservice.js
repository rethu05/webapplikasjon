function submitRating() {
    const ratingElements = document.getElementsByName("rating");
    let rating = 0;
    for (let i = 0; i < ratingElements.length; i++) {
        if (ratingElements[i].checked) {
            rating = ratingElements[i].value;
            break;
        }
    }
    if (rating == 0) {
        alert("Please select a rating!");
    } else {
        alert(`Thank you for rating our services ${rating} stars!`);
    }
}

//skulle lagre ratingen, men fikk ikke tid det.