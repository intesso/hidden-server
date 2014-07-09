var PublicServer = require('../index')('public');
var public = PublicServer({
  commandUri: '/command/:hiddenServerName/:command',
  pingUri: '/ping/:hiddenServerName/:state',
  pingInterval: 3,
  keepPingOpen: true
});

public.on('command', function(cmd) {
  console.log('command', cmd);
});

public.app.listen(3000);
