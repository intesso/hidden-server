hidden-server
=============

access server sitting behind firewalls with unknown ip-address via reverse tunnel on demand.

## how it works

the `hidden-server` consists of three parts: `client` --command--> `public` <--ping-- `hidden`
 - `hidden` the hidden server or device that sits behind a firewall and does not have a fixed ip-address.
 - `public` a publicly available server the `client` can connect to. tt acts as a reverse proxy.
 - `client` client Machine that want's to access the hidden server.



it uses `http POST` only. the `hidden` server sends out ping messages to the `publicServer` at the given `pingInterval`.
in order to allow simultaneous user access, `simultaneousPings` are sent by the `hidden` server.


when the `keepPingOpen` option is `true` on the `hidden` and on the `public` server,
the pings are kept open until a command is received, or the next `pingInterval` kicks in. `pingInterval` is in seconds btw.
if the `keepPingOpen` option is `false`, the command request from the client will only be responded,
after the `public` server could respond to an incomming ping request from the `hidden` server.


when a `command` request by the client was successful, both ends (`public` and `hidden`) receive a `command` event.

ah and yes, you can have as many `hidden` servers as you like and connect them to a single `public` server.
the `client` can decide with wich `hidden` server it want's to talk.

## scenarios
The following scenarios describe the combinations with the options: `keepPingOpen` and `roundTripResponse`

###Scenario: keepPingOpen and roundTripResponse
  - `+` Advantage: fast, deterministic command response time / feedback from `hidden-server`
  - `-` Disadvantage: many open ports on `public-server` with many `hidden-servers`

```
+--------+                   +--------+                     +--------+
| Client |                   | Public |                     | Hidden |
+----+---+                   +----+---+                     +----+---+
     |                            |             Ping             |
     |                            | <--------------------------+ |
     |                            | |                            |
     |                            | | keepPingOpen               |
     |                            | |                            |
     |                            | |         Response           |
     |                            | v--------------------------> |
     |                            |                              |
     |                            |             Ping             |
     |                            | <--------------------------+ |
     |          Command           | |                            |
     | +------------------------> | |         Response           |
     |                          | | v--------------------------> | +---->
     |                          | |                              |      |  handleRequest
     |                          | |             Ping             |      |
     |          Response        | | <--------------------------+ | <----v
     | <------------------------v | |                            |
     |                            | | keepPingOpen               |
     |                            | |                            |
     |                            | |         Response           |
     |                            | v--------------------------> |
     |                            |                              |
     |                            |                              |
     +                            +                              +
```


###Scenario: roundTripResponse
 - `+` Advantage: no open ports on `public-server` / feedback from `hidden-server`
 - `-` Disadvantage: long, non deterministic command response time

```
 +--------+                   +--------+                     +--------+
 | Client |                   | Public |                     | Hidden |
 +----+---+                   +----+---+                     +----+---+
      |                            |             Ping             |
      |                            | <--------------------------+ | +
      |                            | v--------------------------> | |
      |                            |           Response           | | pingInterval
      |                            |                              | |
      |                            |                              | |
      |                            |             Ping             | v
      |                            | <--------------------------+ |
      |                            | v--------------------------> | +
      |                            |           Response           | |
      |          Command           |                              | | pingInterval
      | +------------------------> |                              | |
      |                          | |                              | |
      |                          | |             Ping             | v
      |                          | | <--------------------------+ |
      |                          | | v--------------------------> | +---->
      |                          | |           Response           |      | handleRequest
      |                          | |             Ping             |      |
      |                          | | <--------------------------+ | <----v
      |          Response        | | v--------------------------> |
      | <------------------------v |           Response           |
      |                            |                              |
      |                            |                              |
      +                            +                              +
```

###Scenario: keepPingOpen
- `+` Advantage: fast, deterministic command response time,
- `-` Disadvantage: no feedback from hidden-server / many open ports on `public-server` with many `hidden-servers`

```
+--------+                   +--------+                     +--------+
| Client |                   | Public |                     | Hidden |
+----+---+                   +----+---+                     +----+---+
     |                            |             Ping             |
     |                            | <--------------------------+ |
     |                            | |                            |
     |                            | | keepPingOpen               |
     |                            | |                            |
     |                            | |         Response           |
     |                            | v--------------------------> |
     |                            |                              |
     |                            |             Ping             |
     |                            | <--------------------------+ |
     |                            | |                            |
     |          Command           | |         Response           |
     | +------------------------> | v--------------------------> |
     |          Response        | |                              |
     | <------------------------v |             Ping             |
     |                            | <--------------------------+ |
     |                            | |                            |
     |                            | | keepPingOpen               |
     |                            | |                            |
     |                            | |         Response           |
     |                            | v--------------------------> |
     |                            |                              |
     |                            |                              |
     +                            +                              +
```


###Scenario: no Options
- `+` Advantage: not many... simple :-) ... no open ports on `public-server`
- `-` Disadvantage: long, non deterministic command response time / no feedback from hidden-server

```
+--------+                   +--------+                     +--------+
| Client |                   | Public |                     | Hidden |
+----+---+                   +----+---+                     +----+---+
     |                            |             Ping             |
     |                            | <--------------------------+ | +
     |                            | v--------------------------> | |
     |                            |           Response           | | pingInterval
     |                            |                              | |
     |                            |                              | v
     |                            |             Ping             |
     |                            | <--------------------------+ | +
     |                            | v--------------------------> | |
     |          Command           |           Response           | | pingInterval
     | +------------------------> |                              | |
     |                          | |                              | v
     |                          | |             Ping             |
     |          Response        | | <--------------------------+ | +
     | <------------------------v | v--------------------------> | |
     |                            |           Response           | | pingInterval
     |                            |                              | |
     |                            |                              | v
     |                            |                              |
     |                            |                              |
     +                            +                              +
```

diagrams created with [asciiflow](http://asciiflow.com/)


## install

  ```shell
  npm install hidden-server
  ```

##usage

### hidden

  ```javascript
  var HiddenServer = require('hidden-server')('hidden');
  var hidden = new HiddenServer({
    publicServer: 'http://localhost:3000',
    pingUri: '/ping/:hiddenServerName',
    simultaneousPings: 5,
    pingInterval: 3,
    keepPingOpen: true,
    roundTripResponse: false,
    hiddenServerName: 'server1'
  }).start();


  hidden.on('command', function(obj) {
    console.log('command', obj);
  });
  ```

### public

  ```javascript
  var PublicServer = require('hidden-server')('public');
  var public = PublicServer({
    commandUri: '/command/:hiddenServerName',
    pingUri: '/ping/:hiddenServerName',
    pingInterval: 3,
    keepPingOpen: true,
    roundTripResponse: false
  });

  public.on('command', function(obj) {
    console.log('command', obj);
  });

  public.listen(3000);
  ```

### client

  ```shell
  curl localhost:3000/command/server1/newCommand
  ```

## license
[MIT License](LICENSE)
