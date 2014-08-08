// import dependencies
var request = require('superagent');
var settings = {
  publicServer: 'http://localhost:3000',
  commandUri: '/command/:hiddenServerName',
  hiddenServerName: 'server1'
};

// read the commandline command argument
var userArgs = process.argv.slice(2);
var command = userArgs[0];

// get url right
var url = settings.publicServer + settings.commandUri;
url = url.replace(':hiddenServerName', settings.hiddenServerName)
console.log('url', url);

/// send the request
request
  .post(url)
  .send({command:'newCommand'})
  .end(function(err, res) {
    if (err) return console.error(err);
    console.log('result', url, res.text, res.body);
  });

/// alternative client command call
// curl -H "Content-Type: application/json" -d '{"command":"newCommand","additional":"mää"}' localhost:3000/command/server1
