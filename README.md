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

###rough description
  1. Request: hidden server -> public server: /ping/:hiddenServerName/:state
  2.   keep ping open, no response before timeout or command request (3)
       <- Response (1): {hiddenServerName, command}
       continuously repeat Step 1 and 2
  3. Request: client -> public server: /command/:hiddenServerName/:command
  2.   <- Response (1): {hiddenServerName, command}
  4.   <- Response (3): {state}



###Scenario: keepPingOpen and roundTripResponse
  - `+` fast, deterministic command response time
  - `-` many open ports on `public-server` with many `hidden-servers`


    +--------+                   +--------+                     +--------+
    | Client |                   | Public |                     | Hidden |
    +----+---+                   +----+---+                     +----+---+
         |                            |             Ping             |
         |                            | <--------------------------+ |
         |                            | |                            |
         |                            | | keepPingOpen               |
         |                            | |                            |
         |                            | |         Response           |
         |                            | +--------------------------> |
         |                            |                              |
         |                            |             Ping             |
         |                            | <--------------------------+ |
         |          Command           | |                            |
         | +------------------------> | |         Response           |
         |                          | | +--------------------------> | +---->
         |                          | |                              |      |  handleRequest
         |                          | |             Ping             |      |
         |          Response        | | <--------------------------+ | <----v
         | <------------------------v | |                            |
         |                            | | keepPingOpen               |
         |                            | |                            |
         |                            | |         Response           |
         |                            | +--------------------------> |
         |                            |                              |
         |                            |                              |
         +                            +                              +



###Scenario: roundTripResponse
 - `+` Advantage: no open ports on `public-server`
 - `-` Disadvantage: long, non deterministic command response time


     +--------+                   +--------+                     +--------+
     | Client |                   | Public |                     | Hidden |
     +----+---+                   +----+---+                     +----+---+
          |                            |             Ping             |
          |                            | <--------------------------+ | +
          |                            | +--------------------------> | |
          |                            |           Response           | | pingInterval
          |                            |                              | |
          |                            |                              | |
          |                            |             Ping             | v
          |                            | <--------------------------+ |
          |                            | +--------------------------> | +
          |                            |           Response           | |
          |          Command           |                              | | pingInterval
          | +------------------------> |                              | |
          |                          | |                              | |
          |                          | |             Ping             | v
          |                          | | <--------------------------+ |
          |                          | | +--------------------------> | +---->
          |                          | |           Response           |      | handleRequest
          |                          | |             Ping             |      |
          |                          | | <--------------------------+ | <----v
          |          Response        | | +--------------------------> |
          | <------------------------v |           Response           |
          |                            |                              |
          |                            |                              |
          +                            +                              +

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

  public.app.listen(3000);
  ```

### client

  ```shell
  curl localhost:3000/command/server1/newCommand
  ```

## license
[MIT License](LICENSE)
