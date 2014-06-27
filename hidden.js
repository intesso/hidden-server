/// global dependencies
var Emitter = require('events').EventEmitter;
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var request = require('superagent');
var debug = require('debug')('hidden-server:debug');
var uuid = require('cuid');

/// local dependencies
var settings = require('./settings.json');

/// module variables (requests for callback)
var uri = settings.publicServer + settings.pingUri.replace(':hiddenServerName', settings.hiddenServerName);

/**
 * Expose `HiddenServer`.
 */

module.exports = HiddenServer;

/**
 * `HiddenServer` Constructor function.
 */
function HiddenServer() {
  if (!(this instanceof HiddenServer)) return new HiddenServer();
  this.init();
}

/**
 * Inherit from `Emitter.prototype`.
 */

HiddenServer.prototype.__proto__ = Emitter.prototype;

HiddenServer.prototype.init = function() {
  this.pingCount = 0;
  this.state = settings.states[0];
  return this;
};

HiddenServer.prototype.start = function() {
  var self = this;
  this.intervalHandler = setInterval(function() {
    while (self.pingCount < settings.requests) {
      self.sendPingRequest();
    }
  }, (settings.pingInterval * 1000));
  return this;
};

HiddenServer.prototype.stop = function() {
  clearInterval(this.intervalHandler);
  return this;
};

HiddenServer.prototype.sendPingRequest = function(cb) {
  var self = this;
  if (this.pingCount >= settings.requests) return false;

  this.pingCount++;
  debug('ping count', this.pingCount);
  var url = uri.replace(':state', self.state);

  request
    .get(url)
    .set('Accept', 'application/json')
    .end(function(err, res) {

      //console.log('superagent res', err, res);
      if (self.pingCount > 0) self.pingCount--;
      if (err) {
        self.emit('httpRequestError');
        debug('httpRequestError', err);
        if (cb) cb(err);
        return;
      }

      var body = res.body || {};
      if (body.command) self.state = body.command;
      if (cb) cb(err, body);
      self.emit('httpResponse', body);
      debug('response body', res.statusCode, body);

      if (!cb && settings.keepOpen) process.nextTick(function() {
        self.sendPingRequest();
      }.bind(self));

    });

  return true;
};
