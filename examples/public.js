var PublicServer = require('../index')('public');
var public = PublicServer({
  commandUri: '/command/:hiddenServerName',
  pingUri: '/ping/:hiddenServerName',
  pingInterval: 5,
  keepPingOpen: true,
  roundTripResponse: true
});

public.on('command', function(message) {
  console.log('command', message);
});

public.on('commandResponse', function(message) {
  console.log('commandResponse', message);
});

public.on('ping', function(message) {
  console.log('ping', message);
});

public.on('pingResponse', function(message) {
  console.log('pingResponse', message);
});

public.listen(3000);

// or with an existing express app:
// app.use(public.app);
