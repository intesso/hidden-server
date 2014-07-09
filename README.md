hidden-server
=============

access server sitting behind firewalls with unknown ip-address via reverse tunnel on demand.

## how it works

the `hidden-server` consists of three parts: `client` --command--> `public` <--ping-- `hidden`
 - `hidden` the hidden server or device that sits behind a firewall and does not have a fixed ip-address.
 - `public` a publicly available server the `client` can connect to. tt acts as a reverse proxy.
 - `client` client Machine that want's to access the hidden server.



it uses `http GET` only. the `hidden` server sends out ping messages to the `publicServer` at the given `pingInterval`.
in order to allow simultaneous user access, `simultaneousPings` are sent by the `hidden` server.


when the `keepPingOpen` option is `true` on the `hidden` and on the `public` server,
the pings are kept open until a command is received, or the next `pingInterval` kicks in. `pingInterval` is in seconds btw.
if the `keepPingOpen` option is `false`, the command request from the client will only be responded,
after the `public` server could respond to an incomming ping request from the `hidden` server.


when a `command` request by the client was successful, both ends (`public` and `hidden`) receive a `command` event.


## install

  ```shell
  npm install hidden-server
  ```

##usage

### client

  ```javascript
  var HiddenServer = require('hidden-server')('hidden');
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
  ```

### public

  ```javascript
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
  ```

### client

  ```shell
  curl localhost:3000/command/server1/newCommand
  ```
