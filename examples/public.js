var PublicServer = require('../index')('public');
var public = PublicServer({
  commandUri: '/command/:hiddenServerName',
  pingUri: '/ping/:hiddenServerName',
  pingInterval: 5,
  keepPingOpen: true,
  roundTripResponse: true
});

public.on('command', function(obj) {
  console.log('command', obj);
});

public.listen(3000);

// or with an existing express app:
// app.use(public.app);
