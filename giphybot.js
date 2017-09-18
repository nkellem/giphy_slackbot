const SlackBot = require('slackbots');
const request = require('request');
const express = require('express');
const PORT = process.env.PORT || 3000;
const app = express();
///__________________________________________________________________________________________________
///CREATE THE BOT
///__________________________________________________________________________________________________
const GiphyBot = new SlackBot({
  token: 'SLACK_BOT_TOKEN_HERE',
  name: 'giphybot'
});
///__________________________________________________________________________________________________
///PROPERTIES
///__________________________________________________________________________________________________
GiphyBot.params = {
  as_user: true
};

//variables needed to search GIPHY
GiphyBot.giphy = {
  GIPHY_URL: 'https://api.giphy.com/v1/gifs/search?q=',
  API_KEY: '&api_key=GIPHY_API_TOKEN_HERE',
  RATING: '&rating=pg'
};

//stores the JSON object that was last returned from a query to GIPHY
//also stores which gif is being returned from the object
GiphyBot.giphyObject = {
  data: {},
  i: 0
};

///__________________________________________________________________________________________________
///FREEZING/SEALING PROPERTIES
///__________________________________________________________________________________________________
//freezing properties of the GiphyBot
Object.freeze(GiphyBot.giphy);
Object.freeze(GiphyBot.params);
Object.seal(GiphyBot.giphyObject);
///__________________________________________________________________________________________________
///GIPHYBOT EVENT HANDLERS AND HELPER METHODS
///__________________________________________________________________________________________________
GiphyBot.on('start', () => {
  GiphyBot.postMessageToChannel('random', 'Come to me for all your .gif needs!', GiphyBot.params);
  GiphyBot.postMessageToChannel('random', 'Use the phrase "Give me gif" to search for gifs', GiphyBot.params);
});

GiphyBot.on('message', data => {

  if(GiphyBot.determineIfMentioned(data) && !GiphyBot.isMessageSender(data)){
    //extract the search term
    const searchTerm = data.text.split('giphybot gif me')[1];
    //search giphy
    GiphyBot.searchGiphy(searchTerm, data.channel);
  }

  //see if the user wants to look for the next gif in their search
  if(data.text.toLowerCase().indexOf('giphybot next') > -1 && !GiphyBot.isMessageSender(data)){
    GiphyBot.getNextGif(data.channel);
  }

});

//determines if the call to action has been said
GiphyBot.determineIfMentioned = data => {
  return data.text.toLowerCase().indexOf('giphybot gif me') > -1;
};

//determines if the bot is the one that said its call to action
GiphyBot.isMessageSender = data => {
  return data.bot_id;
};
///__________________________________________________________________________________________________
///METHODS FOR SEARCHING GIPHY
///__________________________________________________________________________________________________

//method that sends out an AJAX call to GIPHY to return a gif result
GiphyBot.searchGiphy = (searchTerm, channel) => {
  //reset the iterator
  GiphyBot.giphyObject.i = 0;
  //get rid of leading or trailing spaces
  searchTerm.trim();
  //check to make sure the user is really searching for something
  if(!searchTerm.length || searchTerm === ''){
    return -1;
  }
  //replace spaces in the search term with %20 to query url
  searchTerm = encodeURI(searchTerm);
  //concatenate the query
  const searchQuery = `${GiphyBot.giphy.GIPHY_URL}${searchTerm}${GiphyBot.giphy.API_KEY}${GiphyBot.giphy.RATING}`;

  //send GET request to GIPHY and download JSON file
  let obj = {};
  request(searchQuery, (error, response, body) => {
    if(response.statusCode === 200){
      obj = JSON.parse(body);
      GiphyBot.processSearchResults(obj, channel);
    }
  });
};

//method that processes the JSON object returned from searchGiphy()
GiphyBot.processSearchResults = (obj, channel) => {
  //make sure there is no error and bail out if it broke
  if(obj.error){
    return -1;
  }

  //get the JSON object that is returned from GIPHY API
  GiphyBot.giphyObject.data = obj.data;
  //make sure we're getting at least 1 gif back
  if(!GiphyBot.giphyObject.data.length){
    return -1;
  }

  //lastly, return url of the gif
  GiphyBot.gif = GiphyBot.giphyObject.data[GiphyBot.giphyObject.i].embed_url;
  if(GiphyBot.gif === -1){
    GiphyBot.postMessage(channel, 'Sorry, something went wrong with your search', GiphyBot.params);
  }
  else{
    GiphyBot.postMessage(channel, GiphyBot.giphyObject.data[GiphyBot.giphyObject.i].images.downsized.url, GiphyBot.params);
  }
};

//method that allows the user get the next gif
GiphyBot.getNextGif = channel => {
  GiphyBot.giphyObject.i++;
  if(GiphyBot.giphyObject.i < GiphyBot.giphyObject.data.length){
    GiphyBot.postMessage(channel, GiphyBot.giphyObject.data[GiphyBot.giphyObject.i].images.downsized.url, GiphyBot.params);
  }
  else {
    GiphyBot.postMessage(channel, 'Sorry, Ive already given you all of your gif options', GiphyBot.params);
  }
};

///__________________________________________________________________________________________________
app.listen(PORT, () => {
  console.log(`Listening on Port: ${PORT}`);
});
