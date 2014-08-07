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
      self.saveRequest(self.pingRequests, name, req, message, self.get('pingInterval'));
    } else {
      self.handleRequest(self.commandRequests, name, res);
    }
  });

  /// command request from client
  app.post(self.get('commandUri'), function(req, res) {
    var name = req.params.hiddenServerName;
    var message = req.body;
    debug('command', req.url, name, message);

    if (!self.get('keepPingOpen')) {
      self.saveRequest(self.commandRequests, name, req, message, self.get('pingInterval'));
    } else {
      self.handleRequest(self.pingRequests, name, res, message);
    }
  });
}

PublicServer.prototype.handleRequest = function(requests, name, res, message) {
  var stored = requests[name] ? requests[name].pop ? requests[name].pop() : undefined : undefined;
  if (!stored) return res.json(jsonResponses.empty);

  // send response
  message = message || stored.message || {};
  debug('send message', message);
  // respond to the actual request
  if (!this.get('roundTripResponse')) {
    // only respond to the actual request when no roundTripResponse is required
    res.json(message);
  } else {
    // store actual request's response for roundTripResponse
    this.saveRequest(this.roundTripRequests, name, res.req, message, self.get('pingInterval'));
  }
  // respond to the saved request
  stored.req.res.json(message);
  this.emit('httpResponse', message);
  if (message.command) this.emit('command', message.command);

  // remove saved request and clear timeout
  if (stored.handleTimeout) clearTimeout(stored.handleTimeout);
}

PublicServer.prototype.saveRequest = function(requests, name, req, message, timeout) {
  var self = this;
  requests[name] = requests[name] || [];
  var obj = {};
  obj.req = req;
  obj.message = (message) ? message : {};
  obj.id = (message.id) ? message.id : uuid();

  debug('request', name, requests[name].length);

  // respond to the saved roundTripRequest
  if (this.get('roundTripResponse')) {
    // respond to the saved roundTripRequest
    var rtrs = this.roundTripRequests;
    var stored = rtrs[name] ? rtrs[name].pop ? rtrs[name].pop() : undefined : undefined;
    if (stored) {
      // respond to the saved request
      stored.req.res.json(message);
    } else {
      res.json(jsonResponses.empty);
    }
  }

  obj.handleTimeout = setTimeout(function() {
    req.res.json(jsonResponses.empty);
    var i = self.findRequest(requests, name, obj.id);
    if (i < 0) return;
    // remove the stored request from the requests array
    requests[name].splice(i, 1);
    debug('request delete after timeout', name, obj.id, i, requests[name].length);
  }, (timeout * 1000));

  requests[name].push(obj);
}

// returns index of element in array
PublicServer.prototype.findRequest = function(requests, name, id) {
  var arr = requests[name];
  if (!arr || !arr.length) return -1;
  if (!id) return arr[arr.length - 1];

  for (var i in arr) {
    if (arr[i].id == id) return i;
  }
  return -1;
}
