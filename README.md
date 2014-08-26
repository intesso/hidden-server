hidden-server
=============

talk to `public-server` in order to execute `client` commands

use case: access server sitting behind firewalls with unknown ip-address via reverse tunnel on demand.


## documentation

the `hidden-server` is the counter part of [public-server](https://github.com/intesso/public-server/).
to keep things less redundant, the documentation can be found here: [public-server](https://github.com/intesso/public-server/blob/master/README.md)

## install

  ```shell
  npm install hidden-server
  ```

##usage

full examples can be found here: [public-server/examples](https://github.com/intesso/public-server/tree/master/examples)

###with roundtrip

  ```javascript
  var HiddenServer = require('hidden-server');
  var hidden = new HiddenServer({
    publicServer: 'http://localhost:3000',
    pingUri: '/ping/:hiddenServerName',
    simultaneousPings: 3,
    pingInterval: 5,
    keepPingOpen: true,
    roundTripResponse: true,
    hiddenServerName: 'server1'
  }).start();

  hidden.on('command', function(obj, cb) {
    console.log('got command', obj);
    // simulate async response
    setTimeout(function() {
      obj.response = "are you sure about: " + obj.command;
      console.log('parameters', obj, cb);
      if (cb) cb(obj);
    }, 0);
  });

  ```

###without roundtrip

  ```javascript
  var HiddenServer = require('hidden-server');
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


##test

tests can be found here: [public-server/test](https://github.com/intesso/public-server/tree/master/test)


## license
[MIT License](LICENSE)
