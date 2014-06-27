var request = require('superagent');
var settings = require('../settings.json');

var url = settings.publicServer + settings.commandUri;
url = url.replace(':hiddenServerName', settings.hiddenServerName)
url = url.replace(':command', settings.commands[0]);
console.log('url', url);

request
  .get(url)
  .end(function(err, res) {
    console.log('result', url, err, res);
  });
