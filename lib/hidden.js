/// global dependencies
var Emitter = require('events').EventEmitter;
var request = require('superagent');
var debug = require('debug')('hidden-server:debug');
var Configurable = require('configurable');

/**
 * Expose `HiddenServer`.
 */

module.exports = HiddenServer;

/**
 * `HiddenServer` Constructor function.
 */
function HiddenServer(opts) {
  if (!(this instanceof HiddenServer)) return new HiddenServer(opts);

  this.set(require('../settings.json'));
  this.set(opts);
  this.uri = this.get('publicServer') + this.get('pingUri').replace(':hiddenServerName', this.get('hiddenServerName'));
  this.init();
  debug('uri', this.uri);
}

Configurable(HiddenServer.prototype);

/**
 * Inherit from `Emitter.prototype`.
 */

HiddenServer.prototype.__proto__ = Emitter.prototype;

/// HiddenServer functions
HiddenServer.prototype.init = function() {
  this.pingCount = 0;
  this.state = 'disconnect';
  return this;
};

HiddenServer.prototype.start = function() {
  var self = this;
  this.intervalHandler = setInterval(function() {
    while (self.pingCount < self.get('requests')) {
      self.sendPingRequest();
    }
  }, (self.get('pingInterval') * 1000));
  return this;
};

HiddenServer.prototype.stop = function() {
  clearInterval(this.intervalHandler);
  return this;
};

HiddenServer.prototype.sendPingRequest = function(cb) {
  var self = this;
  if (this.pingCount >= this.get('requests')) return false;

  this.pingCount++;
  debug('ping count', this.pingCount);
  var url = self.uri.replace(':state', self.state);

  request
    .get(url)
    .set('Accept', 'application/json')
    .end(function(err, res) {

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
      if (res.body && body.command) self.emit('command', body.command);
      debug('response body', res.statusCode, body);

      if (!cb && self.get('keepOpen')) process.nextTick(function() {
        self.sendPingRequest();
      }.bind(self));

    });

  return true;
};
