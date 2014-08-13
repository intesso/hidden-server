describe('options.noOptions.js', function() {
  it('should respond with answer from hidden-server', function(done) {
    this.timeout(TEST_TIMEOUT);

    /* dependencies */
    var debug = require('debug')('test:debug');
    require('debug-trace')({
      always: true,
    });

    /* settings */
    var PORT = 3001;
    var TEST_TIMEOUT = 5000;
    var TEST_WAIT = 0;

    var settings = {
      publicServer: 'http://localhost:' + PORT,
      commandUri: '/command/:hiddenServerName',
      pingUri: '/ping/:hiddenServerName',
      simultaneousPings: 5,
      pingInterval: 0.5,
      keepPingOpen: false,
      roundTripResponse: false,
      hiddenServerName: 'server1'
    };


    /* hidden-server */
    var HiddenServer = require('../index')('hidden');
    var hidden = new HiddenServer(settings).start();

    hidden.on('command', function(obj, cb) {});

    /* public-server */
    var PublicServer = require('../index')('public');
    var public = PublicServer(settings);

    public.on('command', function(cmd) {});

    var publicServer = public.listen(PORT);


    /* client */
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
          command: 'noOptions'
        })
        .end(function(err, res) {
          debug('clientResponse', err, res.body);
          if (err) return done(err);
          var obj = res.body;
          assert(obj.command, 'command does not exist');
          assert.equal(obj.command, 'noOptions');
          publicServer.close(function() {
            done();
          });
        })
    }, TEST_WAIT);

  });
});
