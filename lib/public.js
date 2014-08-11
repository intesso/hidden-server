/// global dependencies
var Emitter = require('events').EventEmitter;
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var debug = require('debug')('public-server:debug');
var uuid = require('cuid');
var Configurable = require('configurable');

/// local dependencies
var settings = require('../settings.json');

/// module variables
var jsonResponses = {
  empty: {},
  timeout: {
    timeout: 'response timeout'
  },
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
      var obj = self.savePing(name, res, message);
      self.handleRoundTripCommand(name, res, message, obj.id);
    } else {
      self.handlePing(name, res, message);
    }

  });

  /// command request from client
  app.post(self.get('commandUri'), function(req, res) {
    var name = req.params.hiddenServerName;
    var message = req.body;
    debug('command', req.url, name, message);

    if (self.get('keepPingOpen')) {
      self.handleCommand(name, res, message);
    } else {
      var obj = self.saveCommand(name, res, message);
    }
  });
};

PublicServer.prototype.handlePing = function(name, res, message) {
  var arr = this.commandRequests[name];
  var stored = arr ? arr.length ? arr[arr.length - 1] : undefined : undefined;
  if (!stored) return res.json(jsonResponses.empty);

  // send response
  message = message || stored.message || {};
  debug('handlePing', message);

  if (!this.get('roundTripResponse')) {
    // respond to both (actual ping and stored command) with the command json message.
    res.json(stored.message);
    stored.res.json(stored.message);
    // remove saved request and clear timeout
    if (stored.handleTimeout) clearTimeout(stored.handleTimeout);
    arr.pop();
  } else {
    // with roundTripResponse:
    // - first ping requests must answered with the command json message,
    // - then the second ping request's message must be forwarded to the command response.
    if (message.id != stored.id) {
      debug('handlePing first roundTripRequest', message);
      // first respond to ping request after command
      stored.message.id = stored.id;
      res.json(stored.message);
    } else {
      debug('handlePing second roundTripRequest', message);
      // second respond to command after second ping request
      stored.res.json(message);
      // remove saved request and clear timeout
      if (stored.handleTimeout) clearTimeout(stored.handleTimeout);
      arr.pop();
    }
  }

  this.emit('httpResponse', message);
  if (message.command) this.emit('command', message);
};


PublicServer.prototype.handleCommand = function(name, res, message) {
  var arr = this.pingRequests[name];
  var stored = arr ? arr.pop ? arr.pop() : undefined : undefined;
  if (!stored) return res.json(jsonResponses.empty);

  // send response
  message = message || stored.message || {};
  debug('send message', message);

  // respond to the actual command request
  if (!this.get('roundTripResponse')) {
    // only respond to the actual command request when no roundTripResponse is required
    res.json(message);
  } else {
    // store actual command request's response for roundTripResponse
    // the message must contain an id, so that the next ping request can be forwarded to the command response.
    message.id = message.id || uuid();
    this.saveCommand(name, res, message);
  }
  // respond to the saved ping request
  stored.res.json(message);
  // remove saved request and clear timeout
  if (stored.handleTimeout) clearTimeout(stored.handleTimeout);

  this.emit('httpResponse', message);
  if (message.command) this.emit('command', message);
};

PublicServer.prototype.handleRoundTripCommand = function(name, res, message, id) {
  // respond to the saved command roundTripRequest with the corresponding id
  if (this.get('roundTripResponse')) {
    var arr = this.commandRequests[name];
    var i = this.findRequest(arr, id);
    if (~i) {
      debug('handleRoundTripCommand response', arr[i].res);
      arr[i].res.json(message);
      arr[i].res.end();
      this.removeRequest(arr, id);
    }
  }
};

PublicServer.prototype.savePing = function(name, res, message) {
  var self = this;
  var arr = this.pingRequests[name] = this.pingRequests[name] || [];
  var obj = this.prepareObject(res, message);
  debug('savePing', name, arr.length);

  this.handleTimeout(arr, obj, res);
  arr.push(obj);
  return obj;
};

PublicServer.prototype.saveCommand = function(name, res, message) {
  var self = this;
  var arr = this.commandRequests[name] = this.commandRequests[name] || [];
  var obj = this.prepareObject(res, message);
  debug('saveCommand', name, arr.length);

  this.handleTimeout(arr, obj, res);
  arr.push(obj);
  return obj;
};

PublicServer.prototype.prepareObject = function(res, message) {
  var obj = {};
  obj.res = res;
  obj.message = (message) ? message : {};
  obj.id = (message.id) ? message.id : uuid();
  return obj;
};

PublicServer.prototype.handleTimeout = function(arr, obj, res) {
  var self = this;
  obj.handleTimeout = setTimeout(function() {
    res.json(jsonResponses.timeout);
    if (!self.removeRequest(arr, obj.id)) return;
    debug('request delete after timeout', obj.id, arr.length);
  }, (self.get('pingInterval') * 1500));
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

PublicServer.prototype.listen = function () {
  return this.app.listen.apply(this.app, arguments);
};
