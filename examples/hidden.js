var HiddenServer = require('../index')('hidden');
var hidden = new HiddenServer({
  publicServer: 'http://localhost:3000',
  pingUri: '/ping/:hiddenServerName',
  simultaneousPings: 3,
  pingInterval: 5,
  keepPingOpen: true,
  roundTripResponse: true,
  hiddenServerName: 'server1'
}).start();

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
