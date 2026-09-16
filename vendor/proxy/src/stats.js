// Stats du dashboard : bande passante, CPU et RAM du process.
//
// NB : le comptage des "lectures" (en cours / total) a été retiré volontairement.
// Depuis un proxy HTTP on ne peut pas distinguer de façon fiable une pause de
// buffering d'un arrêt, ni un changement de film de deux écrans distincts, ni les
// reprises. Plutôt qu'un compteur trompeur, on n'affiche que ce qui est exact.

const startedAt = Date.now();
const s = { bytesRelayed: 0 };

// Historique des octets relayés (1 point/s) pour le débit + échantillonnage CPU.
const bwHistory = [];
let cpuPercent = 0;
let lastCpu = process.cpuUsage(); // micros cumulés (user+system)
let lastCpuAt = Date.now();
const bwTimer = setInterval(() => {
  const now = Date.now();
  bwHistory.push({ t: now, bytes: s.bytesRelayed });
  while (bwHistory.length > 12) bwHistory.shift();

  // CPU% du process : temps CPU consommé / temps réel écoulé (100% = un cœur plein).
  const cu = process.cpuUsage();
  const deltaCpu = (cu.user - lastCpu.user) + (cu.system - lastCpu.system); // micros
  const deltaWall = (now - lastCpuAt) * 1000; // micros
  if (deltaWall > 0) cpuPercent = (deltaCpu / deltaWall) * 100;
  lastCpu = cu;
  lastCpuAt = now;
}, 1000);
if (bwTimer.unref) bwTimer.unref();

// Débit courant en octets/s, moyenné sur ~5 s (0 quand rien ne circule).
function currentBps() {
  if (bwHistory.length < 2) return 0;
  const newest = bwHistory[bwHistory.length - 1];
  let oldest = bwHistory[0];
  for (const h of bwHistory) {
    if (newest.t - h.t <= 5000) { oldest = h; break; }
  }
  const dt = (newest.t - oldest.t) / 1000;
  if (dt <= 0) return 0;
  return Math.max(0, (newest.bytes - oldest.bytes) / dt);
}

// Comptabilise les octets relayés au fil de l'eau (pour la bande passante).
function addBytes(n) {
  s.bytesRelayed += n || 0;
}

function snapshot() {
  return {
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    bandwidthBps: Math.round(currentBps()),      // débit courant en octets/s
    cpuPercent: Math.round(cpuPercent * 10) / 10, // % CPU du process (1 décimale)
    rssBytes: process.memoryUsage().rss           // RAM résidente du process
  };
}

module.exports = { addBytes, snapshot };
