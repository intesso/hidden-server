var request = require('superagent');
var settings = require('../settings.json');

// read the commandline command argument
var userArgs = process.argv.slice(2);
var command = userArgs[0];

var url = settings.publicServer + settings.commandUri;
url = url.replace(':hiddenServerName', settings.hiddenServerName)
url = url.replace(':command', command);
console.log('url', url);

request
  .get(url)
  .end(function(err, res) {
    console.log('result', url, err, res);
  });
