import API_KEYS from './api.json' assert { type: 'json' };

//if (API_KEYS['open-api-key'] == '🤫') alert('Please put your open api key inside ./api.json and restart..');
if (API_KEYS['mongo-key'] == '🤫') alert('Please put your MongoDB api key inside ./api.json and restart..');
if (API_KEYS['cc-key'] == '🤫') alert('Please put your Confluent Cloud Basic auth api key inside ./api.json and restart..');

/*
 Quick Credits where Credits are due:
 This demo was written priarily by (Me) Britton LaRoche Staff Solutions Engineer at Confluent.
 I learned a ton from Orgoro at D-ID using his example live streaming demo
 https://github.com/de-id/live-streaming-demo
 But I learned the most about OPEN AI and Chat GPT by studying this blog and code
 https://www.codeproject.com/Articles/5350454/Chat-GPT-in-JavaScript
 Written by Igor Krupitsky and licnesed under The Code Project Open License (CPOL)
 All we need to do is leave this comment in the code here giving Igor Krupitsky credit and its all good
*/

var OPENAI_API_KEY = "";
var conversationHistory = new Array();
var bTextToSpeechSupported = false;
var bSpeechInProgress = false;
var oSpeechRecognizer = null
var oSpeechSynthesisUtterance = null;
var lastResponse = {};
var oVoices = null;
const modal = document.getElementById('product-modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalPrice = document.getElementById('modal-price');
const settingsModal = document.getElementById('settings-modal');
const SetDidApiKey = document.getElementById('set-did-api-key');
const SetOpenApiKey = document.getElementById('set-open-api-key');
var userProfileCache = "";

const loadUserProfileButton = document.getElementById('load-profile-button');
loadUserProfileButton.onclick = async () => {
    // To go around the body onload event not being in a module
    // this button is clicked by init function in body onload event of index.html
    // It can also be called by clicking the "load User data" button
    // so we clear the conversation history and start over.
    txtOutput.value = "";
    conversationHistory = new Array();
    conversationHistory.push({"role":"system","content":"You are a digital assistant and your name is Jayne Kafcongo."});
    if ("webkitSpeechRecognition" in window) {
    } else {
        //speech to text not supported
        lblSpeak.style.display = "none";
    }
    var txt = "";
    var response = "";
    var userEmail = JSON.stringify(document.getElementById("user-email").value);
    var myString = "{\"dataSource\": \"Kafcongo-Demo\",\"database\": \"Sales\",\"collection\": \"UserProfile\",\"filter\": {\"email\":  " + userEmail +"}}";
    console.log(myString);
    var inputDoc = JSON.parse(myString);
    var myBody = JSON.stringify(inputDoc);
    //Check to see if we have an input document or not
    response = await fetch("http://localhost:3000/v1/action/findOne", {
      method: 'POST',
      body: myBody, // string or object
      headers:  { 
                "Content-Type":"application/json",
                "api-key": `${API_KEYS['mongo-key']}`
          }
    });
    console.log(response);
    const myJson = await response.json(); //extract JSON from the http response
    console.log(myJson);
    var userProfile = JSON.stringify(myJson, undefined, 2);
    userProfileCache = userProfile;
    conversationHistory.push({"role":"system","content":"The user you are talking to has the following profile data in json document format " + JSON.stringify(myJson, undefined, 2)});
    updateDocumentSettings();
};

const sendTopicButton = document.getElementById('send-topic-button');
sendTopicButton.onclick = async () => {
  await sendToTopic();
};

const sendToTopic = async () => {
    var txt = "";
    var response = "";
    var inputDoc = JSON.parse(document.getElementById("input_json").value);
    var myBody = JSON.stringify(inputDoc);

    //Check to see if we have an input document or not
    console.log(myBody);
    response = await fetch("http://localhost:3000/records", {
      method: 'POST',
      body: myBody, // string or object
      headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${API_KEYS['cc-key']}` 
        }
    });
    console.log(response.toString());
    const myJson = await response.json(); //extract JSON from the http response
    console.log(myJson);
    document.getElementById("results").innerHTML = JSON.stringify(myJson, undefined, 2);
  };

function ChangeLang(o) {
    if (oSpeechRecognizer) {
        oSpeechRecognizer.lang = selLang.value;
        //SpeechToText()
    }
}

const sendOpenAIButton = document.getElementById('send-openai-button');
sendOpenAIButton.onclick = async () => {
  var vector  = document.getElementById('chkVector').checked;
  if (vector){
        await sendToMicroserviceQna();
    } else {
        await SendToOpenAI();
  }
};

const sendToMicroserviceQna = async () => {
    //Lets do a Vector Search on MongoDB Atlas through the
    //QnA microservice
    var txt = "";
    var response = "";
    var sQuestion = txtMsg.value;
    
    /*
    if (sQuestion == "") {
        alert("Type in your question!");
        txtMsg.focus();
        return;
    }
    */

    txtOutput.value += "user: " + sQuestion +"\n";
    txtOutput.scrollTop = txtOutput.scrollHeight;
    console.log("sendToMicroserviceQna");

    //Send the single question, the microservice handles context
    var userEmail = JSON.stringify(document.getElementById("user-email").value);
    //{"user": "a@mdb.com","question": "I am going on a date. I am looking for some suggestion or tips on dressing"}
    var myString = "{\"user\":" + userEmail + ",\"question\": \"" + sQuestion + "\"}";
    //console.log(myString);
    var inputDoc = JSON.parse(myString);
    var myBody = JSON.stringify(inputDoc);

    console.log(myBody);
    //show the thinking video
    document.getElementById("thinking-button").click();
    response = await fetch("http://localhost:3000/qna", {
      method: 'POST',
      body: myBody, // string or object
      headers: {
          "Content-Type": "application/json" 
        }
    });
    //console.log(response.toString());
    const myJson = await response.json(); //extract JSON from the http response
    //show idle animation
    document.getElementById("silence-button").click();
    console.log(myJson);
    var responseText = myJson.response;
    txtOutput.value += "assistant: " + responseText +"\n";
    txtOutput.scrollTop = txtOutput.scrollHeight;
    console.log(responseText);
    var recommendations = myJson.recommendations;
    showProducts(recommendations);
    document.getElementById("results").innerHTML = JSON.stringify(myJson, undefined, 2);
};

//Handle user settings
const openSettingsButton = document.getElementById('open-settings-button');
openSettingsButton.onclick = async () => {
    updateDocumentSettings();
    settingsModal.style.display = 'block';
};
const closeSettingsButton = document.getElementById('close-settings-button');
closeSettingsButton.onclick = async () => {
    settingsModal.style.display = 'none';
};
const saveSettingsButton = document.getElementById('save-settings-button');
saveSettingsButton.onclick = async () => {
    settingsModal.style.display = 'none';
    var didApiKey = document.getElementById("set-did-api-key").value;
    var openApiKey = document.getElementById("set-open-api-key").value;
    var userEmail = JSON.stringify(document.getElementById("set-email-address").value);

    setCookie('did-api-key', didApiKey, 36500);
    setCookie('open-api-key', openApiKey, 36500);
    var noQuotesEmail = userEmail.replace(/"|'/g, '');
    setCookie('user-email', noQuotesEmail, 36500);
    //upsert all the user data into the UserProfile collection
    var response = "";
    var setFirstName = JSON.stringify(document.getElementById("set-first-name").value);
    var setLastName = JSON.stringify(document.getElementById("set-last-name").value);
    var setSex = JSON.stringify(document.getElementById("set-sex").value);
    var setShirtSize = JSON.stringify(document.getElementById("set-shirt-size").value);
    var setWaistSize= JSON.stringify(document.getElementById("set-waist-size").value);
    var setInseamSize = JSON.stringify(document.getElementById("set-inseam-size").value);
    var setDressSize = JSON.stringify(document.getElementById("set-dress-size").value);
    var setShoeSize = JSON.stringify(document.getElementById("set-shoe-size").value);
    var setAddress = JSON.stringify(document.getElementById("set-address").value);
    var myString = "{\"dataSource\": \"Kafcongo-Demo\",\"database\": \"Sales\",\"collection\": \"UserProfile\",\"filter\": {\"email\":  " + userEmail +"},"+
        "\"update\": { " +
        "   \"$set\": {\"first_name\":" + setFirstName + ", " +
                "\"last_name\":" + setLastName + ", " +
                "\"email\":" + userEmail + ", " +
                "\"shirt_size\":" + setShirtSize + ", " +
                "\"waist_size\":" + setWaistSize + ", " +
                "\"inseam_size\":" + setInseamSize + ", " +
                "\"dress_size\":" + setDressSize + ", " +
                "\"shoe_size\":" + setShoeSize + ", " +
                "\"address\":" + setAddress + ", " +
                "\"sex\":" + setSex + " " +
            "}" +
        "}," +
        "\"upsert\":true" +
        "}";
    console.log(myString);
    var inputDoc = JSON.parse(myString);
    var myBody = JSON.stringify(inputDoc);
    //Check to see if we have an input document or not
    response = await fetch("http://localhost:3000/v1/action/updateOne", {
      method: 'POST',
      body: myBody, // string or object
      headers:  { 
                "Content-Type":"application/json",
                "api-key": `${API_KEYS['mongo-key']}`
          }
    });
    console.log(response);
    const myJson = await response.json(); //extract JSON from the http response
    console.log(myJson);
    conversationHistory.push({"role":"system","content":"The user you are talking to has the following profile data in json format " + JSON.stringify(myBody, undefined, 2)});
    var userEmailDoc = document.getElementById("user-email");
    userEmail = userEmail.replace(/"|'/g, '');
    userEmailDoc.value = userEmail;
};
function updateDocumentSettings(){
    //console.log("updateDocumentSettings with user data");
    var myProfile = JSON.parse(userProfileCache);
    //console.log(myProfile);
    document.getElementById("set-email-address").value = myProfile.document.email;
    document.getElementById("set-first-name").value = myProfile.document.first_name;
    document.getElementById("set-last-name").value = myProfile.document.last_name;
    document.getElementById("set-sex").value = myProfile.document.sex;
    document.getElementById("set-shirt-size").value = myProfile.document.shirt_size;
    document.getElementById("set-waist-size").value = myProfile.document.waist_size;
    document.getElementById("set-inseam-size").value = myProfile.document.inseam_size;
    document.getElementById("set-dress-size").value = myProfile.document.dress_size;
    document.getElementById("set-shoe-size").value = myProfile.document.shoe_size;
    document.getElementById("set-address").value = myProfile.document.address;
    document.getElementById("set-did-api-key").value = getCookie("did-api-key");
    document.getElementById("set-open-api-key").value = getCookie("open-api-key");
    document.getElementById("user-email").value = getCookie("user-email");

    OPENAI_API_KEY = document.getElementById("set-open-api-key").value;
};
function cleanJSON(fieldValue){
    var pretty = JSON.stringify(fieldValue);
    pretty = pretty.replace(/"|'/g, '');
}

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
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

function checkCookie() {
    let user = getCookie("username");
    if (user != "") {
        alert("Welcome again " + user);
    } else {
        user = prompt("Please enter your name:", "");
        if (user != "" && user != null) {
        setCookie("username", user, 365);
        }
    }
}


// Get the products container element
const productsContainer = document.getElementById('products-container');
// Function to handle click events on product cards
function handleProductClick(data) {
    //alert(`You clicked on Product ${productData}`);
    //send the user click data to a confluent cloud topic
    //follow the format:
    //{"value": {"type": "JSON", "data": "{'EMAIL_ADDRESS' : 'bob@sample.com', 'PRODUCT_ID' : '98', 'PRODUCT_DESC' : 'Mens Jacket (Black)'}"}}
    var productData = JSON.parse(data);
    var sendTextField = document.getElementById("input_json");
    var userEmail = JSON.stringify(document.getElementById("user-email").value);
    console.log(userEmail);
    userEmail = userEmail.replace(/"|'/g, '');
    console.log(userEmail);
    var sendJson = "{\"value\": {\"type\": \"JSON\", \"data\": \"{'EMAIL_ADDRESS' :'" + userEmail + 
        "', 'PRODUCT_ID':"+ productData.id + 
        ", 'TITLE':'" + productData.title + 
        "', 'PRODUCT_PRICE':" + productData.price + " }\"}}";
    sendTextField.value = sendJson;

    modalImage.src = productData.link;
    modalImage.width = 253*2;
    modalImage.height = 338*2;
    modalTitle.textContent = productData.title;
    modalPrice.textContent = productData.price;
    modal.style.display = 'block';

    sendToTopic(sendJson);
}

const mSave = document.getElementById('mSave');
mSave.onclick = function() {
    //alert('Product added to cart!');
    modal.style.display = 'none';
}
const mCart = document.getElementById('mCart');
mCart.onclick = function() {
    //alert('Product added to cart!');
    modal.style.display = 'none';
}
const mClose = document.getElementById('mClose');
mClose.onclick = function() {
    //alert('Product added to cart!');
    modal.style.display = 'none';
}
function showProducts(inRecommend){
    console.log("inside showProducts");
    const productsContainer = document.getElementById('products-container');
        productsContainer.innerHTML = "";
        let i = 0;
        let arrayLength = inRecommend.length;

        //Only diplay up to 25 products
        if (arrayLength > 25) {
            arrayLength = 25;
        }

        console.log(inRecommend);
        console.log(arrayLength);
        
        // Generate product cards
        while(i < arrayLength) {
          generateProductCard(JSON.stringify(inRecommend[i]));
          i++;
        } 
}

function generateProductCard(data){
    //the data passed in is a string
    //we can also use a json document
    var productData = JSON.parse(data);
    // Create product card element
    const productCard = document.createElement('div');
    productCard.className = 'product-card';

    // Create image element
    const img = document.createElement('img');
    img.src = productData.link;
    img.width = 253;
    img.height = 338;
    img.alt = `Product ${productData.title}`;

    // Create title element
    const title = document.createElement('h3');
    title.textContent = productData.title;
    title.setAttribute("id", "title");

    // Create price element
    const price = document.createElement('p');
    price.textContent = productData.price;
    price.setAttribute("id", "price");

    // Add click event listener to the product card
    productCard.addEventListener('click', () => handleProductClick(data));

    // Append elements to product card
    productCard.appendChild(img);
    productCard.appendChild(title);
    productCard.appendChild(price);

    // Append product card to products container
    productsContainer.appendChild(productCard);
}

function SendToOpenAI() {

   
    var sQuestion = txtMsg.value;
    /*
    if (sQuestion == "") {
        alert("Type in your question!");
        txtMsg.focus();
        return;
    }
    */
 
    if (OPENAI_API_KEY == ""){
        alert('Please put your open api key inside the settings window.  Press the Open Settings button to enter the information');
        return;
    }
    spMsg.innerHTML = "Chat GPT is thinking...";
   

    //lets keep context
    conversationHistory.push({
        "role": "user", //system,user,assistant
        "content": sQuestion
    });
    var sUrl = "https://api.openai.com/v1/completions";
    var sModel = selModel.value;// "text-davinci-003";
    if (sModel.indexOf("gpt-") != -1 ) {
        //https://openai.com/research/gpt-4
        sUrl = "https://api.openai.com/v1/chat/completions";
    } 
    var oHttp = new XMLHttpRequest();
    console.log(sUrl);
    oHttp.open("POST", sUrl);
    oHttp.setRequestHeader("Accept", "application/json");
    oHttp.setRequestHeader("Content-Type", "application/json");
    oHttp.setRequestHeader("Authorization", "Bearer " + OPENAI_API_KEY)

    oHttp.onreadystatechange = function () {
        if (oHttp.readyState === 4) {
            //console.log(oHttp.status);

            spMsg.innerHTML = "";

            var oJson = {}
            if (txtOutput.value != "") txtOutput.value += "\n";

            try {
                oJson = JSON.parse(oHttp.responseText);
            } catch (ex) {
                txtOutput.value += "Error: " + ex.message
            }

            if (oJson.error && oJson.error.message) {
                txtOutput.value += "Error: " + oJson.error.message;

            } else if (oJson.choices) {
                var s = "";

                if (oJson.choices[0].text) {
                    s = oJson.choices[0].text;

                } else if (oJson.choices[0].message) {
                    //GPT-4
                    s = oJson.choices[0].message.content;
                }

                if (selLang.value != "en-US") {
                    var a = s.split("?\n");
                    if (a.length == 2) {
                        s = a[1];
                    }
                }

                if (s == "") {
                    s = "No response";
                } else {
                    var shortRepsonse = s.substring(0,300);
                    if (s.length >= 300) {
                        shortRepsonse = shortRepsonse + " ... My Voice response is limited by time. Read the text for my full response";
                    }
                    txtResponse.value = shortRepsonse;
                    txtOutput.value += "assistant: " + s +"\n";
                    txtOutput.scrollTop = txtOutput.scrollHeight;
                    lastResponse = {"role":"assistant", "content" : s};
                    conversationHistory.push(lastResponse);
                    //show idle animation
                    document.getElementById("silence-button").click();
                    document.getElementById("talk-button").click();
                }
            }
        }
    };

    var iMaxTokens = 2048;
    var sUserId = "1";
    var dTemperature = 0.5;

    var data = {
        model: sModel,
        prompt: sQuestion,
        max_tokens: iMaxTokens,
        user: sUserId,
        temperature: dTemperature,
        frequency_penalty: 0.0, //Number between -2.0 and 2.0  
                                //Positive value decrease the model's likelihood 
                                //to repeat the same line verbatim.
        presence_penalty: 0.0,  //Number between -2.0 and 2.0. 
                                //Positive values increase the model's likelihood 
                                //to talk about new topics.
        stop: ["#", ";"]        //Up to 4 sequences where the API will stop generating 
                                //further tokens. The returned text will not contain 
                                //the stop sequence.
    }

    //chat GPT-4 gpt-4
    if (sModel.indexOf("gpt-") != -1) {
        //conversationHistoryCopy = JSON.parse(JSON.stringify(conversationHistory));
        data = {
            "model": sModel,
            "messages": conversationHistory
        }
        //console.log(data);
    }
    //show thinking animation
    document.getElementById("thinking-button").click();
    oHttp.send(JSON.stringify(data));

    if (txtOutput.value != "") txtOutput.value += "\n";
    txtOutput.value += "user: " + sQuestion;
    txtOutput.scrollTop = txtOutput.scrollHeight;
    txtMsg.value = "";
}

/*
const speechToText = document.getElementById('chkSpeakToText');
speechToText.onclick = async () => {
if (oSpeechRecognizer) {

        if (speechToText.checked) {
            oSpeechRecognizer.start();
        } else {
            oSpeechRecognizer.stop();
            return;
        }

        return;
    }   
*/
const talkOpenAI = document.getElementById('talk-openai-button');
talkOpenAI.onmousedown = async () => {
    oSpeechRecognizer = new webkitSpeechRecognition();
    oSpeechRecognizer.continuous = true;
    oSpeechRecognizer.interimResults = true;
    oSpeechRecognizer.lang = selLang.value;
    oSpeechRecognizer.start();

    oSpeechRecognizer.onresult = function (event) {
        var interimTranscripts = "";
        for (var i = event.resultIndex; i < event.results.length; i++) {
            var transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                txtMsg.value = txtMsg.value + transcript;
            } else {
                transcript.replace("\n", "<br>");
                interimTranscripts += transcript;
            }

            var oDiv = document.getElementById("idText");
            oDiv.innerHTML = '<span style="color: #999;">' + 
                               interimTranscripts + '</span>';
        }
    };

    oSpeechRecognizer.onerror = function (event) {
        speechToText.checked = false;
    };
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
talkOpenAI.onmouseup = async () => {
    //Let the text to speech finish
    await sleep(2000);
    if (oSpeechRecognizer) {
        oSpeechRecognizer.stop();
    }
    var sendOpenAIButton = document.getElementById('send-openai-button');
    sendOpenAIButton.click();
}