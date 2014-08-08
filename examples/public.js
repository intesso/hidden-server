var PublicServer = require('../index')('public');
var public = PublicServer({
  commandUri: '/command/:hiddenServerName',
  pingUri: '/ping/:hiddenServerName',
  pingInterval: 5,
  keepPingOpen: true,
  roundTripResponse: true
});

public.on('command', function(cmd) {
  console.log('command', cmd);
});

public.app.listen(3000);
