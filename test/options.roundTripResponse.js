describe('options.roundTripResponse.js', function() {
  it('should respond with answer from hidden-server', function(done) {
    this.timeout(TEST_TIMEOUT);

    /* dependencies */
    require('debug-trace')({
      always: true,
    });

    /* settings */
    var PORT = 3004;
    var TEST_TIMEOUT = 5000;
    var TEST_WAIT = 0;

    var settings = {
      publicServer: 'http://localhost:' + PORT,
      commandUri: '/command/:hiddenServerName',
      pingUri: '/ping/:hiddenServerName',
      simultaneousPings: 3,
      pingInterval: 0.5,
      keepPingOpen: false,
      roundTripResponse: true,
      hiddenServerName: 'server1'
    };


    /* hidden-server */
    var HiddenServer = require('../index')('hidden');
    var hidden = new HiddenServer(settings).start();

    hidden.on('command', function(obj, cb) {
      console.log('commander');
      // simulate async response
      setTimeout(function() {
        // add a new response attribute to the message object
        console.log('commander setTimeout');
        obj.response = Math.random();
        // modify the original command message attribute
        obj.command = obj.command + "What?";
        if (cb) cb(obj);
      }, 0);
    });

    /* public-server */
    var PublicServer = require('../index')('public');
    var public = PublicServer(settings);

    public.on('command', function(cmd) {});

    var publicServer = public.app.listen(PORT);


    /* client */
    // read the commandline command argument
    var userArgs = process.argv.slice(2);
    var command = userArgs[0];

    // get url right
    var url = settings.publicServer + settings.commandUri;
    url = url.replace(':hiddenServerName', settings.hiddenServerName);

    // run the tests
    var request = require('superagent');
    var assert = require('assert');


    setTimeout(function() {
      request
        .post(url)
        .send({
          command: 'options.roundTripResponse'
        })
        .end(function(err, res) {
          if (err) return done(err);
          var obj = res.body;

          assert(obj.command, 'command does not exist');
          assert(obj.id, 'id does not exist');
          assert.equal(obj.command, 'options.roundTripResponseWhat?');
          assert(obj.response, 'response does not exist');
          assert.equal(res.text.match(/command/).length, 1);
          publicServer.close(function() {
            done();
          });
        })
    }, TEST_WAIT);

  });
});
