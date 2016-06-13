var login = require("facebook-chat-api");
var fs = require("fs");
var secret = JSON.parse(fs.readFileSync(__dirname + "/secret.json"));
var wolfram = require("wolfram");
var wolframClient = wolfram.createClient(secret.wolfKey);
var firebase = require("firebase");


var userDB = {};
var sendDB = [];
var lastLine = null
var lastSubject;
var keyArray;
var printed = false;


firebase.initializeApp({
  databaseURL: "https://project-6564761374345501298.firebaseio.com",
  serviceAccount: "serviceAccountCredentials.json"
});


//recieving stuff from firebase
var commentsRef = firebase.database().ref('subjects');
commentsRef.on('value', function(snapshot){
       keyArray = Object.keys(snapshot.val());
       keyArray.forEach(function (usertext){
            var subjectRef = firebase.database().ref('subjects/'+usertext);
            subjectRef.on('value', function(user){
                var nameArray = Object.keys(user.val());
                printed = false;
                nameArray.forEach(function (randText){
                    var nameRef = firebase.database().ref('subjects/' + usertext + '/' + randText);
                    nameRef.on('value', function(random){
                        if(!printed){
                            var item = random.val()[Object.keys(random.val()).sort().pop()];
                            if(item.sender != "user"){
                                item.sender = "user";
                                sendDB.push(item);
                                printed = true;
                            }
                        }
                    });
                });
            });
       });
});


login({email: secret.email, password: secret.password }, function callback (err, api) {

    if(err) return console.error(err);

    

    api.listen(function callback(err, message) {
        
        //fetching stuff from db
        setInterval(function(){
            sendDB.forEach(function (data){
                    if( data.senderId != "user" && data.picture != lastLine  && (data.text == null || data.text == "")){
                        api.sendMessage(data.picture, message.threadID);
                        lastLine = data.picture;
                    }
                    else if( data.senderId != "user" && data.text != lastLine && (data.picture == null || data.picture == "")){
                        api.sendMessage(data.text, message.threadID);
                        lastLine = data.text;
                    }
            });
            sendDB = [];
        },1000)        
       
        //starter message
       if(message.body!=null&&message.body.indexOf("help") != -1 || !(message.threadID in userDB)) {            
            userDB[message.threadID] = { //creating or resetting user
                currentAction : '',
                subject : '',
                question : '',
                questionAsked : true,
            }
         if(message.body!=null&&message.body.indexOf("help") != -1 ) {
                api.sendMessage("What subject?", message.threadID);
                userDB[message.threadID].currentAction = 'getSubject'    
            }
            
        
        } else if(userDB[message.threadID].currentAction === 'getSubject') { //finding out subject
            var notCalled = true;
            keyArray.forEach(function(subject){
                if(message.body.toLowerCase().indexOf(subject) != -1) {
                    notCalled = false;
                    userDB[message.threadID].subject = message.body.toLowerCase();
                    userDB[message.threadID].currentAction = '';
                    var grats = "Send a picture of your question or type it out, and help will be on its way!";
                        api.sendMessage(grats,message.threadID)
                        lastSubject = grats
                    
                } 
            });
            if(notCalled){
                     var sorry = "Sorry, but the subject you need help on is not currently available.";

                        api.sendMessage(sorry,message.threadID)
                        lastSubject = sorry

                    userDB[message.threadID].currentAction = '';
                }
            
           //handling picture questions 
        } else if(message.attachments.length > 0 && userDB[message.threadID].subject !== '' && userDB[message.threadID].questionAsked == true && (message.attachments[0].type == "photo" || message.attachments[0].type == "animated_image")){ //handles picture messages
            var url = message.attachments[0].hiresUrl;
            userDB[message.threadID].question = url;
                firebase.database().ref('/subjects/'+userDB[message.threadID].subject+'/'+message.threadID).push(
                    {
                        "picture" : url,
                        "text" : "",
                        "senderId" : "user"
                    });
                api.sendMessage("Your picture has been sent to a tutor! You will be messaged very soon with an explanation!",message.threadID);
                userDB[message.threadID].questionAsked = false;
        }else if(message.body.indexOf("explanation") != -1 && userDB[message.threadID].question !== ''){ //redirects poor answers back to db
            if(userDB[message.threadID].question != null && userDB[message.threadID].question.indexOf("http") != 1) {
                console.log(userDB[message.threadID].question);
                firebase.database().ref('/subjects/'+userDB[message.threadID].subject+'/'+message.threadID).push({
                    "picture" : "",
                    "text" :  userDB[message.threadID].question,
                    "senderId" : "user"
                })
            } else {
                userDB[message.threadID].question = message.body;
                    firebase.database().ref('/subjects/'+userDB[message.threadID].subject+'/'+message.threadID).push({
                        "picture" : "",
                        "text" : userDB[message.threadID].question,
                        "senderId" : "user"
                    })

                }   
                api.sendMessage("We have redirected your question to another tutor, and will get back to you as soon as possible", message.threadID);         
        } else if(userDB[message.threadID].subject !== '' && userDB[message.threadID].questionAsked == true) { //text based questions
            userDB[message.threadID].question = message.body;
            wolframClient.query(message.body, function(err,result) { //puts message through wolfram
                if(err) throw err;
                var ans;                
                try{
                    ans = result[1].subpods[0].value;
                    if(ans !== "" && ans !== null) //if wolfram cannot give an answer
                        api.sendMessage(result[1].subpods[0].value,message.threadID);
                    else {
                            api.sendMessage("We are handing off your question to a tutor. Standby please.",message.threadID);
                            firebase.database().ref('/subjects/'+userDB[message.threadID].subject+'/'+message.threadID).push(
                                {
                                    "picture" : "",
                                    "text" : message.body,
                                    "senderId" : "user"
                                });
                    }

                    userDB[message.threadID].questionAsked = false;
                } catch (e) { //handling problem with query
                    api.sendMessage("We are handing off your question to a tutor. Standby please.",message.threadID);
                    firebase.database().ref('/subjects/'+userDB[message.threadID].subject+'/'+message.threadID).push(
                        {
                            "picture" : "",
                            "text" : message.body,
                            "senderId" : "user"
                        }); 

                    userDB[message.threadID].questionAsked = false;
                }
            });
        } else if (message.body == "clear") {
            api.sendMessage("refresh page to clear the chat",message.threadID, function messageSent(err,messageInfo) {
                api.deleteThread(message.threadID);
            });
            
        }
        
    });

});


