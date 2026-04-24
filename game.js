// GRAVITY DUEL — Platanus Hack 26 Buenos Aires
// Two ships. One black hole. Bend your shots to destroy your rival.

const W = 800, H = 600, SKEY = 'gduel-v2', MAX_HS = 10;
const SHIP_Y = [70, 530], SHIP_W = 28, SHIP_H = 20, DASH_SPD = 900, SHIP_VERT = 62;
const SHIP_SPD = 320, SHIP_VSPD = 200, DASH_DUR = 150, DASH_CD = 1200;
const AI_DIFF = { EASY: { shootChance: 0.04, dodgeRange: 50, aimBonus: 0.5 }, NORMAL: { shootChance: 0.08, dodgeRange: 70, aimBonus: 1 }, HARD: { shootChance: 0.12, dodgeRange: 90, aimBonus: 1.5 } };
const BULL_LIFE = 5000, MAX_BULLS = 4, BULL_SPD = 340, BULL_RAD = 5, SHOOT_CD = 280;
const GRAV_BASE = 900, GRAV_SOFT = 40, WELL_PULSE_SPD = 0.4, WELL_DRIFT = 25;
const HP_MAX = 3, ROUNDS_TO_WIN = 2;
const FINAL_TEN_MS = 10000, CLUTCH_MS = 8000;
const PU_TYPES = ['TRIPLE', 'WARP', 'BOMB', 'REFLECT', 'HOMING'];
const PU_INTERVAL = 12000, PU_DURATION = 5000, SURGE_INTERVAL = 20000, SURGE_DUR = 5000;

const C = {
  bg: 0x0a0a1a, p1: 0x00ffcc, p2: 0xff3388, grav: 0x4466ff, gravDim: 0x223355,
  accent: 0xffff33, danger: 0xff4444, white: 0xffffff, dim: 0x556688,
  dark: 0x111128, panel: 0x0d0d24, hp: 0x44ff66, hpLost: 0x332233,
  shield: 0x44aaff, bomb: 0xaa44ff, triple: 0x44ff44, warp: 0x4488ff,
};

const LETTER_GRID = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z', '.', '-'],
  ['DEL', 'END'],
];

const CABINET_KEYS = {
  P1_U: ['w'], P1_D: ['s'], P1_L: ['a'], P1_R: ['d'],
  P1_1: ['u'], P1_2: ['i'], P1_3: ['o'],
  P1_4: ['j'], P1_5: ['k'], P1_6: ['l'],
  P2_U: ['ArrowUp'], P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'], P2_R: ['ArrowRight'],
  P2_1: ['r'], P2_2: ['t'], P2_3: ['y'],
  P2_4: ['f'], P2_5: ['g'], P2_6: ['h'],
  START1: ['Enter'], START2: ['2'],
};

const KB2ARC = {};
for (const [a, ks] of Object.entries(CABINET_KEYS)) for (const k of ks) KB2ARC[k.length > 1 ? k : k.toLowerCase()] = a;
function normKey(k) { return typeof k === 'string' && k.length ? k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' ? k : k.toLowerCase() : ''; }

const config = {
  type: Phaser.AUTO, width: W, height: H, parent: 'game-root',
  backgroundColor: '#0a0a1a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { preload, create, update },
};
new Phaser.Game(config);

function preload() { }

function create() {
  const s = this;
  s.g = {
    phase: 'title', mode: 0, round: 1, wins: [0, 0], hp: [HP_MAX, HP_MAX],
    ships: [],
    bullets: [], powerups: [], particles: [], stars: [],
    bombs: [],// mini gravity wells from BOMB power-up
    well: { x: W / 2, y: H / 2, mass: GRAV_BASE, surgeEnd: 0, surgeWarn: 0 },
    shake: { x: 0, y: 0, dur: 0, mag: 0 },
    hitstop: { dur: 0, cb: null }, slowmo: { s: 1, dur: 0 },
    flash: { dur: 0, color: C.white },// screen flash
    combo: [0, 0], comboTmr: [0, 0],// combo counter per player
    asteroids: [], nextAst: 0,
    stats: { shots: [0, 0], hits: [0, 0], orbits: [0, 0], maxCombo: [0, 0] },
    shootCd: [0, 0], nextPU: 0, nextSurge: 0, nextEvent: 0,
    sudden: false, lastStand: false,
    timer: 30000,
    attractTmr: 0, idleTmr: 0,
    ai: [null, null], aiDiff: 'NORMAL',
    menu: { cur: 0, cd: 0, sub: null },// sub: null=main, 'diff'=difficulty select
    nameEntry: { letters: [], row: 0, col: 0, cd: 0, ccd: 0 },
    highScores: [], matchWinner: -1, hypeTexts: [],
    musicOn: false, roundTmr: 0, roundSplash: 0,
  };
  // Starfield
  for (let i = 0; i < 90; i++)s.g.stars.push({ x: Math.random() * W, y: Math.random() * H, sp: 0.08 + Math.random() * 0.25, sz: Math.random() < 0.3 ? 1.5 : 1, a: 0.15 + Math.random() * 0.5 });
  s.gfx = s.add.graphics().setDepth(1);
  s.uigfx = s.add.graphics().setDepth(5);
  // Controls
  s.ctrl = { held: {}, pressed: {} };
  const onD = e => { const k = normKey(e.key); const a = KB2ARC[k]; if (a) { if (!s.ctrl.held[a]) s.ctrl.pressed[a] = true; s.ctrl.held[a] = true; } };
  const onU = e => { const k = normKey(e.key); const a = KB2ARC[k]; if (a) s.ctrl.held[a] = false; };
  window.addEventListener('keydown', onD);
  window.addEventListener('keyup', onU);
  s.events.once('shutdown', () => { window.removeEventListener('keydown', onD); window.removeEventListener('keyup', onU); });
  createUI(s);
  showTitle(s);
  loadScores().then(sc => { s.g.highScores = sc; refreshScoreDisplay(s); });
}

function mkShip(idx) {
  return { x: W / 2, y: SHIP_Y[idx], baseY: SHIP_Y[idx], vx: 0, dashCd: 0, dashEnd: 0, invuln: 0, alive: true, pu: null, puEnd: 0, perfectCd: 0 };
}

function update(time, delta) {
  const s = this; if (!s.g) return;
  const g = s.g;
  // Hitstop
  if (g.hitstop.dur > 0) { g.hitstop.dur -= delta; if (g.hitstop.dur <= 0 && g.hitstop.cb) { g.hitstop.cb(); g.hitstop.cb = null; } renderGame(s, time); clrPressed(s); return; }
  let dt = delta / 1000;
  if (g.slowmo.dur > 0) { g.slowmo.dur -= delta; dt *= g.slowmo.s; if (g.slowmo.dur <= 0) g.slowmo.s = 1; }
  // Shake decay
  if (g.shake.dur > 0) { g.shake.dur -= delta; g.shake.x = (Math.random() - 0.5) * g.shake.mag * 2; g.shake.y = (Math.random() - 0.5) * g.shake.mag * 2; g.shake.mag *= 0.9; if (g.shake.dur <= 0) { g.shake.x = 0; g.shake.y = 0; } }
  s.cameras.main.setScroll(g.shake.x, g.shake.y);
  // Flash decay
  if (g.flash.dur > 0) { g.flash.dur -= delta; }
  if (g.phase === 'title') updateTitle(s, time);
  else if (g.phase === 'attract') updateAttract(s, time, dt);
  else if (g.phase === 'playing') updatePlaying(s, time, dt);
  else if (g.phase === 'roundSplash') { renderGame(s, time); updateHUD(s, time); if (time > g.roundSplash) g.phase = 'playing'; }
  else if (g.phase === 'roundEnd') updateRoundEnd(s, time);
  else if (g.phase === 'matchEnd') updateMatchEnd(s, time);
  else if (g.phase === 'scores') updateScoresPhase(s, time);
  else if (g.phase === 'controls') updateControlsPhase(s, time);
  else if (g.phase === 'saved') {/* waitRematch handles via delayedCall */ }
  clrPressed(s);
}

function clrPressed(s) { for (const k in s.ctrl.pressed) s.ctrl.pressed[k] = false; }
function held(s, c) { return s.ctrl.held[c] === true; }
function pressed(s, codes) { for (const c of codes) if (s.ctrl.pressed[c]) { s.ctrl.pressed[c] = false; return true; } return false; }

// ═══════════════ GRAVITY ═══════════════
function wellPos(g, time) {
  const t = time / 1000;
  return { x: W / 2 + Math.sin(t * 0.31) * WELL_DRIFT, y: H / 2 + Math.sin(t * 0.23) * WELL_DRIFT * 0.6 };
}
function wellMass(g, time) {
  const t = time / 1000;
  let m = GRAV_BASE * (0.7 + 0.3 * Math.sin(t * WELL_PULSE_SPD));
  if (time < g.well.surgeEnd) m *= 2.2;
  if (g.sudden) m *= 1.5;
  return m;
}
function applyGravity(bx, by, bvx, bvy, wx, wy, mass, dt) {
  const dx = wx - bx, dy = wy - by;
  const d2 = dx * dx + dy * dy + GRAV_SOFT * GRAV_SOFT;
  const dist = Math.sqrt(d2);
  const f = mass / (d2);
  const ax = f * dx / dist, ay = f * dy / dist;
  return { vx: bvx + ax * dt, vy: bvy + ay * dt };
}
function simTrajectory(sx, sy, svx, svy, wx, wy, mass, steps, stepDt) {
  const pts = [{ x: sx, y: sy }];
  let bx = sx, by = sy, vx = svx, vy = svy;
  for (let i = 0; i < steps; i++) {
    const r = applyGravity(bx, by, vx, vy, wx, wy, mass, stepDt);
    vx = r.vx; vy = r.vy; bx += vx * stepDt; by += vy * stepDt;
    pts.push({ x: bx, y: by });
    if (bx < 0 || bx > W || by < 0 || by > H) break;
  }
  return pts;
}

// ═══════════════ PLAYING ═══════════════
function updatePlaying(s, time, dt) {
  const g = s.g;
  const wp = wellPos(g, time);
  g.well.x = wp.x; g.well.y = wp.y;
  g.well.mass = wellMass(g, time);
  // Gravity surge
  if (time > g.nextSurge && time > g.well.surgeEnd) {
    g.well.surgeEnd = time + SURGE_DUR; g.nextSurge = time + SURGE_INTERVAL;
    addHype(s, 'GRAVITY SURGE', W / 2, H / 2 - 60, C.grav, 2000);
    playSound(s, 'surge');
  }
  // Timer update
  g.timer -= dt * 1000;
  if (!g.finalTen && g.timer <= FINAL_TEN_MS) {
    g.finalTen = true;
    g.well.surgeEnd = Math.max(g.well.surgeEnd, time + 1200);
    addHype(s, 'FINAL TEN', W / 2, H / 2 - 80, C.accent, 1600);
    playSound(s, 'surge');
  }
  if (g.timer <= 0 && !g.sudden) {
    g.timer = 0;
    // Tie breaker if time runs out
    if (g.hp[0] !== g.hp[1]) {
      const loser = g.hp[0] > g.hp[1] ? 1 : 0;
      g.hp[loser] = 0;
      hitShip(s, loser, { orbit: 0 }, time);// fake bullet hit for kill
    } else {
      g.sudden = true;
      g.hp[0] = 1; g.hp[1] = 1;
      addHype(s, 'SUDDEN DEATH', W / 2, H / 2, C.danger, 3000);
      playSound(s, 'surge'); shake(s, 10, 600);
    }
  }
  // Sudden death check
  if (!g.sudden && g.hp[0] === 1 && g.hp[1] === 1) {
    g.sudden = true;
    addHype(s, 'CORE UNSTABLE', W / 2, H / 2, C.danger, 3000);
    playSound(s, 'surge'); shake(s, 10, 600);
  }
  // Shrinking zone during sudden death
  if (g.sudden) {
    g.bounds.left = Math.min(W / 2 - 100, g.bounds.left + dt * 4);
    g.bounds.right = Math.max(W / 2 + 100, g.bounds.right - dt * 4);
  }
  // Last stand
  g.lastStand = g.hp[0] === 1 || g.hp[1] === 1;
  // Random events
  if (time > g.nextEvent && g.nextEvent > 0) {
    const evts = ['SPEED BOOST', 'GRAVITY FLIP', 'DOUBLE FIRE', 'METEOR SHOWER'];
    const ev = evts[Math.floor(Math.random() * evts.length)];
    if (ev === 'SPEED BOOST') { addHype(s, '⚡ SPEED BOOST!', W / 2, H / 2 - 40, C.accent, 2000); for (const b of g.bullets) { b.vx *= 1.4; b.vy *= 1.4; } }
    else if (ev === 'GRAVITY FLIP') { addHype(s, '↕ GRAVITY FLIP!', W / 2, H / 2 - 40, C.grav, 2000); g.well.mass *= -0.8; s.time.delayedCall(4000, () => { g.well.mass = Math.abs(g.well.mass); }); }
    else if (ev === 'METEOR SHOWER') {
      addHype(s, '☄️ METEOR SHOWER!', W / 2, H / 2 - 40, C.danger, 2000); speak('METEOR SHOWER');
      for (let k = 0; k < 20; k++) {
        s.time.delayedCall(k * 150, () => {
          if (s.g.phase === 'playing') s.g.asteroids.push({ x: -50, y: Phaser.Math.Between(0, H), vx: Phaser.Math.Between(300, 600), vy: Phaser.Math.Between(-80, 80), r: Phaser.Math.Between(10, 20), rot: 0, vrot: Math.random() * 10 });
        });
      }
    }
    else { addHype(s, '◆ DOUBLE FIRE!', W / 2, H / 2 - 40, C.triple, 2000); for (let i2 = 0; i2 < 2; i2++) { const sh = g.ships[i2]; if (sh.alive && !sh.pu) { sh.pu = 'TRIPLE'; sh.puEnd = time + 3000; } } }
    if (ev !== 'METEOR SHOWER') { playSound(s, 'powerup'); shake(s, 4, 200); }
    g.nextEvent = time + Phaser.Math.Between(15000, 25000);
  }
  // Update ships
  for (let i = 0; i < 2; i++) {
    const ship = g.ships[i]; if (!ship.alive) continue;
    const isAI = g.ai[i];
    let dir = 0, vdir = 0;
    if (isAI) { dir = aiGetDir(s, i, time); vdir = aiGetVDir(s, i, time); }
    else {
      const lk = i === 0 ? 'P1_L' : 'P2_L', rk = i === 0 ? 'P1_R' : 'P2_R';
      const uk = i === 0 ? 'P1_U' : 'P2_U', dkk = i === 0 ? 'P1_D' : 'P2_D';
      if (held(s, lk)) dir -= 1; if (held(s, rk)) dir += 1;
      if (held(s, uk)) vdir -= 1; if (held(s, dkk)) vdir += 1;
    }
    // Dash
    const dk = i === 0 ? 'P1_2' : 'P2_2';
    if ((isAI ? aiWantDash(s, i, time) : pressed(s, [dk])) && dir !== 0 && time > ship.dashCd) {
      const dashDur = ship.pu === 'WARP' ? DASH_DUR * 1.5 : DASH_DUR;
      const clutchDash = g.timer <= CLUTCH_MS ? 0.88 : 1;
      ship.dashEnd = time + dashDur; ship.dashCd = time + (rubberBand(g, i) ? DASH_CD * 0.8 : DASH_CD) * clutchDash;
      ship.invuln = time + dashDur + (ship.pu === 'WARP' ? 100 : 0);
      playSound(s, 'dash'); shake(s, 2, 80);
      for (let t = 0; t < 3; t++) { const ax = ship.x - dir * (t + 1) * 18; addParticle(s, ax, ship.y, i === 0 ? C.p1 : C.p2, SHIP_W * 0.4, 180 + t * 60, 0); }
    }
    const isDashing = time < ship.dashEnd;
    const spd = isDashing ? DASH_SPD : SHIP_SPD;
    const pullX = g.well.x - ship.x;
    ship.x = Phaser.Math.Clamp(ship.x + dir * spd * dt + Math.sign(pullX) * 25 * dt, g.bounds.left, g.bounds.right);
    // Vertical movement
    const fwd = i === 0 ? 1 : -1;// P1 forward=down, P2 forward=up
    ship.y = Phaser.Math.Clamp(ship.y + vdir * SHIP_VSPD * dt, ship.baseY - 10, ship.baseY + SHIP_VERT * fwd);
    if (dir !== 0 && !isDashing && Math.random() < 0.4) {
      addParticle(s, ship.x - dir * 10, ship.y + (fwd * 10), i === 0 ? C.p1 : C.p2, 3, 150, 0.5);
    }
    if (isDashing && time > ship.perfectCd) {
      for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
        const bb = g.bullets[bi]; if (bb.owner === i) continue;
        const dx = bb.x - ship.x, dy = bb.y - ship.y;
        if (dx * dx + dy * dy < 30 * 30) {
          g.bullets.splice(bi, 1);
          ship.perfectCd = time + 700;
          ship.pu = 'TRIPLE'; ship.puEnd = Math.max(ship.puEnd, time + 1800);
          addHype(s, 'PERFECT DASH', ship.x, ship.y - 28, C.white, 700);
          playSound(s, 'orbit');
          shake(s, 3, 120);
          break;
        }
      }
    }
    // Rubber banding: smaller hitbox if losing
    // Shoot
    const sk = i === 0 ? 'P1_1' : 'P2_1';
    const wantShoot = isAI ? aiWantShoot(s, i, time) : pressed(s, [sk]);
    if (wantShoot && time > g.shootCd[i] && countBullets(g, i) < MAX_BULLS) {
      shoot(s, i, time);
      const comeback = rubberBand(g, i) ? 0.88 : 1;
      const clutch = g.timer <= CLUTCH_MS ? 0.9 : 1;
      g.shootCd[i] = time + SHOOT_CD * comeback * clutch;
    }
    // Power-up timeout
    if (ship.pu && time > ship.puEnd) { ship.pu = null; }
  }
  // Update mini bombs
  for (let i = g.bombs.length - 1; i >= 0; i--) {
    const bm = g.bombs[i]; bm.life -= dt * 1000;
    if (bm.life <= 0) { g.bombs.splice(i, 1); continue; }
  }
  // Spawn asteroids
  if (time > g.nextAst && g.phase === 'playing') {
    const side = Math.random() < 0.5 ? -30 : W + 30;
    const y = Phaser.Math.Between(50, H - 50);
    const vx = (side < 0 ? 1 : -1) * Phaser.Math.Between(60, 140);
    g.asteroids.push({ x: side, y, vx, vy: Phaser.Math.Between(-30, 30), r: Phaser.Math.Between(14, 28), rot: 0, vrot: Phaser.Math.Between(-4, 4) });
    g.nextAst = time + Phaser.Math.Between(3000, 7000);
  }
  // Update asteroids
  for (let i = g.asteroids.length - 1; i >= 0; i--) {
    const a = g.asteroids[i];
    const gv = applyGravity(a.x, a.y, a.vx, a.vy, g.well.x, g.well.y, g.well.mass, dt);
    a.vx = gv.vx; a.vy = gv.vy;
    a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.vrot * dt;
    if (Math.random() < 0.2) addParticle(s, a.x, a.y, C.dim, 3, 200, 0);
    // Swallow by black hole
    const dxWH = a.x - g.well.x, dyWH = a.y - g.well.y;
    if (dxWH * dxWH + dyWH * dyWH < 400) {
      addParticle(s, g.well.x, g.well.y, C.dark, 15, 300, 1);
      g.asteroids.splice(i, 1); continue;
    }
    // Bounce ships
    for (let j = 0; j < 2; j++) {
      const sh = g.ships[j]; if (!sh.alive) continue;
      const dx = sh.x - a.x, dy = sh.y - a.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < a.r + 10) {
        sh.x += dx / dist * 5; sh.y += dy / dist * 5;
      }
    }
    if (a.x < -50 || a.x > W + 50 || a.y < -50 || a.y > H + 50) g.asteroids.splice(i, 1);
  }
  // Combo decay
  for (let i = 0; i < 2; i++) { if (time > g.comboTmr[i]) g.combo[i] = 0; }
  // Update bullets
  for (let i = g.bullets.length - 1; i >= 0; i--) {
    const b = g.bullets[i];
    // Apply main gravity well
    let gv = applyGravity(b.x, b.y, b.vx, b.vy, g.well.x, g.well.y, g.well.mass, dt);
    // Apply mini bomb gravity wells
    for (const bm of g.bombs) {
      gv = applyGravity(b.x, b.y, gv.vx, gv.vy, bm.x, bm.y, bm.mass, dt);
    }
    b.vx = gv.vx; b.vy = gv.vy;
    // Swallow by black hole
    const dxWH = b.x - g.well.x, dyWH = b.y - g.well.y;
    if (dxWH * dxWH + dyWH * dyWH < 225) {
      addParticle(s, g.well.x, g.well.y, 0x000000, 10, 200, 1);
      g.bullets.splice(i, 1); continue;
    }

    if (b.type === 'HOMING') {
      const tgt = g.ships[1 - b.owner];
      if (tgt.alive) {
        const dx = tgt.x - b.x, dy = tgt.y - b.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 300) { b.vx += (dx / dist) * dt * 800; b.vy += (dy / dist) * dt * 800; }
      }
    }
    if (b.dead) continue;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.age += dt * 1000;
    // Track orbit
    const da = Math.atan2(b.y - g.well.y, b.x - g.well.x);
    if (b.lastAngle !== undefined) { let diff = da - b.lastAngle; if (diff > Math.PI) diff -= 2 * Math.PI; if (diff < -Math.PI) diff += 2 * Math.PI; b.orbit += Math.abs(diff); }
    b.lastAngle = da;
    // Trail
    b.trail.push({ x: b.x, y: b.y, t: time });
    if (b.trail.length > 20) b.trail.shift();
    // Remove if OOB or expired
    if (b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30 || b.age > BULL_LIFE) { g.bullets.splice(i, 1); continue; }
    // Hit asteroids
    let hitAst = false;
    for (const a of g.asteroids) {
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx * dx + dy * dy < a.r * a.r) {
        hitAst = true;
        addParticle(s, b.x, b.y, C.dim, 4, 150, 1);
        playSound(s, 'hit');
        g.stats.hits[b.owner]++;
        addHype(s, '+10', a.x, a.y - 10, C.dim, 500);
        if (a.r > 16) {
          g.asteroids.push({ x: a.x, y: a.y, vx: a.vx + Phaser.Math.Between(-30, 30), vy: a.vy - 40, r: a.r * 0.6, rot: a.rot, vrot: a.vrot * 2 });
          g.asteroids.push({ x: a.x, y: a.y, vx: a.vx + Phaser.Math.Between(-30, 30), vy: a.vy + 40, r: a.r * 0.6, rot: a.rot, vrot: -a.vrot * 2 });
        }
        break;
      }
    }
    if (hitAst) { g.bullets.splice(i, 1); continue; }
    // REFLECT: check if bullet hits a ship with REFLECT active
    for (let j = 0; j < 2; j++) {
      if (j === b.owner) continue;
      const ship = g.ships[j]; if (!ship.alive || time < ship.invuln) continue;
      const hbw = SHIP_W / 2 * (rubberBand(g, j) ? 0.85 : 1);
      if (Math.abs(b.x - ship.x) < hbw + b.r && Math.abs(b.y - ship.y) < SHIP_H / 2 + b.r) {
        // REFLECT: deflect the bullet back
        if (ship.pu === 'REFLECT') {
          b.owner = j; b.vy *= -1; b.vx += Phaser.Math.Between(-50, 50);
          ship.pu = null;// consume reflect
          addHype(s, 'REFLECTED!', ship.x, ship.y - 30, C.shield, 1000);
          playSound(s, 'powerup'); shake(s, 4, 150);
          for (let k = 0; k < 6; k++)addParticle(s, ship.x, ship.y, C.shield, 5, 250, 1);
          break;
        }
        hitShip(s, j, b, time); b.dead = true; break;
      }
    }
  }
  g.bullets = g.bullets.filter(b => !b.dead);
  // Bullet vs bullet collision
  for (let i = 0; i < g.bullets.length; i++) {
    for (let j = i + 1; j < g.bullets.length; j++) {
      if (g.bullets[i].owner === g.bullets[j].owner) continue;
      const dx = g.bullets[i].x - g.bullets[j].x, dy = g.bullets[i].y - g.bullets[j].y;
      if (dx * dx + dy * dy < 144) {
        addParticle(s, g.bullets[i].x, g.bullets[i].y, C.white, 6, 200, 1);
        playSound(s, 'hit');
        addHype(s, 'PARRY!', g.bullets[i].x, g.bullets[i].y - 10, C.white, 400);
        g.bullets.splice(j, 1); g.bullets.splice(i, 1);
        i--; break;
      }
    }
  }
  // Near miss detection
  for (const b of g.bullets) {
    const tgt = g.ships[1 - b.owner];
    if (!tgt.alive || time < tgt.invuln) continue;
    const dx = b.x - tgt.x, dy = b.y - tgt.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 35 && dist > SHIP_W / 2 + b.r && !b.nearMissed) {
      b.nearMissed = true;
      addHype(s, 'CLOSE CALL', tgt.x, tgt.y - 30, C.accent, 800);
      playSound(s, 'nearmiss');
    }
  }
  // Power-up spawning
  if (time > g.nextPU && g.powerups.length === 0) {
    spawnPowerup(s, time); g.nextPU = time + PU_INTERVAL;
  }
  // Power-up collection
  for (let i = g.powerups.length - 1; i >= 0; i--) {
    const pu = g.powerups[i];
    if (time > pu.expire) { g.powerups.splice(i, 1); continue; }
    for (let j = 0; j < 2; j++) {
      const ship = g.ships[j]; if (!ship.alive) continue;
      if (Math.abs(pu.x - ship.x) < 30 && Math.abs(pu.y - ship.y) < 30) {
        ship.pu = pu.type; ship.puEnd = time + PU_DURATION;
        g.powerups.splice(i, 1);
        addHype(s, pu.type + '!', ship.x, ship.y - 25, C.accent, 1000);
        playSound(s, 'powerup'); shake(s, 3, 100);
        break;
      }
    }
  }
  // Update particles
  updateParticles(s, time, dt);
  // Update hype texts
  for (let i = g.hypeTexts.length - 1; i >= 0; i--) { const h = g.hypeTexts[i]; h.life -= dt * 1000; h.y -= dt * 30; if (h.life <= 0) g.hypeTexts.splice(i, 1); }
  // Pause
  if (pressed(s, ['START1', 'START2'])) { g.phase = 'title'; showTitle(s); return; }
  renderGame(s, time);
  updateHUD(s, time);
}

function rubberBand(g, idx) { return g.hp[idx] < g.hp[1 - idx]; }
function countBullets(g, owner) { let c = 0; for (const b of g.bullets) if (b.owner === owner) c++; return c; }

function shoot(s, idx, time) {
  const g = s.g, ship = g.ships[idx];
  const clutchPow = g.timer <= CLUTCH_MS ? 1.18 : 1;
  const vy = (idx === 0 ? BULL_SPD : -BULL_SPD) * clutchPow;
  if (ship.pu === 'TRIPLE') {
    for (let a = -0.3; a <= 0.3; a += 0.3) {
      g.bullets.push(mkBullet(ship.x, ship.y, Math.sin(a) * BULL_SPD * 0.5, vy * Math.cos(a), idx, null, BULL_RAD));
    }
  } else if (ship.pu === 'BOMB') {
    g.bullets.push(mkBullet(ship.x, ship.y, 0, vy, idx, null, BULL_RAD));
    g.bombs.push({ x: ship.x, y: ship.y + (idx === 0 ? 60 : -60), mass: 500, life: 3000, owner: idx });
    ship.pu = null;
    addHype(s, 'GRAVITY BOMB!', ship.x, ship.y + (idx === 0 ? 40 : -40), C.bomb, 1200);
    playSound(s, 'surge'); shake(s, 5, 200);
    for (let k = 0; k < 8; k++)addParticle(s, ship.x, ship.y + (idx === 0 ? 60 : -60), C.bomb, 6, 400, 1);
  } else if (ship.pu === 'HOMING') {
    g.bullets.push(mkBullet(ship.x, ship.y, 0, vy, idx, 'HOMING', BULL_RAD));
  } else {
    g.bullets.push(mkBullet(ship.x, ship.y, 0, vy, idx, null, BULL_RAD));
  }
  g.stats.shots[idx]++;
  playSound(s, 'shoot'); shake(s, 1.5, 50);
  addParticle(s, ship.x, ship.y + (idx === 0 ? 10 : -10), idx === 0 ? C.p1 : C.p2, 4, 150, 1);
}

function mkBullet(x, y, vx, vy, owner, type, r) {
  return { x, y, vx, vy, owner, type, r, age: 0, trail: [], orbit: 0, lastAngle: undefined, nearMissed: false };
}

function hitShip(s, idx, bullet, time) {
  const g = s.g;
  g.hp[idx]--;
  const ship = g.ships[idx];
  ship.invuln = time + 1000;
  const attacker = 1 - idx;
  // Combo & Hype Text
  addHype(s, '+50', ship.x, ship.y - 20, C.white, 600);
  g.stats.hits[attacker]++;
  g.combo[attacker]++; g.comboTmr[attacker] = time + 2000;
  g.stats.maxCombo[attacker] = Math.max(g.stats.maxCombo[attacker], g.combo[attacker]);
  if (g.combo[attacker] >= 2) {
    addHype(s, 'COMBO x' + g.combo[attacker] + '!', ship.x, ship.y - 55, C.accent, 1000);
  }
  // Orbit shot?
  if (bullet.orbit > Math.PI) {
    g.stats.orbits[attacker]++;
    addHype(s, 'ORBIT SHOT! +200', ship.x, ship.y - 40, C.accent, 1500);
    playSound(s, 'orbit');
  }
  // Particles
  const col = idx === 0 ? C.p1 : C.p2;
  for (let i = 0; i < 12; i++)addParticle(s, ship.x, ship.y, col, 6, 400, 1);
  playSound(s, 'hit');
  if (g.hp[idx] <= 0) {
    // Kill!
    ship.alive = false;
    shake(s, 14, 500);
    g.flash = { dur: 200, color: C.white };// screen flash
    for (let i = 0; i < 25; i++)addParticle(s, ship.x, ship.y, col, 8, 600, 1);
    for (let i = 0; i < 15; i++)addParticle(s, ship.x, ship.y, C.white, 5, 500, 1);
    // Concentric explosion rings
    for (let r = 0; r < 3; r++)addParticle(s, ship.x + Phaser.Math.Between(-20, 20), ship.y + Phaser.Math.Between(-15, 15), C.accent, 12 - r * 3, 350 + r * 100, 0.5);
    playSound(s, 'kill');
    // Cinematic Slow-mo + Zoom
    g.hitstop.dur = 130;
    const hitTime = time;
    g.hitstop.cb = () => {
      g.slowmo.s = 0.1; g.slowmo.dur = 1500;
      s.cameras.main.zoomTo(1.5, 150);
      s.cameras.main.pan(ship.x, ship.y, 150);
      s.time.delayedCall(1500, () => {
        s.cameras.main.zoomTo(1, 200);
        s.cameras.main.pan(W / 2, H / 2, 200);
        endRound(s, hitTime);
      });
    };
  } else {
    shake(s, 8, 250);
    g.flash = { dur: 80, color: idx === 0 ? C.p1 : C.p2 };
    g.hitstop.dur = 60; g.hitstop.cb = null;
  }
}

function endRound(s, time) {
  const g = s.g;
  const winner = g.hp[0] <= 0 ? 1 : 0;
  g.wins[winner]++;
  g.roundTmr = time + 2500;
  g.phase = 'roundEnd';
  const wt = winner === 0 ? 'P1' : 'P2';
  addHype(s, wt + ' WINS ROUND', W / 2, H / 2, winner === 0 ? C.p1 : C.p2, 2000);
}

function updateRoundEnd(s, time) {
  renderGame(s, time); updateHUD(s, time);
  if (time > s.g.roundTmr) {
    const g = s.g;
    if (g.wins[0] >= ROUNDS_TO_WIN || g.wins[1] >= ROUNDS_TO_WIN) {
      g.matchWinner = g.wins[0] >= ROUNDS_TO_WIN ? 0 : 1;
      g.phase = 'matchEnd'; g.roundTmr = time;
      showMatchEnd(s);
    } else {
      g.round++; startRound(s, time);
    }
  }
}

function startRound(s, time) {
  const g = s.g;
  g.hp = [HP_MAX, HP_MAX]; g.ships = [mkShip(0), mkShip(1)];
  g.bullets = []; g.powerups = []; g.bombs = []; g.asteroids = []; g.sudden = false; g.lastStand = false;
  g.combo = [0, 0]; g.comboTmr = [0, 0]; g.timer = 30000;
  g.bounds = { left: 50, right: W - 50 };
  // Progressive difficulty scaling per round
  const massScale = 1 + (g.round - 1) * 0.15;
  g.well.mass = GRAV_BASE * massScale;
  g.nextPU = time + PU_INTERVAL * 0.5; g.nextSurge = time + SURGE_INTERVAL;
  g.nextEvent = time + Phaser.Math.Between(12000, 20000);
  g.nextAst = time + Phaser.Math.Between(3000, 6000);
  g.finalTen = false;
  g.well.surgeEnd = 0;
  // Round splash
  g.phase = 'roundSplash'; g.roundSplash = time + 1500;
  addHype(s, 'ROUND ' + g.round, W / 2, H / 2 - 20, C.white, 1400);
  addHype(s, 'FIGHT!', W / 2, H / 2 + 25, C.accent, 1200);
  speak('ROUND ' + g.round + ', FIGHT');
  playSound(s, 'select');
}

function startMatch(s, mode, time) {
  const g = s.g;
  g.mode = mode; g.round = 1; g.wins = [0, 0];
  g.ai = [null, null];
  g.stats = { shots: [0, 0], hits: [0, 0], orbits: [0, 0], maxCombo: [0, 0] };
  if (mode === 1) g.ai[1] = { cd: 0, tgt: W / 2, dodgeCd: 0, diff: AI_DIFF[g.aiDiff] };
  g.hypeTexts = []; g.bullets = []; g.powerups = []; g.particles = []; g.bombs = []; g.asteroids = [];
  startRound(s, time || 0);
  hideAllScreens(s);
  startMusic(s);
}

// ═══════════════ POWER-UPS ═══════════════
function spawnPowerup(s, time) {
  const g = s.g;
  const type = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
  const x = W / 2 + Phaser.Math.Between(-120, 120);
  const y = H / 2 + Phaser.Math.Between(-40, 40);
  g.powerups.push({ x, y, type, expire: time + 8000, born: time });
}

// ═══════════════ AI ═══════════════
function aiGetDir(s, idx, time) {
  const g = s.g, ai = g.ai[idx], ship = g.ships[idx];
  if (!ai) return 0;
  const diff = ai.diff || AI_DIFF.NORMAL;
  let dodge = 0, closestDanger = 999;
  for (const b of g.bullets) {
    if (b.owner === idx) continue;
    const futureSteps = 8;
    let fx = b.x, fy = b.y, fvx = b.vx, fvy = b.vy;
    for (let s2 = 0; s2 < futureSteps; s2++) {
      const gv = applyGravity(fx, fy, fvx, fvy, g.well.x, g.well.y, g.well.mass, 0.016);
      fvx = gv.vx; fvy = gv.vy; fx += fvx * 0.016; fy += fvy * 0.016;
    }
    const dy = Math.abs(ship.y - fy);
    const dx = fx - ship.x;
    if (dy < diff.dodgeRange && Math.abs(dx) < diff.dodgeRange && dy < closestDanger) {
      closestDanger = dy; dodge = dx > 0 ? -1 : 1;
    }
  }
  if (dodge !== 0) return dodge;
  if (time > ai.cd) {
    const enemy = g.ships[1 - idx];
    const gOffset = (g.well.x - W / 2) * 0.3 * diff.aimBonus;
    ai.tgt = enemy.x + gOffset + Phaser.Math.Between(-100 + diff.aimBonus * 20, 100 - diff.aimBonus * 20);
    ai.tgt = Phaser.Math.Clamp(ai.tgt, 80, W - 80);
    ai.cd = time + Phaser.Math.Between(300, 1000);
  }
  const d = ai.tgt - ship.x;
  if (Math.abs(d) < 10) return 0;
  return d > 0 ? 1 : -1;
}
function aiGetVDir(s, idx, time) {
  const g = s.g, ai = g.ai[idx], ship = g.ships[idx];
  if (!ai) return 0;
  const diff = ai.diff || AI_DIFF.NORMAL;
  const fwd = idx === 0 ? 1 : -1;
  let panic = 0;
  for (const b of g.bullets) {
    if (b.owner === idx) continue;
    const dx = Math.abs(b.x - ship.x);
    const dy = b.y - ship.y;
    if (dx < 55 && Math.abs(dy) < 70) {
      const fromFront = (fwd === 1 && dy > 0) || (fwd === -1 && dy < 0);
      if (fromFront) panic += 1;
    }
  }
  if (panic > 0) {
    const back = ship.baseY - fwd * 8;
    const dBack = back - ship.y;
    return Math.abs(dBack) < 4 ? 0 : dBack > 0 ? 1 : -1;
  }
  if (time > (ai.vCd || 0)) {
    const enemy = g.ships[1 - idx];
    const advBase = ship.baseY + fwd * SHIP_VERT * 0.58;
    const pressure = Phaser.Math.Clamp(Math.abs(enemy.x - ship.x) / 260, 0, 1);
    const jitter = Phaser.Math.Between(-6, 6) * (2 - diff.aimBonus);
    ai.vTgt = advBase - fwd * (12 * pressure) + jitter;
    ai.vCd = time + Phaser.Math.Between(260, 700);
  }
  const minY = ship.baseY - 10, maxY = ship.baseY + SHIP_VERT * fwd;
  const tgtY = Phaser.Math.Clamp(ai.vTgt || ship.baseY, Math.min(minY, maxY), Math.max(minY, maxY));
  const d = tgtY - ship.y;
  if (Math.abs(d) < 4) return 0;
  return d > 0 ? 1 : -1;
}
function aiWantShoot(s, idx, time) {
  const g = s.g, ai = g.ai[idx];
  if (!ai || countBullets(g, idx) >= MAX_BULLS) return false;
  const diff = ai.diff || AI_DIFF.NORMAL;
  const ship = g.ships[idx], enemy = g.ships[1 - idx];
  const vy = idx === 0 ? BULL_SPD : -BULL_SPD;
  const pts = simTrajectory(ship.x, ship.y, 0, vy, g.well.x, g.well.y, g.well.mass, 25, 0.016);
  let willHit = false;
  for (const p of pts) { if (Math.abs(p.x - enemy.x) < 50 && Math.abs(p.y - enemy.y) < 40) { willHit = true; break; } }
  if (willHit) return Math.random() < diff.shootChance;
  return Math.random() < diff.shootChance * 0.15;
}
function aiWantDash(s, idx, time) {
  const g = s.g, ai = g.ai[idx], ship = g.ships[idx];
  if (!ai || time < ship.dashCd) return false;
  for (const b of g.bullets) {
    if (b.owner === idx) continue;
    const dy = Math.abs(ship.y - b.y);
    if (dy < 50 && Math.abs(b.x - ship.x) < 40) return true;
  }
  return false;
}

// ═══════════════ PARTICLES ═══════════════
function addParticle(s, x, y, color, size, life, spread) {
  const angle = Math.random() * Math.PI * 2;
  const speed = spread * (30 + Math.random() * 80);
  s.g.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, size, life, maxLife: life });
}
function updateParticles(s, time, dt) {
  const ps = s.g.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1000;
    p.vx *= 0.96; p.vy *= 0.96;
    if (p.life <= 0) ps.splice(i, 1);
  }
}
function addHype(s, text, x, y, color, life) {
  s.g.hypeTexts.push({ text, x, y, color, life, maxLife: life });
}
function shake(s, mag, dur) { s.g.shake.mag = Math.max(s.g.shake.mag, mag); s.g.shake.dur = Math.max(s.g.shake.dur, dur); }
// ═══════════════ RENDERING ═══════════════
function renderGame(s, time) {
  const g = s.g, gfx = s.gfx;
  gfx.clear();
  const t = (time || 0) / 1000;
  // Stars with parallax
  for (const st of g.stars) {
    st.y += st.sp; if (st.y > H) st.y = 0;
    // Parallax from shake
    const px = st.x + g.shake.x * st.sz * 0.3;
    const py = st.y + g.shake.y * st.sz * 0.3;
    gfx.fillStyle(C.white, st.a * (g.lastStand ? 0.6 + 0.4 * Math.sin(t * 8) : 1));
    gfx.fillCircle(px, py, st.sz);
  }
  // Zone divider lines
  gfx.lineStyle(1, C.p1, 0.12);
  gfx.lineBetween(40, SHIP_Y[0] + SHIP_H, W - 40, SHIP_Y[0] + SHIP_H);
  gfx.lineStyle(1, C.p2, 0.12);
  gfx.lineBetween(40, SHIP_Y[1] - SHIP_H, W - 40, SHIP_Y[1] - SHIP_H);
  // Shrinking zone bounds
  if (g.bounds.left > 50 || g.bounds.right < W - 50) {
    gfx.lineStyle(2, C.danger, 0.4 + 0.2 * Math.sin(t * 8));
    gfx.lineBetween(g.bounds.left, 0, g.bounds.left, H);
    gfx.lineBetween(g.bounds.right, 0, g.bounds.right, H);
    gfx.fillStyle(C.danger, 0.05);
    gfx.fillRect(0, 0, g.bounds.left, H);
    gfx.fillRect(g.bounds.right, 0, W - g.bounds.right, H);
  }
  // Field lines around gravity well
  const wx = g.well.x, wy = g.well.y;
  const mFrac = g.well.mass / GRAV_BASE;
  for (let i = 0; i < 8; i++) {
    const baseA = i * Math.PI / 4 + t * 0.15;
    gfx.lineStyle(1, C.gravDim, 0.15 * mFrac);
    gfx.beginPath();
    for (let r = 30; r < 160; r += 4) {
      const spiral = baseA + r * 0.008 * mFrac;
      const px = wx + Math.cos(spiral) * r;
      const py = wy + Math.sin(spiral) * r;
      if (r === 30) gfx.moveTo(px, py); else gfx.lineTo(px, py);
    }
    gfx.strokePath();
  }
  // Gravity well core & Black Hole Singularity
  const wellPulse = 0.7 + 0.3 * Math.sin(t * 3);
  gfx.fillStyle(0x000000, 1); gfx.fillCircle(wx, wy, 14 * mFrac); // black hole
  gfx.lineStyle(2, C.grav, 0.8 * wellPulse); gfx.strokeCircle(wx, wy, 14 * mFrac);

  // Accretion disk
  gfx.fillStyle(C.grav, 0.8);
  for (let i = 0; i < 12; i++) {
    const ang = t * 4 + i * Math.PI / 6;
    const rad = 16 * mFrac + 4 * Math.sin(t * 8 + i);
    gfx.fillCircle(wx + Math.cos(ang) * rad, wy + Math.sin(ang) * rad, 1.5);
  }

  for (let r = 3; r >= 0; r--) {
    const rad = 16 + r * 12 * mFrac * wellPulse;
    gfx.fillStyle(C.grav, 0.08 - r * 0.015);
    gfx.fillCircle(wx, wy, rad);
  }
  gfx.fillStyle(C.white, 0.6 * wellPulse);
  gfx.fillCircle(wx, wy, 4);
  // Surge warning
  if (time && time < g.well.surgeEnd) {
    const sa = 0.15 + 0.15 * Math.sin(t * 10);
    gfx.lineStyle(2, C.accent, sa);
    gfx.strokeCircle(wx, wy, 50 + 20 * Math.sin(t * 5));
  }
  // Trajectory preview
  if (g.phase === 'playing' || g.phase === 'roundSplash') {
    for (let i = 0; i < 2; i++) {
      const ship = g.ships[i]; if (!ship.alive) continue;
      if (g.ai[i]) continue;// No preview for AI
      const vy = i === 0 ? BULL_SPD : -BULL_SPD;
      const pts = simTrajectory(ship.x, ship.y, 0, vy, wx, wy, g.well.mass, 40, 0.016);
      gfx.lineStyle(1, i === 0 ? C.p1 : C.p2, 0.2);
      for (let j = 1; j < pts.length; j += 2) {
        gfx.fillStyle(i === 0 ? C.p1 : C.p2, 0.15 * (1 - j / pts.length));
        gfx.fillCircle(pts[j].x, pts[j].y, 2);
      }
    }
  }
  // Power-ups
  for (const pu of g.powerups) {
    const col = pu.type === 'TRIPLE' ? C.triple : pu.type === 'WARP' ? C.warp : pu.type === 'BOMB' ? C.bomb : pu.type === 'HOMING' ? C.p1 : C.shield;
    const pulse = 0.7 + 0.3 * Math.sin(t * 5);
    gfx.fillStyle(col, 0.3 * pulse); gfx.fillCircle(pu.x, pu.y, 18);
    gfx.fillStyle(col, 0.8); gfx.fillCircle(pu.x, pu.y, 8);
    gfx.lineStyle(1, C.white, 0.5 * pulse); gfx.strokeCircle(pu.x, pu.y, 14 + 4 * Math.sin(t * 4));
  }
  // Bullets
  for (const b of g.bullets) {
    const col = b.owner === 0 ? C.p1 : C.p2;
    // Trail
    for (let i = 0; i < b.trail.length; i++) {
      const tp = b.trail[i];
      const a = i / b.trail.length * 0.4;
      gfx.fillStyle(col, a);
      gfx.fillCircle(tp.x, tp.y, b.r * (i / b.trail.length) * 0.8);
    }
    // Bullet core
    gfx.fillStyle(col, 0.9); gfx.fillCircle(b.x, b.y, b.r);
    gfx.fillStyle(C.white, 0.6); gfx.fillCircle(b.x, b.y, b.r * 0.4);
  }
  // Ships
  for (let i = 0; i < 2; i++) {
    const ship = g.ships[i]; if (!ship.alive) {
      // Death ring expands after death
      if (time && time < ship.invuln) {
        const dt2 = (ship.invuln - time) / 1000;// 1s to 0s
        const r = 200 - (dt2 * 200);
        gfx.lineStyle(2, i === 0 ? C.p1 : C.p2, dt2);
        gfx.strokeCircle(ship.x, ship.y, r);
      }
      continue;
    }
    const col = i === 0 ? C.p1 : C.p2;
    const flash = time && time < ship.invuln && Math.floor(t * 12) % 2 === 0;
    if (flash) continue;
    const dir = i === 0 ? 1 : -1;
    const sx = ship.x, sy = ship.y;
    // Triangle ship
    gfx.fillStyle(col, 0.9);
    gfx.fillTriangle(sx, sy + dir * SHIP_H / 2, sx - SHIP_W / 2, sy - dir * SHIP_H / 2, sx + SHIP_W / 2, sy - dir * SHIP_H / 2);
    // Engine glow
    gfx.fillStyle(col, 0.3);
    gfx.fillCircle(sx, sy - dir * SHIP_H / 2, 8 + 3 * Math.sin(t * 8));
    // Power-up indicator
    if (ship.pu) {
      const pcol = ship.pu === 'TRIPLE' ? C.triple : ship.pu === 'WARP' ? C.warp : ship.pu === 'BOMB' ? C.bomb : ship.pu === 'HOMING' ? C.p1 : C.shield;
      gfx.lineStyle(2, pcol, 0.6 + 0.4 * Math.sin(t * 6));
      gfx.strokeCircle(sx, sy, 22);
    }
  }
  // Particles
  for (const p of g.particles) {
    const a = p.life / p.maxLife;
    gfx.fillStyle(p.color, a * 0.8);
    gfx.fillCircle(p.x, p.y, p.size * a);
  }
  // Last stand screen edge pulse
  if (g.lastStand && g.phase === 'playing') {
    const la = 0.08 + 0.05 * Math.sin(t * 6);
    const lc = g.hp[0] === 1 ? C.p1 : C.p2;
    gfx.fillStyle(lc, la);
    gfx.fillRect(0, 0, W, 4); gfx.fillRect(0, H - 4, W, 4);
    gfx.fillRect(0, 0, 4, H); gfx.fillRect(W - 4, 0, 4, H);
  }
  // Mini bombs
  for (const bm of g.bombs) {
    const ba = bm.life / 3000;
    gfx.fillStyle(C.bomb, 0.15 * ba); gfx.fillCircle(bm.x, bm.y, 30 * ba);
    gfx.fillStyle(C.bomb, 0.5 * ba); gfx.fillCircle(bm.x, bm.y, 8 * ba);
    gfx.lineStyle(1, C.bomb, 0.3 * ba); gfx.strokeCircle(bm.x, bm.y, 20 * ba + 5 * Math.sin(t * 8));
    // Mini field lines
    for (let i = 0; i < 4; i++) {
      const a2 = i * Math.PI / 2 + t * 0.5;
      gfx.lineStyle(1, C.bomb, 0.1 * ba);
      gfx.lineBetween(bm.x + Math.cos(a2) * 12, bm.y + Math.sin(a2) * 12, bm.x + Math.cos(a2) * 28, bm.y + Math.sin(a2) * 28);
    }
  }
  // Asteroids
  for (const a of g.asteroids) {
    gfx.fillStyle(C.dark, 0.9);
    gfx.lineStyle(1, C.dim, 0.8);
    gfx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = a.rot + i * Math.PI / 3;
      const r = a.r * (0.8 + 0.4 * (i % 2));
      const px = a.x + Math.cos(ang) * r;
      const py = a.y + Math.sin(ang) * r;
      if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
    }
    gfx.closePath();
    gfx.fillPath(); gfx.strokePath();
  }
  // Screen flash overlay
  if (g.flash.dur > 0) {
    const fa = Math.min(0.5, g.flash.dur / 100);
    gfx.fillStyle(g.flash.color, fa);
    gfx.fillRect(0, 0, W, H);
  }
  // Hype texts (drawn on ui graphics)
  s.uigfx.clear();
}

// ═══════════════ HUD ═══════════════
function createUI(s) {
  s.ui = {};
  // CRT Scanlines
  const scanlines = s.add.graphics().setDepth(30);
  scanlines.fillStyle(0x000000, 0.25);
  for (let y = 0; y < H; y += 3) { scanlines.fillRect(0, y, W, 1); }
  // HP displays
  s.ui.hp1 = s.add.text(30, 15, '', { fontFamily: 'monospace', fontSize: '16px', color: '#00ffcc', fontStyle: 'bold' }).setDepth(10);
  s.ui.hp2 = s.add.text(W - 30, H - 15, '', { fontFamily: 'monospace', fontSize: '16px', color: '#ff3388', fontStyle: 'bold' }).setDepth(10).setOrigin(1, 1);
  s.ui.timer = s.add.text(W / 2, H / 2, '', { fontFamily: 'monospace', fontSize: '48px', color: '#ffffff', fontStyle: 'bold', alpha: 0.1 }).setDepth(0).setOrigin(0.5);
  s.ui.round = s.add.text(W / 2, 15, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'center' }).setDepth(10).setOrigin(0.5, 0);
  s.ui.wins = s.add.text(W / 2, H - 15, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'center' }).setDepth(10).setOrigin(0.5, 1);
  s.ui.p1State = s.add.text(30, 38, '', { fontFamily: 'monospace', fontSize: '11px', color: '#66ffee' }).setDepth(10);
  s.ui.p2State = s.add.text(W - 30, H - 36, '', { fontFamily: 'monospace', fontSize: '11px', color: '#ff88bb' }).setDepth(10).setOrigin(1, 1);
  s.ui.hypeLayer = [];
  for (let i = 0; i < 5; i++) {
    const t = s.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', align: 'center' }).setDepth(12).setOrigin(0.5).setVisible(false);
    s.ui.hypeLayer.push(t);
  }
  // Title screen
  s.ui.titleC = s.add.container(0, 0).setDepth(20);
  const tb = s.add.rectangle(W / 2, H / 2, W, H, C.bg, 0.97);
  s.ui.titleC.add(tb);
  s.ui.titleT1 = s.add.text(W / 2, 100, 'GRAVITY', { fontFamily: 'monospace', fontSize: '52px', color: '#00ffcc', fontStyle: 'bold' }).setOrigin(0.5);
  s.ui.titleT2 = s.add.text(W / 2, 155, 'DUEL', { fontFamily: 'monospace', fontSize: '52px', color: '#ff3388', fontStyle: 'bold' }).setOrigin(0.5);
  s.tweens.add({ targets: s.ui.titleT1, y: 97, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  s.tweens.add({ targets: s.ui.titleT2, y: 158, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 200 });
  const sub = s.add.text(W / 2, 200, 'BEND YOUR SHOTS THROUGH GRAVITY', { fontFamily: 'monospace', fontSize: '11px', color: '#556688' }).setOrigin(0.5);
  s.ui.titleC.add(s.ui.titleT1); s.ui.titleC.add(s.ui.titleT2); s.ui.titleC.add(sub);
  // Menu buttons
  s.ui.menuBtns = [];
  const labels = ['1 PLAYER', '2 PLAYERS', 'CONTROLS', 'SCORES'];
  for (let i = 0; i < 4; i++) {
    const y = 230 + i * 38;
    const bg = s.add.rectangle(W / 2, y, 240, 32, C.dark, 0.95).setStrokeStyle(2, C.dim, 0.6);
    const lb = s.add.text(W / 2, y, labels[i], { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    s.ui.titleC.add(bg); s.ui.titleC.add(lb);
    s.ui.menuBtns.push({ bg, lb });
  }
  // Difficulty indicator
  s.ui.diffLabel = s.add.text(W / 2, 435, 'AI: NORMAL', { fontFamily: 'monospace', fontSize: '12px', color: '#ffff33' }).setOrigin(0.5);
  s.ui.titleC.add(s.ui.diffLabel);
  const ctrl = s.add.text(W / 2, 455, '◄► MOVE   ▲▼ ADVANCE   ● SHOOT   ●● DASH', { fontFamily: 'monospace', fontSize: '10px', color: '#334466' }).setOrigin(0.5);
  s.ui.titleC.add(ctrl);
  s.ui.titleScores = s.add.text(W / 2, 490, '', { fontFamily: 'monospace', fontSize: '12px', color: '#556688', align: 'center' }).setOrigin(0.5, 0);
  s.ui.titleC.add(s.ui.titleScores);
  const pressStart = s.add.text(W / 2, H - 30, 'PRESS START', { fontFamily: 'monospace', fontSize: '14px', color: '#ffff33' }).setOrigin(0.5);
  s.tweens.add({ targets: pressStart, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
  s.ui.titleC.add(pressStart);
  s.ui.titleC.setVisible(false);
  // Match end screen
  s.ui.endC = s.add.container(0, 0).setDepth(22);
  s.ui.endC.add(s.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.92));
  s.ui.endTitle = s.add.text(W / 2, 80, '', { fontFamily: 'monospace', fontSize: '36px', fontStyle: 'bold' }).setOrigin(0.5);
  s.ui.endSummary = s.add.text(W / 2, 130, '', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', align: 'center' }).setOrigin(0.5);
  s.ui.endNameLabel = s.add.text(W / 2, 175, 'ENTER YOUR INITIALS', { fontFamily: 'monospace', fontSize: '12px', color: '#556688' }).setOrigin(0.5);
  s.ui.endNameVal = s.add.text(W / 2, 210, '_ _ _', { fontFamily: 'monospace', fontSize: '32px', color: '#ffff33', fontStyle: 'bold', letterSpacing: 8 }).setOrigin(0.5);
  s.ui.endC.add(s.ui.endTitle); s.ui.endC.add(s.ui.endSummary); s.ui.endC.add(s.ui.endNameLabel); s.ui.endC.add(s.ui.endNameVal);
  // Letter grid
  s.ui.gridItems = [];
  for (let row = 0; row < LETTER_GRID.length; row++) {
    const rv = LETTER_GRID[row]; const rw = rv.length * 52;
    for (let col = 0; col < rv.length; col++) {
      const v = rv[col]; const cx = W / 2 - rw / 2 + 26 + col * 52; const cy = 280 + row * 28;
      const bg = s.add.rectangle(cx, cy, v.length > 1 ? 58 : 40, 24, C.dark, 0.9).setStrokeStyle(1, C.dim, 0.5);
      const lb = s.add.text(cx, cy, v, { fontFamily: 'monospace', fontSize: v.length > 1 ? '12px' : '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      s.ui.endC.add(bg); s.ui.endC.add(lb);
      s.ui.gridItems.push({ bg, lb, row, col, v });
    }
  }
  s.ui.endInstruct = s.add.text(W / 2, 250, 'MOVE ◄►▲▼   SELECT ●', { fontFamily: 'monospace', fontSize: '10px', color: '#334466' }).setOrigin(0.5);
  s.ui.endC.add(s.ui.endInstruct);
  s.ui.endScores = s.add.text(W / 2, 440, '', { fontFamily: 'monospace', fontSize: '12px', color: '#556688', align: 'center', lineSpacing: 4 }).setOrigin(0.5, 0);
  s.ui.endC.add(s.ui.endScores);
  s.ui.endStatus = s.add.text(W / 2, H - 20, '', { fontFamily: 'monospace', fontSize: '11px', color: '#ffff33' }).setOrigin(0.5);
  s.ui.endC.add(s.ui.endStatus);
  s.ui.endC.setVisible(false);
  // Scores screen
  s.ui.scoresC = s.add.container(0, 0).setDepth(22);
  s.ui.scoresC.add(s.add.rectangle(W / 2, H / 2, W, H, C.bg, 0.98));
  s.ui.scoresC.add(s.add.text(W / 2, 80, 'LEADERBOARD', { fontFamily: 'monospace', fontSize: '30px', color: '#ffff33', fontStyle: 'bold' }).setOrigin(0.5));
  s.ui.scoresList = s.add.text(W / 2, 150, '', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', align: 'center', lineSpacing: 10 }).setOrigin(0.5, 0);
  s.ui.scoresC.add(s.ui.scoresList);
  s.ui.scoresC.add(s.add.text(W / 2, H - 30, 'PRESS START TO GO BACK', { fontFamily: 'monospace', fontSize: '12px', color: '#334466' }).setOrigin(0.5));
  s.ui.scoresC.setVisible(false);
  // Controls screen
  s.ui.ctrlC = s.add.container(0, 0).setDepth(22);
  s.ui.ctrlC.add(s.add.rectangle(W / 2, H / 2, W, H, C.bg, 0.98));
  s.ui.ctrlC.add(s.add.text(W / 2, 60, 'CONTROLS', { fontFamily: 'monospace', fontSize: '30px', color: '#ffff33', fontStyle: 'bold' }).setOrigin(0.5));
  const cLines = [
    '           P1            P2',
    '',
    'MOVE      A / D        ← / →',
    'ADVANCE   W / S        ↑ / ↓',
    'SHOOT       U            R',
    'DASH        I            T',
    '',
    'PAUSE / MENU        ENTER',
    '',
    '─── POWER-UPS ───',
    'TRIPLE   3-way shot (5s)',
    'WARP     Longer invuln dash',
    'BOMB     Mini gravity well',
    'REFLECT  Deflects 1 bullet',
    '',
    '─── EVENTS ───',
    'GRAVITY SURGE  Well power x2',
    'SPEED BOOST    All bullets +40%',
    'GRAVITY FLIP   Repels instead!',
    'CORE UNSTABLE  Both at 1HP!',
  ];
  s.ui.ctrlC.add(s.add.text(W / 2, 110, cLines.join('\n'), { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'center', lineSpacing: 4 }).setOrigin(0.5, 0));
  s.ui.ctrlC.add(s.add.text(W / 2, H - 30, 'PRESS START TO GO BACK', { fontFamily: 'monospace', fontSize: '12px', color: '#334466' }).setOrigin(0.5));
  s.ui.ctrlC.setVisible(false);
  // Attract mode overlay
  s.ui.attractText = s.add.text(W / 2, H - 50, 'INSERT COIN / PRESS START', { fontFamily: 'monospace', fontSize: '18px', color: '#ffff33', fontStyle: 'bold' }).setOrigin(0.5).setDepth(15).setVisible(false);
  s.tweens.add({ targets: s.ui.attractText, alpha: 0.15, duration: 500, yoyo: true, repeat: -1 });
}

function updateHUD(s, time) {
  const g = s.g;
  if (g.phase !== 'playing' && g.phase !== 'roundEnd' && g.phase !== 'attract') return;
  // HP hearts
  let h1 = '', h2 = '';
  for (let i = 0; i < HP_MAX; i++) { h1 += i < g.hp[0] ? '♥' : '♡'; h2 += i < g.hp[1] ? '♥' : '♡'; }
  s.ui.hp1.setText('P1 ' + h1);
  s.ui.hp2.setText('P2 ' + h2);
  s.ui.round.setText('ROUND ' + g.round);
  // Timer
  const tmS = Math.ceil(g.timer / 1000);
  s.ui.timer.setText(g.sudden ? 'SUDDEN DEATH' : tmS.toString().padStart(2, '0'));
  if (tmS <= 5 && !g.sudden) s.ui.timer.setColor('#ff3388').setAlpha(0.3); else s.ui.timer.setColor('#ffffff').setAlpha(0.1);
  let w = ''; for (let i = 0; i < 2; i++) { w += (i === 0 ? 'P1 ' : '  P2 '); for (let j = 0; j < ROUNDS_TO_WIN; j++)w += j < g.wins[i] ? '●' : '○'; }
  s.ui.wins.setText(w);
  const s1 = g.ships[0], s2 = g.ships[1];
  if (s1 && s2) {
    const p1cd = Math.max(0, (s1.dashCd - time) / 1000), p2cd = Math.max(0, (s2.dashCd - time) / 1000);
    const p1pu = s1.pu ? `${s1.pu} ${Math.max(0, (s1.puEnd - time) / 1000).toFixed(1)}s` : 'NONE';
    const p2pu = s2.pu ? `${s2.pu} ${Math.max(0, (s2.puEnd - time) / 1000).toFixed(1)}s` : 'NONE';
    s.ui.p1State.setText(`DASH ${p1cd <= 0 ? 'READY' : p1cd.toFixed(1) + 's'}  PU ${p1pu}`);
    s.ui.p2State.setText(`PU ${p2pu}  DASH ${p2cd <= 0 ? 'READY' : p2cd.toFixed(1) + 's'}`);
  }
  // Hype texts
  const ht = g.hypeTexts;
  for (let i = 0; i < s.ui.hypeLayer.length; i++) {
    if (i < ht.length) {
      const h = ht[i];
      s.ui.hypeLayer[i].setVisible(true).setPosition(h.x, h.y).setText(h.text)
        .setColor('#' + h.color.toString(16).padStart(6, '0')).setAlpha(Math.min(1, h.life / 200));
    } else {
      s.ui.hypeLayer[i].setVisible(false);
    }
  }
}

function hideAllScreens(s) {
  s.ui.titleC.setVisible(false); s.ui.endC.setVisible(false);
  s.ui.scoresC.setVisible(false); s.ui.attractText.setVisible(false);
  s.ui.ctrlC.setVisible(false);
}
function showTitle(s) {
  hideAllScreens(s);
  s.ui.titleC.setVisible(true);
  s.g.phase = 'title'; s.g.menu = { cur: 0, cd: 0, sub: null };
  updateMenuHL(s); refreshScoreDisplay(s);
  s.g.idleTmr = 0;
  // Clear game state visuals
  s.gfx.clear(); s.uigfx.clear();
  s.ui.hp1.setText(''); s.ui.hp2.setText(''); s.ui.round.setText(''); s.ui.wins.setText(''); s.ui.timer.setText('');
  s.ui.p1State.setText(''); s.ui.p2State.setText('');
  for (const h of s.ui.hypeLayer) h.setVisible(false);
}
function updateMenuHL(s) {
  const diffNames = ['EASY', 'NORMAL', 'HARD'];
  s.ui.diffLabel.setText('AI: ' + s.g.aiDiff);
  s.ui.menuBtns.forEach(({ bg, lb }, i) => {
    const a = i === s.g.menu.cur;
    bg.setFillStyle(a ? C.grav : C.dark, a ? 0.8 : 0.95);
    bg.setStrokeStyle(2, a ? C.white : C.dim, a ? 1 : 0.6);
    lb.setColor(a ? '#ffffff' : '#888888');
  });
}
function refreshScoreDisplay(s) {
  const hs = s.g.highScores;
  if (!hs.length) { s.ui.titleScores.setText('NO SCORES YET'); return; }
  s.ui.titleScores.setText(hs.slice(0, 5).map((e, i) => `${i + 1}. ${e.name} — ${e.score || (e.wins + 'W')}`).join('\n'));
}
function updateTitle(s, time) {
  const g = s.g;
  let axis = 0;
  if (held(s, 'P1_U') || held(s, 'P2_U')) axis = -1;
  if (held(s, 'P1_D') || held(s, 'P2_D')) axis = 1;
  // Difficulty change with left/right on 1P option
  if (g.menu.cur === 0) {
    let dax = 0;
    if (held(s, 'P1_L') || held(s, 'P2_L')) dax = -1;
    if (held(s, 'P1_R') || held(s, 'P2_R')) dax = 1;
    if (dax !== 0 && time > g.menu.cd) {
      const diffs = ['EASY', 'NORMAL', 'HARD'];
      const ci = diffs.indexOf(g.aiDiff);
      g.aiDiff = diffs[Phaser.Math.Wrap(ci + dax, 0, 3)];
      g.menu.cd = time + 200; updateMenuHL(s); playSound(s, 'click');
    }
  }
  if (axis !== 0 && time > g.menu.cd) {
    g.menu.cur = Phaser.Math.Wrap(g.menu.cur + axis, 0, 4);
    g.menu.cd = time + 180; updateMenuHL(s); playSound(s, 'click');
  }
  if (pressed(s, ['P1_1', 'P2_1', 'P1_2', 'P2_2', 'START1', 'START2'])) {
    playSound(s, 'select');
    if (g.menu.cur === 0) { startMatch(s, 1, time); }
    else if (g.menu.cur === 1) { startMatch(s, 2, time); }
    else if (g.menu.cur === 2) { showControlsScreen(s); }
    else { showScoresScreen(s); }
  }
  if (axis !== 0) { g.idleTmr = time; }
  if (g.idleTmr === 0) g.idleTmr = time;
  if (time - g.idleTmr > 15000) { startAttract(s, time); }
}
function showScoresScreen(s) {
  hideAllScreens(s); s.ui.scoresC.setVisible(true); s.g.phase = 'scores';
  const hs = s.g.highScores;
  s.ui.scoresList.setText(hs.length ? hs.map((e, i) => `${String(i + 1).padStart(2, '0')}  ${e.name.padEnd(3)}  ${e.wins}W  ${e.date || ''}`).join('\n') : 'NO SCORES YET');
}
function updateScoresPhase(s, time) {
  if (pressed(s, ['START1', 'START2', 'P1_1', 'P2_1'])) showTitle(s);
}
function showControlsScreen(s) {
  hideAllScreens(s); s.ui.ctrlC.setVisible(true); s.g.phase = 'controls';
}
function updateControlsPhase(s, time) {
  if (pressed(s, ['START1', 'START2', 'P1_1', 'P2_1'])) showTitle(s);
}
// ═══════════════ ATTRACT MODE ═══════════════
function startAttract(s, time) {
  const g = s.g;
  g.mode = 0; g.ai = [{ cd: 0, tgt: W / 2, dodgeCd: 0 }, { cd: 0, tgt: W / 2, dodgeCd: 0 }];
  g.round = 1; g.wins = [0, 0];
  g.hypeTexts = []; g.bullets = []; g.powerups = []; g.particles = []; g.bombs = [];
  startRound(s, time);
  g.phase = 'attract';// skip roundSplash in attract
  hideAllScreens(s);
  s.ui.attractText.setVisible(true);
}
function updateAttract(s, time, dt) {
  if (pressed(s, ['START1', 'START2', 'P1_1', 'P2_1', 'P1_2', 'P2_2'])) { showTitle(s); return; }
  const g = s.g;
  if (g.phase === 'attract') g.phase = 'playing';// Temporarily set to playing
  if (g.phase === 'roundSplash') g.phase = 'playing';// Skip splash in attract
  updatePlaying(s, time, dt);
  // If round ended or match ended during attract, just restart a new round
  if (g.phase === 'roundEnd' || g.phase === 'matchEnd' || g.phase === 'roundSplash') {
    g.bullets = []; g.powerups = []; g.particles = []; g.hypeTexts = [];
    g.round = 1; g.wins = [0, 0];
    startRound(s, time);
  }
  g.phase = 'attract';
  s.ui.attractText.setVisible(true);
}
// ═══════════════ MATCH END ═══════════════
function showMatchEnd(s) {
  const g = s.g;
  hideAllScreens(s); s.ui.endC.setVisible(true);
  const w = g.matchWinner;
  const col = w === 0 ? '#00ffcc' : '#ff3388';

  if (g.mode === 1 && w === 1) {
    // AI Wins
    s.ui.endTitle.setText('GAME OVER').setColor('#ff4444');
    s.ui.endSummary.setText('AI DEFEATED YOU');
    speak('GAME OVER');
  } else {
    // Human Wins or 2P Match
    s.ui.endTitle.setText(w === 0 ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!').setColor(col);
    s.ui.endSummary.setText(`${g.wins[0]} — ${g.wins[1]}`);
    speak(w === 0 ? 'PLAYER ONE WINS' : 'PLAYER TWO WINS');
  }

  s.ui.endNameLabel.setVisible(true);
  s.ui.endNameVal.setVisible(true);
  s.ui.endInstruct.setVisible(true);
  for (const it of s.ui.gridItems) { it.bg.setVisible(true); it.lb.setVisible(true); }
  g.nameEntry = { letters: [], row: 0, col: 0, cd: 0, ccd: 0 };
  refreshNameVal(s); updateGridHL(s);
  s.ui.endStatus.setText('DASH = REMATCH   START = MENU');

  // Update stats display
  const st = g.stats;
  const acc0 = st.shots[0] > 0 ? Math.round((st.hits[0] / st.shots[0]) * 100) : 0;
  const acc1 = st.shots[1] > 0 ? Math.round((st.hits[1] / st.shots[1]) * 100) : 0;
  const statsTxt = `ACCURACY: ${acc0}% | ${acc1}%
ORBIT SHOTS: ${st.orbits[0]} | ${st.orbits[1]}
MAX COMBO: ${st.maxCombo[0]} | ${st.maxCombo[1]}`;
  s.ui.endScores.setText(statsTxt);
}
function updateMatchEnd(s, time) {
  const g = s.g, ne = g.nameEntry;
  if (pressed(s, ['START1', 'START2'])) { showTitle(s); return; }
  if (pressed(s, ['P1_2', 'P2_2'])) { startMatch(s, g.mode || 1, time); return; }
  // Navigate grid
  let ax = 0, ay = 0;
  if (held(s, 'P1_L') || held(s, 'P2_L')) ax = -1;
  if (held(s, 'P1_R') || held(s, 'P2_R')) ax = 1;
  if (held(s, 'P1_U') || held(s, 'P2_U')) ay = -1;
  if (held(s, 'P1_D') || held(s, 'P2_D')) ay = 1;
  if ((ax || ay) && time > ne.cd) {
    if (ay) { ne.row = Phaser.Math.Wrap(ne.row + ay, 0, LETTER_GRID.length); ne.col = Math.min(ne.col, LETTER_GRID[ne.row].length - 1); }
    if (ax) ne.col = Phaser.Math.Wrap(ne.col + ax, 0, LETTER_GRID[ne.row].length);
    ne.cd = time + 160; updateGridHL(s); playSound(s, 'click');
  }
  if (pressed(s, ['P1_1', 'P2_1', 'P1_2', 'P2_2', 'START1', 'START2']) && time > ne.ccd) {
    ne.ccd = time + 200;
    const v = LETTER_GRID[ne.row][ne.col];
    if (v === 'DEL') { ne.letters.pop(); }
    else if (v === 'END') {
      if (ne.letters.length === 0) { s.ui.endStatus.setText('PICK AT LEAST ONE LETTER'); return; }
      submitScore(s); return;
    } else { if (ne.letters.length >= 3) ne.letters.shift(); ne.letters.push(v); }
    refreshNameVal(s); playSound(s, 'select');
  }
}
function refreshNameVal(s) {
  const ls = s.g.nameEntry.letters.slice(); while (ls.length < 3) ls.push('_');
  s.ui.endNameVal.setText(ls.join(' '));
}
function updateGridHL(s) {
  const ne = s.g.nameEntry;
  for (const it of s.ui.gridItems) {
    const a = it.row === ne.row && it.col === ne.col;
    it.bg.setFillStyle(a ? C.grav : C.dark, a ? 0.9 : 0.9);
    it.bg.setStrokeStyle(1, a ? C.white : C.dim, a ? 1 : 0.5);
    it.lb.setColor(a ? '#ffffff' : '#aaaaaa');
  }
}
function fmtScores(hs) {
  if (!hs.length) return 'NO SCORES YET';
  return hs.slice(0, 5).map((e, i) => `${i + 1}. ${e.name} — ${e.score || (e.wins + 'W')}`).join('\n');
}
async function submitScore(s) {
  const g = s.g;
  const name = g.nameEntry.letters.join('').slice(0, 3) || '???';
  // In 1P mode, track P1 (human) stats. In 2P, track the winner.
  const p = g.mode === 1 ? 0 : g.matchWinner;
  const st = g.stats;
  const score = (g.wins[p] * 1000) + (st.hits[p] * 50) + (st.orbits[p] * 200) + (st.maxCombo[p] * 100);

  const entry = { name, wins: g.wins[p], score, detail: `${g.wins[0]}-${g.wins[1]}`, winner: g.matchWinner === 0 ? 'P1' : 'P2', date: new Date().toISOString().slice(0, 10) };
  s.ui.endStatus.setText('FIRE = REMATCH  |  START = MENU');
  g.phase = 'saved';
  try {
    const existing = await loadScores();
    const next = existing.concat(entry).sort((a, b) => (b.score || (b.wins * 1000)) - (a.score || (a.wins * 1000))).slice(0, MAX_HS);
    await storageSet(SKEY, next); g.highScores = next;
  } catch (e) { g.highScores.push(entry); }
  s.ui.endScores.setText(fmtScores(g.highScores));
  // Wait for rematch
  const waitRematch = () => {
    if (g.phase !== 'saved') return;
    if (s.ctrl.pressed.P1_1 || s.ctrl.pressed.P2_1) {
      clrPressed(s); startMatch(s, g.mode || 1, s.time.now); return;
    }
    if (s.ctrl.pressed.START1 || s.ctrl.pressed.START2) {
      clrPressed(s); showTitle(s); return;
    }
    s.time.delayedCall(100, waitRematch);
  };
  s.time.delayedCall(500, waitRematch);
}
// ═══════════════ AUDIO ═══════════════
function speak(t) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(t);
  u.pitch = 0.4; u.rate = 1.1; u.volume = 0.8;
  window.speechSynthesis.speak(u);
}
function getACtx(s) {
  if (s._actx) return s._actx;
  try { s._actx = s.sound && s.sound.context ? s.sound.context : new (window.AudioContext || window.webkitAudioContext)(); return s._actx; } catch (e) { return null; }
}
function playSound(s, type) {
  const ctx = getACtx(s); if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    if (type === 'shoot') {
      o.type = 'square'; o.frequency.setValueAtTime(1200, now); o.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1); o.start(now); o.stop(now + 0.1);
    } else if (type === 'hit') {
      o.type = 'sawtooth'; o.frequency.setValueAtTime(200, now); o.frequency.exponentialRampToValueAtTime(60, now + 0.2);
      g.gain.setValueAtTime(0.25, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25); o.start(now); o.stop(now + 0.25);
      // Extra punch
      const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.connect(g2); g2.connect(ctx.destination);
      o2.type = 'sine'; o2.frequency.value = 80; g2.gain.setValueAtTime(0.3, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.15); o2.start(now); o2.stop(now + 0.15);
    } else if (type === 'kill') {
      o.type = 'sawtooth'; o.frequency.setValueAtTime(400, now); o.frequency.exponentialRampToValueAtTime(30, now + 0.6);
      g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.65); o.start(now); o.stop(now + 0.65);
      const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.connect(g2); g2.connect(ctx.destination);
      o2.type = 'sine'; o2.frequency.value = 45; g2.gain.setValueAtTime(0.35, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5); o2.start(now); o2.stop(now + 0.5);
    } else if (type === 'dash') {
      o.type = 'sawtooth'; o.frequency.setValueAtTime(150, now); o.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15); o.start(now); o.stop(now + 0.15);
    } else if (type === 'click') {
      o.type = 'square'; o.frequency.setValueAtTime(1000, now); o.frequency.exponentialRampToValueAtTime(600, now + 0.03);
      g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.04); o.start(now); o.stop(now + 0.04);
    } else if (type === 'select') {
      o.type = 'square'; o.frequency.setValueAtTime(600, now); o.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
      g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08); o.start(now); o.stop(now + 0.08);
    } else if (type === 'powerup') {
      o.type = 'triangle'; o.frequency.setValueAtTime(400, now); o.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2); o.start(now); o.stop(now + 0.2);
    } else if (type === 'surge') {
      o.type = 'sine'; o.frequency.setValueAtTime(60, now); o.frequency.exponentialRampToValueAtTime(120, now + 0.8);
      g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 1); o.start(now); o.stop(now + 1);
    } else if (type === 'nearmiss') {
      o.type = 'sine'; o.frequency.setValueAtTime(2000, now); o.frequency.exponentialRampToValueAtTime(1500, now + 0.08);
      g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1); o.start(now); o.stop(now + 0.1);
    } else if (type === 'orbit') {
      o.type = 'triangle'; o.frequency.setValueAtTime(500, now);
      g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3); o.start(now); o.stop(now + 0.3);
      const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.connect(g2); g2.connect(ctx.destination);
      o2.type = 'triangle'; o2.frequency.setValueAtTime(750, now + 0.1); g2.gain.setValueAtTime(0.12, now + 0.1); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35); o2.start(now + 0.1); o2.stop(now + 0.35);
    }
  } catch (e) { }
}

function startMusic(s) {
  if (s.g.musicOn) return; s.g.musicOn = true;
  const ctx = getACtx(s); if (!ctx) return;
  try {
    const out = ctx.createGain(); out.gain.value = 0.14; out.connect(ctx.destination);
    // Delay
    const dly = ctx.createDelay(2); const dlg = ctx.createGain();
    dly.delayTime.value = 0.38; dlg.gain.value = 0.22;
    dly.connect(dlg); dlg.connect(dly); dlg.connect(out);
    // Pad
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 700; filt.Q.value = 1.2;
    filt.connect(out); filt.connect(dly);
    const lfo = ctx.createOscillator(), lfog = ctx.createGain();
    lfo.frequency.value = 0.05; lfog.gain.value = 400; lfo.connect(lfog); lfog.connect(filt.frequency); lfo.start();
    [[110, 0, 'sawtooth'], [110, 8, 'sawtooth'], [146.83, 0, 'triangle'], [174.61, 5, 'triangle']].forEach(([f, d, t]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = t; o.frequency.value = f; o.detune.value = d;
      g.gain.value = 0.022; o.connect(g); g.connect(filt); o.start();
    });
    // Arp
    const ARP = [220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63];
    const STEP = 0.4, ALEN = ARP.length * STEP;
    function schedArp(t0) {
      // Drum beat: kick on downbeats, snare on backbeats
      for (let i = 0; i < 4; i++) {
        const isKick = i % 2 === 0;
        const oD = ctx.createOscillator(), gD = ctx.createGain();
        oD.connect(gD); gD.connect(out);
        if (isKick) {
          oD.type = 'sine'; oD.frequency.setValueAtTime(150, t0 + i * STEP); oD.frequency.exponentialRampToValueAtTime(30, t0 + i * STEP + 0.1);
          gD.gain.setValueAtTime(0.5, t0 + i * STEP); gD.gain.exponentialRampToValueAtTime(0.01, t0 + i * STEP + 0.1);
        } else {
          oD.type = 'square'; oD.frequency.setValueAtTime(250, t0 + i * STEP);
          gD.gain.setValueAtTime(0.3, t0 + i * STEP); gD.gain.exponentialRampToValueAtTime(0.01, t0 + i * STEP + 0.05);
        }
        oD.start(t0 + i * STEP); oD.stop(t0 + i * STEP + 0.15);
      }
      ARP.forEach((f, i) => {
        const t = t0 + i * STEP;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = f; o.connect(g); g.connect(out); g.connect(dly);
        g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.04, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 0.6); o.start(t); o.stop(t + STEP * 0.7);
      });
      s.time.delayedCall((ALEN - 0.05) * 1000, () => schedArp(t0 + ALEN));
    }
    // Bass
    const BEAT = 0.8;
    function schedBass(t) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 55;
      o.connect(g); g.connect(out); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.start(t); o.stop(t + 0.45);
      s.time.delayedCall(BEAT * 1000, () => schedBass(t + BEAT));
    }
    // Hi-hat tick
    function schedTick(t) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 3000;
      o.connect(g); g.connect(out); g.gain.setValueAtTime(0.015, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
      o.start(t); o.stop(t + 0.02);
      s.time.delayedCall(BEAT * 500, () => schedTick(t + BEAT * 0.5));
    }
    const t0 = ctx.currentTime + 0.2;
    schedArp(t0); schedBass(t0); schedTick(t0 + 0.2);
  } catch (e) { }
}

// ═══════════════ STORAGE ═══════════════
function getStorage() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(k) { try { const r = localStorage.getItem(k); return r === null ? { found: false, value: null } : { found: true, value: JSON.parse(r) }; } catch (e) { return { found: false, value: null }; } },
    async set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  };
}
async function storageGet(k) { return getStorage().get(k); }
async function storageSet(k, v) { return getStorage().set(k, v); }
async function loadScores() {
  const r = await storageGet(SKEY);
  if (!r.found || !Array.isArray(r.value)) return [];
  return r.value.filter(e => e && typeof e.name === 'string' && typeof e.wins === 'number').slice(0, MAX_HS);
}
