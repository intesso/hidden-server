var HiddenServer = require('../index')('hidden');
var hidden = new HiddenServer({
  publicServer: 'http://localhost:3000',
  pingUri: '/ping/:hiddenServerName',
  simultaneousPings: 5,
  pingInterval: 5,
  keepPingOpen: true,
  roundTripResponse: true,
  hiddenServerName: 'server1'
}).start();

hidden.on('command', function(obj, cb) {
  // simulate async response
  setTimeout(function() {
    obj.response = Math.random();
    console.log('parameters', obj, cb);
    if (cb) cb(obj);
  }, 1000);
});
