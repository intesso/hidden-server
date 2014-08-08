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
  this.callbackCount = 0;
  this.state = 'disconnect';
  return this;
};

HiddenServer.prototype.start = function() {
  var self = this;
  this.intervalHandler = setInterval(function() {
    while (self.sendAllowed()) {
      self.sendPingRequest();
    }
  }, (self.get('pingInterval') * 1000));
  return this;
};

HiddenServer.prototype.stop = function() {
  clearInterval(this.intervalHandler);
  return this;
};

HiddenServer.prototype.sendPingRequest = function(obj) {
  var self = this;
  if (obj) this.callbackCount--;
  obj = obj || {};
  if (!this.sendAllowed()) return false;

  this.pingCount++;
  debug('ping count', this.pingCount);
  var url = self.uri.replace(':state', self.state);

  request
    .post(url)
    .set('Accept', 'application/json')
    .send(obj)
    .end(function(err, res){
      self.receivePingResponse(err, res);
    }.bind(self));
  return true;
};

HiddenServer.prototype.receivePingResponse = function(err, res) {
  var self = this;
  debug('self', this);
  if (this.pingCount > 0) this.pingCount--;
  if (err) return this.emit('httpRequestError', err);

  var body = res.body || {};
  if (body.command) this.state = body.command;
  this.emit('httpResponse', body);
  if (res.body && body.command) {
    this.callbackCount++;
    this.emit('command', body, function(obj) {
      self.sendPingRequest(obj);
    }.bind(self));
  }
  debug('response body', res.statusCode, body);

  if ((!body.command || !this.get('roundTripResponse')) && this.get('keepPingOpen')) process.nextTick(function() {
    this.sendPingRequest();
  }.bind(this));
};

HiddenServer.prototype.sendAllowed = function () {
  return (this.pingCount < (this.get('simultaneousPings') - this.callbackCount));
};
