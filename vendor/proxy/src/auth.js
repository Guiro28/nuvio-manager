const crypto = require('crypto');

const USER = process.env.AUTH_USER || '';
const PASS = process.env.AUTH_PASS || '';
const ENABLED = Boolean(USER && PASS);

// Secret de signature des sessions. Stable tant que les identifiants ne changent pas
// (ou fixe-le explicitement via AUTH_SECRET pour survivre a un changement de mot de passe).
const SECRET = process.env.AUTH_SECRET ||
  crypto.createHash('sha256').update('stremio-proxy:' + USER + ':' + PASS).digest('hex');

const COOKIE = 'sp_session';
const MAX_AGE = 7 * 24 * 3600; // 7 jours (en secondes)

if (!ENABLED) {
  console.warn('[auth] AUTH_USER/AUTH_PASS non definis -> interface NON protegee.');
} else {
  console.log('[auth] Interface protegee par page de login (utilisateur: ' + USER + ').');
}

// ---- Comparaisons a temps constant ----------------------------------------

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function verify(user, pass) {
  return ENABLED && safeEqual(user || '', USER) && safeEqual(pass || '', PASS);
}

// ---- Jeton de session (cookie signe, stateless) ---------------------------

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function issue() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  return payload + '.' + sign(payload);
}

function valid(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  if (!safeEqual(sig, sign(payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof exp === 'number' && Date.now() < exp;
  } catch {
    return false;
  }
}

// ---- Cookies ---------------------------------------------------------------

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function isSecure(req) {
  return (req.headers['x-forwarded-proto'] || req.protocol || '').includes('https');
}

function setCookie(req, res) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=${issue()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}${isSecure(req) ? '; Secure' : ''}`);
}

function clearCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function isAuthed(req) {
  return valid(parseCookies(req)[COOKIE]);
}

// ---- Middleware ------------------------------------------------------------

function needsAuth(pathname) {
  // Points d'entree publics de l'auth
  if (pathname === '/login' || pathname === '/api/login' || pathname === '/api/logout') return false;
  // On protege l'UI et l'API de gestion. Routes addon et /play restent publiques.
  return pathname === '/' || pathname === '/index.html' || pathname.startsWith('/api');
}

function middleware(req, res, next) {
  if (!ENABLED || !needsAuth(req.path)) return next();
  if (isAuthed(req)) return next();
  if (req.path.startsWith('/api')) return res.status(401).json({ error: 'Non authentifie' });
  return res.redirect('/login');
}

module.exports = { middleware, ENABLED, verify, setCookie, clearCookie, isAuthed };
