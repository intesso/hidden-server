/* settings */
var settings = {
  publicServer: 'http://localhost:3000',
  commandUri: '/command/:hiddenServerName',
  pingUri: '/ping/:hiddenServerName',
  simultaneousPings: 5,
  pingInterval: 0.5,
  keepPingOpen: true,
  roundTripResponse: true,
  hiddenServerName: 'server1'
};

var TEST_TIMEOUT = 2000;
var TEST_WAIT = 800;

/* hidden */
var HiddenServer = require('../index')('hidden');
var hidden = new HiddenServer(settings).start();

hidden.on('command', function(obj, cb) {
  console.log('got command', obj);
  // simulate async response
  setTimeout(function() {
    obj.response = Math.random();
    obj.add = "plus";
    obj.sub = "subtrahieren";
    obj.command = obj.command + "What?";
    console.log('parameters', obj, cb);
    if (cb) cb(obj);
  }, 0);
});

/* public */
var PublicServer = require('../index')('public');
var public = PublicServer(settings);

public.on('command', function(cmd) {
  console.log('command', cmd);
});

public.app.listen(3000);


/* client */
// read the commandline command argument
var userArgs = process.argv.slice(2);
var command = userArgs[0];

// get url right
var url = settings.publicServer + settings.commandUri;
url = url.replace(':hiddenServerName', settings.hiddenServerName)
console.log('url', url);

// run the tests
var request = require('superagent');
var assert = require('assert');

describe('send command to public-server', function() {
  it('should respond with answer from hidden-server', function(done) {
    this.timeout(TEST_TIMEOUT);
    setTimeout(function() {
      request
        .post(url)
        .send({
          command: 'newCommand'
        })
      //.expect(200)
      .end(function(err, res) {
        console.log('res.text', res.text);
        assert.equal(res.text.match(/command/).length, 1);
        if (err) return done(err);
        done();
      })
    }, TEST_WAIT);
  })
});
