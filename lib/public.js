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
  app.get(self.get('pingUri'), function(req, res) {
    var name = req.params.hiddenServerName;
    var state = req.params.state;
    debug('ping', req.url, name, state);

    var message = {
      state: state
    };
    if (self.get('keepOpen')) {
      self.saveRequest(self.pingRequests, name, req, message, self.get('pingInterval'));
    } else {
      self.handleRequest(self.commandRequests, name, res);
    }
  });

  /// command request from client
  app.get(self.get('commandUri'), function(req, res) {
    var name = req.params.hiddenServerName;
    var command = req.params.command;
    debug('command', req.url, name, command, !self.get('keepOpen'));

    var message = {
      command: command
    };
    if (!self.get('keepOpen')) {
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
  res.json(message);
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

  obj.handleTimeout = setTimeout(function() {
    req.res.json(jsonResponses.empty);
    var i = self.findRequest(requests, name, obj.id);
    if (i < 0) return;
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
