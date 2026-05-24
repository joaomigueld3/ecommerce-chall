import buffer from 'node:buffer';

// jsonwebtoken -> jws -> jwa -> buffer-equal-constant-time still reads
// SlowBuffer.prototype at load time, but SlowBuffer was removed in Node >= 24.
// Aliasing it to Buffer keeps the JWT stack working on modern Node versions.
// Import this module before importing 'jsonwebtoken'.
if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = buffer.Buffer;
}
