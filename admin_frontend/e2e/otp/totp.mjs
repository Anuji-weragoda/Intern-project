// Minimal TOTP generator (RFC 6238) using Node's crypto, with Base32 secret (RFC 4648)
// Usage: const code = totpCode({ secret: 'BASE32SECRET', digits: 6, step: 30 })

import crypto from 'node:crypto';

export function totpCode({ secret, digits = 6, step = 30, timestamp = Date.now() }) {
  const key = base32Decode(secret);
  let ctr = Math.floor(timestamp / 1000 / step);
  const msg = Buffer.alloc(8);
  // Write big-endian counter
  for (let i = 7; i >= 0; i--) {
    msg[i] = ctr & 0xff;
    ctr >>>= 8;
  }
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin = ((hmac[offset] & 0x7f) << 24) |
              ((hmac[offset + 1] & 0xff) << 16) |
              ((hmac[offset + 2] & 0xff) << 8) |
              (hmac[offset + 3] & 0xff);
  const mod = 10 ** digits;
  const code = (bin % mod).toString().padStart(digits, '0');
  return code;
}

function base32Decode(input) {
  // RFC 4648 Base32 decode for TOTP secrets
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(input).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}
