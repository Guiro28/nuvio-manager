const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR } = require('./config');

// Clé de chiffrement des tokens /play (AES-256-GCM).
//  - Priorité : variable d'env PLAY_SECRET (dérivée en 32 octets via SHA-256).
//    Indispensable si tu as plusieurs répliques du proxy (clé partagée).
//  - Sinon : clé aléatoire persistée dans data/play.key (stable entre redémarrages).
function loadKey() {
  if (process.env.PLAY_SECRET) {
    return crypto.createHash('sha256').update(process.env.PLAY_SECRET).digest();
  }
  const keyFile = path.join(DATA_DIR, 'play.key');
  try {
    const hex = fs.readFileSync(keyFile, 'utf8').trim();
    if (hex.length === 64) return Buffer.from(hex, 'hex');
  } catch {
    /* pas encore de clé */
  }
  const key = crypto.randomBytes(32);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(keyFile, key.toString('hex'), { mode: 0o600 });
  } catch (e) {
    console.warn('[secret] impossible de persister data/play.key : ' + e.message);
  }
  return key;
}

const KEY = loadKey();

// Chiffre `plaintext` -> base64url( iv(12) | tag(16) | ciphertext ).
function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64url');
}

// Déchiffre et vérifie l'authenticité. Lève une erreur si le token est falsifié
// (tag GCM invalide) ou forgé sans la clé -> le relais /play refusera la requête.
function decrypt(token) {
  const buf = Buffer.from(token, 'base64url');
  if (buf.length < 28) throw new Error('token trop court');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
