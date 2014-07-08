var HiddenServer = require('../lib/hidden.js');
var hidden = new HiddenServer({
  publicServer: 'http://localhost:3000',
  pingUri: '/ping/:hiddenServerName/:state',
  requests: 5,
  pingInterval: 5,
  keepOpen: true,
  hiddenServerName: 'server1'
}).start();


hidden.on('command', function(evt) {
  console.log('command', evt);
});
