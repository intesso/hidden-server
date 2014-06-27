/// global dependencies
var Emitter = require('events').EventEmitter;
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var debug = require('debug')('hidden-server:debug');
var uuid = require('cuid');

/// local dependencies
var settings = require('./settings.json');

/// module variables (requests for callback)
var pingRequests = {};
var commandRequests = {};

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
function PublicServer() {
  if (!(this instanceof PublicServer)) return new PublicServer();
  this.app = app;
}

/**
 * Inherit from `Emitter.prototype`.
 */

PublicServer.prototype.__proto__ = Emitter.prototype;


/// ping request from hidden-server (keep alive)
app.get(settings.pingUri, function(req, res) {
  var name = req.params.hiddenServerName;
  var state = req.params.state;
  debug('ping', req.url, name, state);

  if (settings.keepOpen) {
    saveRequest(pingRequests, name, req, {
      state: state
    }, settings.pingInterval);
  } else {
    handleRequest(commandRequests, name, res);
  }
});

/// command request from client
app.get(settings.commandUri, function(req, res) {
  var name = req.params.hiddenServerName;
  var command = req.params.command;
  debug('command', req.url, name, command);

  if (!settings.keepOpen) {
    saveRequest(commandRequests, name, req, {
      command: command
    }, settings.pingInterval);
  } else {
    handleRequest(pingRequests, name, res);
  }
});


function saveRequest(requests, name, req, message, timeout) {
  debug('name', name);
  requests[name] = requests[name] || [];
  var obj = {};
  obj.message = (message) ? message : {};
  obj.id = (message.id) ? message.id : uuid();

  debug('requests', requests, requests[name].length);

  obj.handleTimeout = setTimeout(function() {
    req.res.json(jsonResponses.empty);
    var i = findRequest(requests, name, obj.id);
    if (i > -1) requests[name].splice(i, 1);
    debug('timeout delete req', obj.id, name, i, requests[name].length);

  }, (timeout * 1000));

  requests[name].push(obj);
}

function handleRequest(requests, name, res) {
  var req = requests[name] ? requests[name].pop ? requests[name].pop() : undefined : undefined;
  if (!req) return res.json(jsonResponses.empty);

  // send response
  var message = (req.message) ? req.message : {};
  res.json(message);

  // remove saved request and clear timeout
  if (req.handleTimeout) clearTimeout(req.handleTimeout);
  delete requests[name];
}

// returns index of element in array
function findRequest(requests, name, id) {
  var arr = requests[name];
  if (!arr || !arr.length) return -1;
  if (!id) return arr[arr.length - 1];

  for (var i in arr) {
    if (arr[i].id == id) return i;
  }
  return -1;
}
