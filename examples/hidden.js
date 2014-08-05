var HiddenServer = require('../index')('hidden');
var hidden = new HiddenServer({
  publicServer: 'http://localhost:3000',
  pingUri: '/ping/:hiddenServerName/:state',
  simultaneousPings: 5,
  pingInterval: 5,
  keepPingOpen: true,
  roundTripResponse: true,
  hiddenServerName: 'server1',
  onCommand: onCommand,
  onHttpResponse: undefined,
  onError: undefined
}).start();

function onCommand(cmd, cb) {
  setTimeout(function(cmd) {
    console.log('onCommand', cmd);
    cb({
      command: cmd,
      custom: true
    });
  }, 1000);
}


hidden.on('command', function(cmd) {
  console.log('command', cmd);
});
