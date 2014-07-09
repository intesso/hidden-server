var HiddenServer = require('../index')('hidden');
var hidden = new HiddenServer({
  publicServer: 'http://localhost:3000',
  pingUri: '/ping/:hiddenServerName/:state',
  simultaneousPings: 5,
  pingInterval: 5,
  keepPingOpen: true,
  hiddenServerName: 'server1'
}).start();


hidden.on('command', function(cmd) {
  console.log('command', cmd);
});
