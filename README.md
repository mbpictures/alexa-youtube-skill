# Alexa youtube skill
With this small skill you can use alexa to find and play videos from youtube (video + audio!).
Feel free to share your improvements with us, maybe someone will find a better way to get the real video URL.

## Limitations
* You need a device with display, FireTV-Stick will not work
* Not all videos are support. There's issue with the extraction of the "real" video url, so some videos can't be played

## Installation
1. Clone the repository with ```git clone https://github.com/mbpictures/alexa-youtube-skill.git alexa-youtube```
2. Enter the new directory ```cd alexa-youtube```
3. Install npm modules ```npm install```
4. Run local server ```npm start```

## Usage
### Code adjustments
Before you can use this skill, local or on a server, you need to adjust some lines of the code.
* server.js
  * Find the line with the variable ```alexa.appId``` and set it to your alexa app id (you can find it in the amazon developer console)
  * Register for a free youtube api key and paste it in the variable ```youtubeApiKey```
### Create an Alexa Skill
I won't dive in skill creation in amazons alexa kit that much, for further information visit the [starter guide](https://developer.amazon.com/de/docs/ask-overviews/build-skills-with-the-alexa-skills-kit.html). But here some stuff to keep in mind:
* Make sure your skill supports displays
* If you want to host your skill local you need a tunnel to the web and establish a connection with node.js. To do so you can use [ngrok](https://ngrok.com) with a fixed port in the ```server.js```. Once ngrok is started, just paste the url provided by ngrok in the "link url" field of your skill. A free alternative to host your skill on a server is [heroku](https://heroku.com). Push your skill to the heroku server and just paste the heroku url in the "link url" field of your skill.
* Create all necessary intents for the youtube skill (below)
#### Intents
* SearchYoutube
  * YoutubeQuery: Amazon.SearchQuery
  * VideoNumber: Amazon.NUMBER
* SetResultAmountIntent
  * AmountResults: Amazon.NUMBER
  
As json code:
```
{
    "interactionModel": {
        "languageModel": {
            "invocationName": "youtube videos",
            "intents": [             
                {
                    "name": "SearchYoutube",
                    "slots": [
                        {
                            "name": "YoutubeQuery",
                            "type": "AMAZON.SearchQuery"
                        },
                        {
                            "name": "VideoNumber",
                            "type": "AMAZON.NUMBER"
                        }
                    ],
                    "samples": [
                        "video {VideoNumber}",
                        "start video {VideoNumber}",
                        "und search for {YoutubeQuery}",
                        "find videos {YoutubeQuery}",
                        "search for {YoutubeQuery}",
                        "search {YoutubeQuery}"
                    ]
                },
                {
                    "name": "AMAZON.NextIntent",
                    "samples": [
                        "Next",
                        "Next video"
                    ]
                },
                {
                    "name": "AMAZON.PreviousIntent",
                    "samples": [
                        "Back",
                        "Previous video"
                    ]
                },
                {
                    "name": "SetResultAmountIntent",
                    "slots": [
                        {
                            "name": "AmountResults",
                            "type": "AMAZON.NUMBER"
                        }
                    ],
                    "samples": [
                        "Amount of results {AmountResults}",
                        "Show me {AmountResults} results",
                        "I want to see {AmountResults} results"
                    ]
                }
            ],
            "types": []
        }
    }
}
```
## Speaking to Alexa
* To activate the skill, just say ```Alexa, start youtube videos```.
* To search for videos ```alexa, search for QUERY```
* To play a video ```alexa, start video 2```
