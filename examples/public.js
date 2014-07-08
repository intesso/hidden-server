var PublicServer = require('../lib/public.js');
var ps = PublicServer({
  commandUri: '/command/:hiddenServerName/:command',
  pingUri: '/ping/:hiddenServerName/:state',
  pingInterval: 3,
  keepOpen: true
});

ps.on('command', function(evt) {
  console.log('command', evt);
});

ps.app.listen(3000);
