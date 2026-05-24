'use strict';
// Drop-in replacement for buffer-equal-constant-time@1.0.1.
// The published package dereferences SlowBuffer.prototype at module scope,
// which crashes on Node releases where SlowBuffer has been removed.
var crypto = require('crypto');
var Buffer = require('buffer').Buffer;
var SlowBuffer = require('buffer').SlowBuffer;

module.exports = bufferEq;

function bufferEq(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

var origBufEqual = Buffer.prototype.equal;
var origSlowBufEqual = SlowBuffer ? SlowBuffer.prototype.equal : undefined;

bufferEq.install = function () {
  var equal = function equal(that) {
    return bufferEq(this, that);
  };
  Buffer.prototype.equal = equal;
  if (SlowBuffer) {
    SlowBuffer.prototype.equal = equal;
  }
};

bufferEq.restore = function () {
  Buffer.prototype.equal = origBufEqual;
  if (SlowBuffer) {
    SlowBuffer.prototype.equal = origSlowBufEqual;
  }
};
