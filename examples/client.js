// import dependencies
var request = require('superagent');
var settings = require('../settings.json');

// read the commandline command argument
var userArgs = process.argv.slice(2);
var command = userArgs[0];

// get url right
var url = settings.publicServer + settings.commandUri;
url = url.replace(':hiddenServerName', settings.hiddenServerName)
url = url.replace(':command', command);
console.log('url', url);

/// send the request
request
  .get(url)
  .end(function(err, res) {
    console.log('result', url, err, res);
  });

/// alternative client command call
// curl localhost:3000/command/server1/newCommand
