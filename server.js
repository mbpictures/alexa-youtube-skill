var fs = require('fs');
var request = require('request');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

var search = require('youtube-search');
var youtubeInfo = require('./youtube-stream-url');
// Initialize the Alexa SDK
var Alexa = require('alexa-sdk');

const makePlainText = Alexa.utils.TextUtils.makePlainText;
const makeImage = Alexa.utils.ImageUtils.makeImage;

app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.json());
//app.use(express.static('public'));


/** CONFIG HERE **/
var youtubeSdkKey = '';
var alexaAppId = ''; //starting with 'amzn1.ask.skill'




app.post('/', function(req, res) {
    // Build the context manually, because Amazon Lambda is missing
    var context = {
        succeed: function (result) {
            console.log(result);
            res.json(result);
        },
        fail:function (error) {
            console.log(error);
        }
    };
    // Delegate the request to the Alexa SDK and the declared intent-handlers
	var alexa = Alexa.handler(req.body, context);
	alexa.appId = alexaAppId;
	alexa.registerHandlers(handlers);
	alexa.execute();
});

async function getSpecificURL(result){
    // Do async job
	let json;
    await youtubeInfo.getInfo({url: result.link}).then(video => {
		json = {title: result.title, description: result.description, channel: result.channelTitle, video: video.formats[0].url, thumbnail: video.thumbnail_url};
	}).catch((error) => {
		console.log(error);
	});
	return json;
}

async function getResultList(results){
	var resultArray = [];
	for(var i = 0; i < results.length; i++){
		if(results[i].kind == "youtube#video"){ //only show videos
			var specificStuff = await getSpecificURL(results[i]);
			resultArray.push(specificStuff);
		}
	}
	return resultArray;
}

async function buildSearch(query, amountResults){
	return new Promise(function(resolve, reject){
		searchQuery = query.replace(" ", "|");
		
		var opts = {
		  maxResults: amountResults,
		  key: youtubeSdkKey
		};
		
		search(searchQuery, opts, function(err, results) {
			if(err){
				this.emit(':tell', "Sorry, there occured an error with your request.");
				console.log(err);
				reject(); 
			}
			var resultArray = getResultList(results);
			resultArray.then(function(resultList){
				const listItemBuilder = new Alexa.templateBuilders.ListItemBuilder();
				const listTemplateBuilder = new Alexa.templateBuilders.ListTemplate1Builder();
							
				for(var i = 0; i < resultList.length; i++){
					const itemImage = makeImage(resultList[i].thumbnail, 120, 90);
					listItemBuilder.addItem(itemImage, 'youtubeItem'+(i+1), makePlainText(resultList[i].title));
				}
							
				const listItems = listItemBuilder.build();
				listTemplate = listTemplateBuilder.setToken('youtubeToken')
												  .setTitle('Results: ' + query)
												  .setListItems(listItems)
												  .build();
				resolve({template: listTemplate, listJSON: resultList});
			});
		});
	});
}

// Declare handlers for processing the incoming intents
var handlers = {
    'SearchYoutube': function () {
        const intentObj = this.event.request.intent;
		if (!intentObj.slots.YoutubeQuery.value && !intentObj.slots.VideoNumber.value) {
			const slotToElicit = 'YoutubeQuery';
            const speechOutput = 'What should I search?';
            const repromptSpeech = speechOutput;
            this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
		}
		else if(intentObj.slots.YoutubeQuery.value && !intentObj.slots.VideoNumber.value){
			//search youtube
			console.log(intentObj.slots.YoutubeQuery.value);
			var amountResults = this.attributes["amountResults"] ? this.attributes["amountResults"] : 5;
			
			let list = async function (response, emit, attributes){
				var listTemplatePromise = buildSearch(intentObj.slots.YoutubeQuery.value, amountResults);
				listTemplatePromise.then(function(result){
					response.speak("I found the following!").renderTemplate(result.template);
					attributes["youtubeResultsJSON"] = JSON.stringify(result.listJSON);
					attributes["currentVideo"] = undefined;
					response.shouldEndSession(false);
					emit(':responseReady');
				}).catch((error) => {
					console.log(error);
					emit(':tell', "An error occured...");
				});
			};
			
			list(this.response, this.emit, this.attributes);
		}
		else{
			console.log("starte video " + intentObj.slots.VideoNumber.value);
			if(this.attributes["youtubeResultsJSON"]){
				youtubeJSON = JSON.parse(this.attributes["youtubeResultsJSON"]);
				specificVideo = youtubeJSON[intentObj.slots.VideoNumber.value - 1];
				if(!specificVideo.video || specificVideo.video == undefined || specificVideo.video == 'undefined'){
					this.response.speak("The URL of the video couldn't be found... please choose again.");
					this.response.shouldEndSession(false);
					this.emit(':responseReady');					
				}
				else{
					this.attributes["currentVideo"] = intentObj.slots.VideoNumber.value;
					const videoSource = specificVideo.video;
					const metadata = {
						'title': specificVideo.title,
						'subtitle': specificVideo.channel
					};
					this.response.playVideo(videoSource, metadata);
					this.response.shouldEndSession(undefined);
					this.emit(':responseReady');
				}
			}
			else{
				this.emit(':tell', "An error occured...");
			}
		}
    },
	'SetResultAmountIntent': function(){
		const intentObj = this.event.request.intent;
		if (!intentObj.slots.AmountResults.value){
			const slotToElicit = 'AmountResults';
            const speechOutput = 'How much results do you want to see?';
            const repromptSpeech = speechOutput;
            this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
		}
		else{
			this.attributes["amountResults"] = intentObj.slots.AmountResults.value;
			
			this.response.speak("You will see " + intentObj.slots.AmountResults.value + " results now!");
			this.response.shouldEndSession(false);
			this.emit(':responseReady');
		}
	},
	'PreviousIntent': function (){
		if(this.attributes["youtubeResultsJSON"] && this.attributes["currentVideo"]){
			if(this.attributes["currentVideo"] == 1){
				this.emit(':tell', "You are already at the beginning!");
			}
			else{
				this.attributes["currentVideo"] = this.attributes["currentVideo"] - 1;
				youtubeJSON = JSON.parse(this.attributes["youtubeResultsJSON"]);
				specificVideo = youtubeJSON[this.attributes["currentVideo"] -1];
				const videoSource = specificVideo.video;
				const metadata = {
					'title': specificVideo.title,
					'subtitle': specificVideo.channel
				};
				this.response.playVideo(videoSource, metadata);
				this.response.shouldEndSession(undefined);
				this.emit(':responseReady');
			}
		}
		else{
			this.emit(':tell', "You have no video selected!");
		}
	},
	'NextIntent': function (){
		if(this.attributes["youtubeResultsJSON"] && this.attributes["currentVideo"]){
			youtubeJSON = JSON.parse(this.attributes["youtubeResultsJSON"]);
			if(this.attributes["currentVideo"] == youtubeJSON.length){
				this.emit(':tell', "You are already at the end!");
			}
			else{
				this.attributes["currentVideo"] = this.attributes["currentVideo"] - 1;
				
				specificVideo = youtubeJSON[this.attributes["currentVideo"] -1];
				const videoSource = specificVideo.video;
				const metadata = {
					'title': specificVideo.title,
					'subtitle': specificVideo.channel
				};
				this.response.playVideo(videoSource, metadata);
				this.response.shouldEndSession(undefined);
				this.emit(':responseReady');
			}
		}
		else{
			this.emit(':tell', "You have no video selected!");
		}
	},
	'LaunchRequest': function () {
        this.emit(':ask', "What can I do for you?");
    },
	'Unhandled': function () {
        this.emit(':ask', "Ohh...");
    },
};
app.listen(app.get('port'), function () {
  console.log('Alexa youtube skill listening on port ' + app.get('port'));
});