/// global dependencies
var Emitter = require('events').EventEmitter;
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var debug = require('debug')('hidden-server:debug');
var uuid = require('cuid');
var Configurable = require('configurable');

/// local dependencies
var settings = require('../settings.json');

/// module variables
var jsonResponses = {
  empty: {},
  command: {
    command: 'command'
  },
  success: {
    success: 'request handled sucessfully'
  },
  error: {
    error: 'could not handle request'
  }
};

/// initialize express
app.use(bodyParser());

/**
 * Expose `PublicServer`.
 */

module.exports = PublicServer;

/**
 * `HiddenServer` Constructor function.
 */
function PublicServer(opts) {
  if (!(this instanceof PublicServer)) return new PublicServer(opts);
  // expose webserver
  this.app = app;

  // initialize and expose requests for callback
  this.set(settings);
  this.set(opts);
  this.pingRequests = {};
  this.commandRequests = {};
  this.roundTripRequests = {};

  this.handleRequests();
}

Configurable(PublicServer.prototype);


/**
 * Inherit from `Emitter.prototype`.
 */

PublicServer.prototype.__proto__ = Emitter.prototype;


/// PublicServer functions
PublicServer.prototype.handleRequests = function() {
  var self = this;

  /// ping request from hidden-server (keep alive)
  app.post(self.get('pingUri'), function(req, res) {
    var name = req.params.hiddenServerName;
    var message = req.body;
    debug('ping', req.url, name, message);

    if (self.get('keepPingOpen')) {
      self.saveRequest(self.pingRequests, name, res, message);
    } else {
      self.handleRequest(self.commandRequests, name, res);
    }

  });

  /// command request from client
  app.post(self.get('commandUri'), function(req, res) {
    var name = req.params.hiddenServerName;
    var message = req.body;
    debug('command', req.url, name, message);

    if (self.get('keepPingOpen')) {
      self.handleRequest(self.pingRequests, name, res, message);
    } else {
      self.saveRequest(self.commandRequests, name, res, message);
    }
  });
};

PublicServer.prototype.handleRequest = function(requests, name, res, message) {
  var stored = requests[name] ? requests[name].pop ? requests[name].pop() : undefined : undefined;
  if (!stored) return res.json(jsonResponses.empty);

  // send response
  message = message || stored.message || {};
  debug('send message', message);

  this.handleRoundTripResponse(res, stored, name, message);

  // // respond to the actual request
  // if (!this.get('roundTripResponse')) {
  //   // only respond to the actual request when no roundTripResponse is required
  //   // Meaning of res:: keepPingOpen=true: res=commandResponse | keepPingOpen=false: res=pingResponse
  //   res.json(message);
  // } else {
  //   // store actual request's response for roundTripResponse
  //   message.id = message.id || uuid();
  //   // TODO res, does not work without keepPingOpen -> commend request is not the actual one, but the stored one.
  //   // TODO roundTripRequests must always be pingRequests
  //   this.saveRequest(this.roundTripRequests, name, res, message);
  // }
  // // respond to the saved request
  // // Meaning of stored:: keepPingOpen=true: stored=pingObject | keepPingOpen=false: stored=commandObject
  // // TODO check with keepPingOpen=false
  // stored.res.json(message);


  this.emit('httpResponse', message);
  if (message.command) this.emit('command', message.command);

  // remove saved request and clear timeout
  // TODO check with keepPingOpen=false
  if (stored.handleTimeout) clearTimeout(stored.handleTimeout);
};

PublicServer.prototype.handleRoundTripResponse = function(actual, stored, name, message) {
  if (!this.get('roundTripResponse')) {
    // we don't care what actual and stored is, ping or command, just respond to both with the json message.
    actual.json(message);
    stored.res.json(message);
  } else {
    // with roundTripResponse ping requests must be saved first, to be responded in the next ping request.
    // Meaning of actual::   keepPingOpen=true: actual=commandResponse |   keepPingOpen=false: actual=pingResponse
    // Meaning of stored::   keepPingOpen=true: stored=pingObject      |   keepPingOpen=false: stored=commandObject
    var ping = (this.get('keepPingOpen')) ? stored : actual;
    var command = (this.get('keepPingOpen')) ? actual : stored;

    if (this.get('keepPingOpen')) {
      // create a id for the roundTripResponse Message for finding the right next ping request to respond to.
      message.id = message.id || uuid();
      // save the command request in order to respond later.
      this.saveRequest(this.roundTripRequests, name, actual, message);
      stored.res.json(message);
    } else {
      console.log('actualMessage', message, actual.message, stored.id, stored.message.id, message.id);
      if (message.id != stored.id) {
        console.log('first', message.id, stored.id);
        // first ping request after command
        stored.message.id = stored.id;
        actual.json(stored.message);
        // put back in place for second ping request
        this.commandRequests[name].push(stored);
      } else {
        console.log('second', message);
        // second ping request
        stored.res.json(message);
      }

    }
  }
};

PublicServer.prototype.saveRequest = function(requests, name, res, message, timeout) {
  var self = this;
  requests[name] = requests[name] || [];
  var arr = requests[name];
  var obj = {};
  obj.res = res;
  obj.message = (message) ? message : {};
  obj.id = (message.id) ? message.id : uuid();

  debug('request', name, arr.length);

  // respond to the saved roundTripRequest with the corresponding id
  if (this.get('roundTripResponse')) {
    var rtrs = this.roundTripRequests[name];
    var i = this.findRequest(rtrs, obj.id);
    if (~i) {
      rtrs[i].res.json(message);
    }
  }

  obj.handleTimeout = setTimeout(function() {
    res.json(jsonResponses.empty);
    if (!self.removeRequest(arr, obj.id)) return;
    debug('request delete after timeout', name, obj.id, arr.length);
  }, (self.get('pingInterval') * 1000));

  arr.push(obj);
};

// returns index of element in array
PublicServer.prototype.findRequest = function(arr, id) {
  if (!arr || !arr.length) return -1;
  if (!id) return arr[arr.length - 1];

  for (var i in arr) {
    if (arr[i].id == id) return i;
  }
  return -1;
};

PublicServer.prototype.removeRequest = function(arr, id) {
  var i = this.findRequest(arr, id);
  if (i < 0) return false;
  // remove the stored request from the requests array
  arr.splice(i, 1);
  return true;
};
