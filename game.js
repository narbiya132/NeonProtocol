
"use strict";

/* =========================================================
   NEON PROTOCOL — browser game engine
   Canvas + Vanilla JavaScript
   ========================================================= */

const $ = (id) => document.getElementById(id);

const canvas = $("game-canvas");
const ctx = canvas.getContext("2d");
const arena = $("arena-wrap");

const screens = {
  start: $("start-screen"),
  pause: $("pause-screen"),
  upgrade: $("upgrade-screen"),
  over: $("gameover-screen")
};

const TAU = Math.PI * 2;
const WORLD = { w: 900, h: 720 };

canvas.width = WORLD.w;
canvas.height = WORLD.h;

let state = "start";
let lastTime = 0;
let elapsed = 0;
let score = 0;
let highScore = 0;
let kills = 0;
let shotsFired = 0;
let shotsHit = 0;
let wave = 1;
let killsThisWave = 0;
let spawnTarget = 8;
let spawned = 0;
let spawnTimer = 0;
let waveCleared = 0;
let combo = 1;
let bestCombo = 1;
let comboTimer = 0;
let upgradesTaken = 0;
let screenShake = 0;
let toastTimer = 0;
let toastMessage = "";
let muted = false;
let audio = null;
let previousFrame = 0;
let dashCooldown = 0;
let pulseCooldown = 0;
let shootCooldown = 0;
let mouseDown = false;
let nextEnemyId = 0;
let enemyFireClock = 0;
let animationFrame = 0;

const keys = new Set();
const mouse = { x: 450, y: 360 };

const player = {
  x: 450, y: 360,
  radius: 13,
  speed: 245,
  hp: 100, maxHp: 100,
  energy: 100, maxEnergy: 100,
  damage: 24,
  fireRate: 0.19,
  bulletSpeed: 630,
  bulletSize: 4,
  dashPower: 690,
  dashTime: 0,
  dashX: 0, dashY: 0,
  invulnerable: 0,
  pulsePower: 95,
  pulseDamage: 45,
  magnet: 100,
  multishot: 1,
  critical: 0.08,
  lifesteal: 0,
  piercing: 0,
  regen: 0,
  shield: 0
};

let enemies = [];
let bullets = [];
let enemyBullets = [];
let particles = [];
let pickups = [];
let floatingTexts = [];
let obstacles = [];

const upgrades = [
  { id: "damage", icon: "⌁", title: "OVERCHARGE", tag: "OFFENSE",
    desc: "Increase weapon damage by 35%.",
    apply() { player.damage *= 1.35; } },
  { id: "speed", icon: "»", title: "PHASE DRIVE", tag: "MOBILITY",
    desc: "Move 15% faster and dash recovers sooner.",
    apply() { player.speed *= 1.15; player.dashPower *= 1.08; } },
  { id: "rate", icon: "⟡", title: "RAPID FIRE", tag: "OFFENSE",
    desc: "Fire 20% faster with reduced cooldown.",
    apply() { player.fireRate = Math.max(0.075, player.fireRate * 0.8); } },
  { id: "health", icon: "✚", title: "RECONSTRUCTION", tag: "SURVIVAL",
    desc: "Restore 35 integrity and increase max HP by 15.",
    apply() { player.maxHp += 15; player.hp = Math.min(player.maxHp, player.hp + 35); } },
  { id: "energy", icon: "◈", title: "DEEP RESERVE", tag: "ENERGY",
    desc: "Increase energy capacity by 30 and recharge faster.",
    apply() { player.maxEnergy += 30; player.energy = Math.min(player.maxEnergy, player.energy + 30); } },
  { id: "multishot", icon: "⫸", title: "SPLIT VECTOR", tag: "WEAPON",
    desc: "Fire an additional projectile at a slight angle.",
    apply() { player.multishot = Math.min(5, player.multishot + 1); } },
  { id: "pulse", icon: "◎", title: "NOVA AMPLIFIER", tag: "ABILITY",
    desc: "Increase energy pulse radius and damage by 30%.",
    apply() { player.pulsePower *= 1.3; player.pulseDamage *= 1.3; } },
  { id: "critical", icon: "✳", title: "FAULT FINDER", tag: "PRECISION",
    desc: "Add 10% critical chance. Critical hits deal double damage.",
    apply() { player.critical = Math.min(0.65, player.critical + 0.1); } },
  { id: "magnet", icon: "⌾", title: "GRAVITY WELL", tag: "UTILITY",
    desc: "Collect energy shards from a much greater distance.",
    apply() { player.magnet += 100; } },
  { id: "piercing", icon: "↠", title: "PHASE AMMO", tag: "WEAPON",
    desc: "Shots pass through one additional enemy.",
    apply() { player.piercing = Math.min(4, player.piercing + 1); } },
  { id: "regen", icon: "♡", title: "NANITE SWARM", tag: "SURVIVAL",
    desc: "Regenerate 1.5 integrity per second.",
    apply() { player.regen += 1.5; } },
  { id: "leech", icon: "♢", title: "VOID HARVEST", tag: "SURVIVAL",
    desc: "Restore a small amount of integrity per elimination.",
    apply() { player.lifesteal = Math.min(12, player.lifesteal + 2); } }
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function angleTo(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}
function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function loadRecord() {
  try {
    highScore = Number(localStorage.getItem("neonProtocolHighScore")) || 0;
  } catch (_) {
    highScore = 0;
  }
  $("record-score").textContent = String(highScore).padStart(6, "0");
}
loadRecord();

function saveRecord() {
  if (score > highScore) {
    highScore = score;
    try {
      localStorage.setItem("neonProtocolHighScore", String(highScore));
    } catch (_) {}
    $("record-score").textContent = String(highScore).padStart(6, "0");
  }
}

function sound(frequency = 440, duration = 0.06, type = "sine", volume = 0.035) {
  if (muted) return;
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  } catch (_) {}
}

function notify(message, duration = 1.5) {
  toastMessage = message;
  toastTimer = duration;
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
}

function hideScreens() {
  Object.values(screens).forEach(s => s.classList.add("hidden"));
}

function showScreen(name) {
  hideScreens();
  if (screens[name]) screens[name].classList.remove("hidden");
}

function resetGame() {
  elapsed = 0;
  score = 0;
  kills = 0;
  shotsFired = 0;
  shotsHit = 0;
  wave = 1;
  killsThisWave = 0;
  spawnTarget = 8;
  spawned = 0;
  spawnTimer = 0.5;
  waveCleared = 0;
  combo = 1;
  bestCombo = 1;
  comboTimer = 0;
  upgradesTaken = 0;
  screenShake = 0;
  dashCooldown = 0;
  pulseCooldown = 0;
  shootCooldown = 0;
  enemyFireClock = 0;

  Object.assign(player, {
    x: WORLD.w / 2, y: WORLD.h / 2,
    speed: 245,
    hp: 100, maxHp: 100,
    energy: 100, maxEnergy: 100,
    damage: 24,
    fireRate: 0.19,
    bulletSpeed: 630,
    bulletSize: 4,
    dashPower: 690,
    dashTime: 0,
    dashX: 0, dashY: 0,
    invulnerable: 0,
    pulsePower: 95,
    pulseDamage: 45,
    magnet: 100,
    multishot: 1,
    critical: 0.08,
    lifesteal: 0,
    piercing: 0,
    regen: 0,
    shield: 0
  });

  enemies = [];
  bullets = [];
  enemyBullets = [];
  particles = [];
  pickups = [];
  floatingTexts = [];
  keys.clear();
  mouseDown = false;

  generateObstacles();
  hideScreens();
  $("hud-score").classList.remove("hidden");
  $("dash-indicator").classList.remove("hidden");
  state = "playing";
  notify("PROTOCOL INITIALIZED");
  sound(440, 0.14, "triangle");
  updateUI();
}

function generateObstacles() {
  obstacles = [];
  // Clear central spawn area so the player can begin safely.
  for (let i = 0; i < 12; i++) {
    let x, y, r;
    let attempts = 0;
    do {
      x = rand(55, WORLD.w - 55);
      y = rand(55, WORLD.h - 55);
      r = rand(15, 30);
      attempts++;
    } while (
      Math.hypot(x - WORLD.w / 2, y - WORLD.h / 2) < 125 &&
      attempts < 40
    );

    obstacles.push({
      x, y, r,
      w: r * rand(1.1, 1.7),
      h: r * rand(0.7, 1.3),
      angle: rand(-0.5, 0.5)
    });
  }
}

function startGame() {
  resetGame();
}

function beginWave() {
  state = "playing";
  hideScreens();
  wave++;
  killsThisWave = 0;
  spawned = 0;
  spawnTarget = 8 + wave * 3;
  spawnTimer = 0.8;
  enemyFireClock = 0;
  player.energy = Math.min(player.maxEnergy, player.energy + 18);
  notify(`WAVE ${String(wave).padStart(2, "0")} // HOSTILES DETECTED`, 2.2);
  sound(520, 0.13, "triangle");
  updateUI();
}

function finishWave() {
  if (state !== "playing") return;
  state = "upgrade";
  waveCleared = wave;
  score += wave * 250;
  saveRecord();
  sound(660, 0.2, "sine", 0.05);
  showUpgradeChoices();
  showScreen("upgrade");
  updateUI();
}

function showUpgradeChoices() {
  const container = $("upgrade-options");
  container.innerHTML = "";

  const pool = upgrades.slice();
  const choices = [];
  while (choices.length < 3 && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    choices.push(pool.splice(index, 1)[0]);
  }

  choices.forEach((upgrade, index) => {
    const card = document.createElement("button");
    card.className = "upgrade-card";
    card.innerHTML = `
      <div class="upgrade-icon">${upgrade.icon}</div>
      <h3>${upgrade.title}</h3>
      <p>${upgrade.desc}</p>
      <div class="upgrade-tag">${String(index + 1).padStart(2, "0")} / ${upgrade.tag}</div>
    `;
    card.addEventListener("click", () => chooseUpgrade(upgrade));
    container.appendChild(card);
  });
}

function chooseUpgrade(upgrade) {
  if (state !== "upgrade") return;
  upgrade.apply();
  upgradesTaken++;
  sound(760, 0.12, "triangle");
  notify(`${upgrade.title} INSTALLED`);
  beginWave();
}

function pauseGame() {
  if (state === "playing") {
    state = "paused";
    showScreen("pause");
  } else if (state === "paused") {
    state = "playing";
    hideScreens();
  }
}

function gameOver() {
  if (state === "over") return;
  state = "over";
  saveRecord();
  showScreen("over");
  $("final-score").textContent = score.toLocaleString("en-IN");
  $("final-wave").textContent = waveCleared;
  $("final-kills").textContent = kills;
  sound(130, 0.5, "sawtooth", 0.045);
  updateUI();
}

function spawnEnemy() {
  const margin = 35;
  const side = Math.floor(Math.random() * 4);
  let x = side === 0 ? rand(0, WORLD.w) :
          side === 1 ? WORLD.w - margin :
          side === 2 ? rand(0, WORLD.w) : margin;
  let y = side === 0 ? margin :
          side === 1 ? rand(0, WORLD.h) :
          side === 2 ? WORLD.h - margin : rand(0, WORLD.h);

  // Spawn away from the player when possible.
  for (let tries = 0; tries < 8; tries++) {
    if (Math.hypot(x - player.x, y - player.y) > 270) break;
    const s = Math.floor(Math.random() * 4);
    x = s === 0 ? rand(0, WORLD.w) : s === 1 ? WORLD.w - margin :
        s === 2 ? rand(0, WORLD.w) : margin;
    y = s === 0 ? margin : s === 1 ? rand(0, WORLD.h) :
        s === 2 ? WORLD.h - margin : rand(0, WORLD.h);
  }

  let type = "hunter";
  const roll = Math.random();
  if (wave >= 3 && roll > 0.7) type = "brute";
  if (wave >= 2 && roll < 0.25) type = "wraith";

  const definitions = {
    hunter: {
      r: 12, hp: 36 + wave * 5, speed: 83 + wave * 3.2,
      damage: 12 + wave * 0.5, color: "#ff4f91", value: 100
    },
    brute: {
      r: 21, hp: 120 + wave * 15, speed: 39 + wave * 1.4,
      damage: 22 + wave, color: "#ffbd67", value: 220
    },
    wraith: {
      r: 14, hp: 55 + wave * 7, speed: 56 + wave * 2,
      damage: 9 + wave * 0.6, color: "#b69cff", value: 160
    }
  };

  const d = definitions[type];
  enemies.push({
    id: nextEnemyId++,
    type, x, y, r: d.r, hp: d.hp, maxHp: d.hp,
    speed: d.speed, damage: d.damage,
    color: d.color, value: d.value,
    attackTimer: rand(0.7, 1.8),
    hitFlash: 0,
    wobble: rand(0, TAU),
    phase: rand(0, TAU)
  });
  spawned++;
}

function addParticles(x, y, color, amount = 8, power = 140) {
  for (let i = 0; i < amount; i++) {
    const a = rand(0, TAU);
    const speed = rand(power * 0.25, power);
    const life = rand(0.18, 0.55);
    particles.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life, maxLife: life,
      size: rand(1.5, 4),
      color
    });
  }
}

function addFloatingText(x, y, text, color = "#50f6e1", size = 12) {
  floatingTexts.push({ x, y, text, color, size, life: 0.8, maxLife: 0.8 });
}

function spawnPickup(x, y, type = "energy") {
  pickups.push({
    x: x + rand(-8, 8),
    y: y + rand(-8, 8),
    r: 6,
    type,
    life: 12,
    phase: rand(0, TAU)
  });
}

function fireBullet() {
  if (shootCooldown > 0 || state !== "playing") return;
  const aim = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  const count = player.multishot;
  const spread = 0.13;

  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spread;
    const a = aim + offset;
    const critical = Math.random() < player.critical;
    bullets.push({
      x: player.x + Math.cos(a) * 19,
      y: player.y + Math.sin(a) * 19,
      vx: Math.cos(a) * player.bulletSpeed,
      vy: Math.sin(a) * player.bulletSpeed,
      r: player.bulletSize,
      damage: player.damage * (critical ? 2 : 1),
      critical,
      life: 1.5,
      pierce: player.piercing,
      hitIds: new Set()
    });
  }

  shotsFired++;
  shootCooldown = player.fireRate;
  addParticles(
    player.x + Math.cos(aim) * 18,
    player.y + Math.sin(aim) * 18,
    "#50f6e1", 3, 45
  );
  sound(criticalFrequency(), 0.035, "square", 0.012);
}

function criticalFrequency() {
  return rand(250, 330);
}

function dash() {
  if (state !== "playing" || dashCooldown > 0) return;

  let dx = Number(keys.has("d") || keys.has("arrowright")) -
           Number(keys.has("a") || keys.has("arrowleft"));
  let dy = Number(keys.has("s") || keys.has("arrowdown")) -
           Number(keys.has("w") || keys.has("arrowup"));
  const len = Math.hypot(dx, dy);

  if (len < 0.01) {
    const a = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    dx = Math.cos(a);
    dy = Math.sin(a);
  } else {
    dx /= len;
    dy /= len;
  }

  player.dashX = dx;
  player.dashY = dy;
  player.dashTime = 0.16;
  player.invulnerable = 0.32;
  dashCooldown = 1.35;
  player.energy = Math.max(0, player.energy - 8);

  addParticles(player.x, player.y, "#50f6e1", 20, 210);
  screenShake = Math.max(screenShake, 3);
  sound(180, 0.12, "sawtooth", 0.025);
}

function energyPulse() {
  if (state !== "playing" || pulseCooldown > 0) return;
  if (player.energy < 35) {
    notify("INSUFFICIENT ENERGY");
    sound(120, 0.08, "square", 0.018);
    return;
  }

  player.energy -= 35;
  pulseCooldown = 3.8;
  const radius = player.pulsePower;
  addParticles(player.x, player.y, "#50f6e1", 42, 280);
  screenShake = 8;
  sound(100, 0.32, "sawtooth", 0.04);

  for (const enemy of enemies) {
    if (distance(player, enemy) <= radius + enemy.r) {
      const a = angleTo(player, enemy);
      enemy.x += Math.cos(a) * 36;
      enemy.y += Math.sin(a) * 36;
      damageEnemy(enemy, player.pulseDamage, true);
    }
  }

  // Destroy nearby hostile projectiles.
  enemyBullets = enemyBullets.filter(b => {
    if (Math.hypot(b.x - player.x, b.y - player.y) <= radius) {
      addParticles(b.x, b.y, "#b69cff", 3, 65);
      return false;
    }
    return true;
  });

  notify("NOVA PULSE // DEPLOYED");
}

function damageEnemy(enemy, damage, pulse = false) {
  if (!enemies.includes(enemy)) return;
  enemy.hp -= damage;
  enemy.hitFlash = 0.09;
  shotsHit += pulse ? 0 : 1;

  addFloatingText(
    enemy.x, enemy.y - enemy.r,
    String(Math.round(damage)),
    damage > player.damage * 1.5 ? "#ffcf73" : "#c3fff6",
    damage > player.damage * 1.5 ? 15 : 11
  );

  if (enemy.hp <= 0) {
    eliminateEnemy(enemy);
  }
}

function eliminateEnemy(enemy) {
  const index = enemies.indexOf(enemy);
  if (index === -1) return;
  enemies.splice(index, 1);

  kills++;
  killsThisWave++;
  comboTimer = 2.6;
  combo = Math.min(99, combo + 1);
  bestCombo = Math.max(bestCombo, combo);
  score += Math.round(enemy.value * combo);
  player.hp = Math.min(player.maxHp, player.hp + player.lifesteal);

  addParticles(enemy.x, enemy.y, enemy.color, enemy.type === "brute" ? 24 : 14, 190);
  addFloatingText(enemy.x, enemy.y, `+${enemy.value * combo}`, "#50f6e1", 14);
  screenShake = Math.max(screenShake, enemy.type === "brute" ? 5 : 2);
  sound(enemy.type === "brute" ? 160 : 290, 0.09, "triangle", 0.02);

  if (Math.random() < 0.30) spawnPickup(enemy.x, enemy.y);
  if (Math.random() < 0.10) spawnPickup(enemy.x, enemy.y, "health");
}

function damagePlayer(amount) {
  if (player.invulnerable > 0 || state !== "playing") return;

  if (player.shield > 0) {
    player.shield--;
    player.invulnerable = 0.7;
    notify("SHIELD ABSORBED IMPACT");
    addParticles(player.x, player.y, "#50f6e1", 14, 150);
    return;
  }

  player.hp -= amount;
  player.invulnerable = 0.65;
  screenShake = 7;
  addParticles(player.x, player.y, "#ff4f91", 15, 170);
  sound(100, 0.14, "sawtooth", 0.03);

  if (player.hp <= 0) {
    player.hp = 0;
    gameOver();
  }
}

function fireEnemyBullet(enemy) {
  const a = angleTo(enemy, player);
  const speed = 190 + wave * 4;
  enemyBullets.push({
    x: enemy.x + Math.cos(a) * enemy.r,
    y: enemy.y + Math.sin(a) * enemy.r,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    r: 5,
    damage: enemy.damage,
    life: 3,
    color: enemy.color
  });
}

function update(dt) {
  if (state !== "playing") return;

  elapsed += dt;
  animationFrame += dt;
  shootCooldown = Math.max(0, shootCooldown - dt);
  dashCooldown = Math.max(0, dashCooldown - dt);
  pulseCooldown = Math.max(0, pulseCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  comboTimer = Math.max(0, comboTimer - dt);
  screenShake = Math.max(0, screenShake - dt * 25);
  toastTimer = Math.max(0, toastTimer - dt);

  if (toastTimer <= 0) $("toast").classList.add("hidden");
  if (comboTimer <= 0) combo = 1;

  player.energy = Math.min(player.maxEnergy, player.energy + 8 * dt);
  player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);

  // Player movement and dash.
  if (player.dashTime > 0) {
    player.dashTime -= dt;
    player.x += player.dashX * player.dashPower * dt;
    player.y += player.dashY * player.dashPower * dt;
    if (Math.random() < 0.85) {
      addParticles(player.x, player.y, "#50f6e1", 1, 28);
    }
  } else {
    let dx = Number(keys.has("d") || keys.has("arrowright")) -
             Number(keys.has("a") || keys.has("arrowleft"));
    let dy = Number(keys.has("s") || keys.has("arrowdown")) -
             Number(keys.has("w") || keys.has("arrowup"));
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
      player.x += dx * player.speed * dt;
      player.y += dy * player.speed * dt;
    }
  }

  player.x = clamp(player.x, player.radius + 7, WORLD.w - player.radius - 7);
  player.y = clamp(player.y, player.radius + 7, WORLD.h - player.radius - 7);

  // Automatic firing while the mouse is held.
  if (mouseDown) fireBullet();

  // Spawn enemies at a controlled pace.
  spawnTimer -= dt;
  if (spawned < spawnTarget && spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = Math.max(0.3, 0.95 - wave * 0.025);
  }

  // Hostile AI.
  for (const enemy of enemies) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.wobble += dt * 3;

    const d = distance(enemy, player);
    const a = angleTo(enemy, player);

    if (enemy.type === "wraith") {
      // Wraiths maintain a medium firing distance.
      if (d > 240) {
        enemy.x += Math.cos(a) * enemy.speed * dt;
        enemy.y += Math.sin(a) * enemy.speed * dt;
      } else if (d < 155) {
        enemy.x -= Math.cos(a) * enemy.speed * dt;
        enemy.y -= Math.sin(a) * enemy.speed * dt;
      }

      enemy.attackTimer -= dt;
      if (enemy.attackTimer <= 0 && d < 510) {
        fireEnemyBullet(enemy);
        enemy.attackTimer = Math.max(0.65, 1.65 - wave * 0.025);
      }
    } else {
      enemy.x += Math.cos(a) * enemy.speed * dt;
      enemy.y += Math.sin(a) * enemy.speed * dt;
    }

    // Approximate obstacle collision.
    for (const ob of obstacles) {
      const dx = enemy.x - ob.x;
      const dy = enemy.y - ob.y;
      const d2 = Math.hypot(dx, dy);
      const min = enemy.r + ob.r * 0.72;
      if (d2 < min && d2 > 0.01) {
        enemy.x += dx / d2 * (min - d2) * 0.65;
        enemy.y += dy / d2 * (min - d2) * 0.65;
      }
    }

    if (d < enemy.r + player.radius) {
      damagePlayer(enemy.damage * dt * 2.5);
      const push = 60 * dt;
      enemy.x -= Math.cos(a) * push;
      enemy.y -= Math.sin(a) * push;
    }

    enemy.x = clamp(enemy.x, enemy.r, WORLD.w - enemy.r);
    enemy.y = clamp(enemy.y, enemy.r, WORLD.h - enemy.r);
  }

  // Player projectiles.
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    let remove = b.life <= 0 ||
      b.x < -20 || b.x > WORLD.w + 20 ||
      b.y < -20 || b.y > WORLD.h + 20;

    for (const enemy of enemies.slice()) {
      if (remove) break;
      if (b.hitIds.has(enemy.id)) continue;

      if (Math.hypot(b.x - enemy.x, b.y - enemy.y) < b.r + enemy.r) {
        b.hitIds.add(enemy.id);
        damageEnemy(enemy, b.damage);
        addParticles(b.x, b.y, b.critical ? "#ffcf73" : "#50f6e1", 4, 60);

        if (b.pierce > 0) {
          b.pierce--;
        } else {
          remove = true;
        }
      }
    }

    if (remove) bullets.splice(i, 1);
  }

  // Enemy projectiles.
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.life <= 0 || b.x < 0 || b.x > WORLD.w || b.y < 0 || b.y > WORLD.h) {
      enemyBullets.splice(i, 1);
      continue;
    }

    if (Math.hypot(b.x - player.x, b.y - player.y) < b.r + player.radius) {
      damagePlayer(b.damage);
      addParticles(b.x, b.y, b.color, 5, 80);
      enemyBullets.splice(i, 1);
    }
  }

  // Pickups and magnetic collection.
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.life -= dt;
    p.phase += dt * 3;

    const d = distance(p, player);
    if (d < player.magnet && d > 0) {
      const pull = d < 100 ? 280 : 110;
      p.x += (player.x - p.x) / d * pull * dt;
      p.y += (player.y - p.y) / d * pull * dt;
    }

    if (d < player.radius + p.r + 4) {
      if (p.type === "health") {
        player.hp = Math.min(player.maxHp, player.hp + 20);
        addFloatingText(p.x, p.y, "+20 HP", "#ff8cb5");
      } else {
        player.energy = Math.min(player.maxEnergy, player.energy + 22);
        addFloatingText(p.x, p.y, "+22 ENERGY");
      }
      score += 25;
      sound(680, 0.07, "sine", 0.02);
      addParticles(p.x, p.y, p.type === "health" ? "#ff4f91" : "#50f6e1", 7, 80);
      pickups.splice(i, 1);
    } else if (p.life <= 0) {
      pickups.splice(i, 1);
    }
  }

  // Particles.
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.06, dt);
    p.vy *= Math.pow(0.06, dt);
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Floating combat text.
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const f = floatingTexts[i];
    f.y -= 28 * dt;
    f.life -= dt;
    if (f.life <= 0) floatingTexts.splice(i, 1);
  }

  // Wave completion: every planned enemy must be spawned and eliminated.
  if (spawned >= spawnTarget && enemies.length === 0) {
    finishWave();
  }

  updateUI();
}

function drawBackground() {
  ctx.fillStyle = "#080e19";
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // Subtle gradient.
  const gradient = ctx.createRadialGradient(
    WORLD.w / 2, WORLD.h / 2, 30,
    WORLD.w / 2, WORLD.h / 2, 600
  );
  gradient.addColorStop(0, "#111c2b");
  gradient.addColorStop(1, "#070c15");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // Technical grid.
  ctx.strokeStyle = "#24384b36";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.h);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD.h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.w, y);
    ctx.stroke();
  }

  // Crosshair marks at grid intersections.
  ctx.fillStyle = "#50f6e122";
  for (let x = 20; x < WORLD.w; x += 80) {
    for (let y = 20; y < WORLD.h; y += 80) {
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  // Arena boundaries.
  ctx.strokeStyle = "#50f6e15a";
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, WORLD.w - 16, WORLD.h - 16);

  // Corner indicators.
  ctx.strokeStyle = "#50f6e1";
  ctx.lineWidth = 2;
  const corners = [
    [8, 8, 1, 1], [WORLD.w - 8, 8, -1, 1],
    [8, WORLD.h - 8, 1, -1], [WORLD.w - 8, WORLD.h - 8, -1, -1]
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + sx * 22, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * 22);
    ctx.stroke();
  }

  // Obstacles / energy conduits.
  for (const ob of obstacles) {
    ctx.save();
    ctx.translate(ob.x, ob.y);
    ctx.rotate(ob.angle);
    ctx.fillStyle = "#101d2a";
    ctx.strokeStyle = "#314759";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(-ob.w / 2, -ob.h / 2, ob.w, ob.h);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#50f6e14d";
    ctx.beginPath();
    ctx.moveTo(-ob.w / 2 + 4, 0);
    ctx.lineTo(ob.w / 2 - 4, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlayer() {
  const aim = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  const blink = player.invulnerable > 0 && Math.floor(animationFrame * 22) % 2 === 0;
  if (blink) return;

  // Ground shadow and pulse.
  ctx.beginPath();
  ctx.arc(player.x, player.y, 25 + Math.sin(animationFrame * 3) * 2, 0, TAU);
  ctx.strokeStyle = "#50f6e13d";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(aim);

  ctx.shadowBlur = 20;
  ctx.shadowColor = "#50f6e1";
  ctx.fillStyle = "#50f6e1";
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#10202b";
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-5, -4);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-5, 4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#d7fff9";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(3, 0);
  ctx.lineTo(24, 0);
  ctx.stroke();
  ctx.restore();

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 23, 0, TAU);
    ctx.strokeStyle = "#50f6e1";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.wobble * 0.3);

  ctx.shadowBlur = enemy.hitFlash > 0 ? 25 : 12;
  ctx.shadowColor = enemy.color;
  ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : "#111827";
  ctx.strokeStyle = enemy.color;
  ctx.lineWidth = enemy.type === "brute" ? 2.5 : 1.8;

  ctx.beginPath();
  if (enemy.type === "hunter") {
    ctx.moveTo(0, -enemy.r);
    ctx.lineTo(enemy.r, 0);
    ctx.lineTo(0, enemy.r);
    ctx.lineTo(-enemy.r, 0);
    ctx.closePath();
  } else if (enemy.type === "brute") {
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6;
      const x = Math.cos(a) * enemy.r;
      const y = Math.sin(a) * enemy.r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(0, -enemy.r);
    ctx.lineTo(enemy.r, enemy.r);
    ctx.lineTo(-enemy.r, enemy.r);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.type === "brute" ? 5 : 3, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Enemy health bar.
  const width = enemy.r * 2.3;
  const y = enemy.y - enemy.r - 9;
  ctx.fillStyle = "#293344";
  ctx.fillRect(enemy.x - width / 2, y, width, 3);
  ctx.fillStyle = enemy.color;
  ctx.fillRect(enemy.x - width / 2, y, width * Math.max(0, enemy.hp / enemy.maxHp), 3);
}

function drawBullets() {
  for (const b of bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = b.critical ? "#ffcf73" : "#50f6e1";
    ctx.lineWidth = b.critical ? 4 : 2.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = b.critical ? "#ffcf73" : "#50f6e1";
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  for (const b of enemyBullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, TAU);
    ctx.fillStyle = b.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = b.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawPickups() {
  for (const p of pickups) {
    const pulse = Math.sin(p.phase) * 2;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.phase * 0.4);
    const color = p.type === "health" ? "#ff4f91" : "#50f6e1";
    ctx.strokeStyle = color;
    ctx.fillStyle = "#10212a";
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(0, -p.r - pulse);
    ctx.lineTo(p.r + pulse, 0);
    ctx.lineTo(0, p.r + pulse);
    ctx.lineTo(-p.r - pulse, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  for (const f of floatingTexts) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.font = `700 ${f.size}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = f.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function drawAimReticle() {
  ctx.save();
  ctx.translate(mouse.x, mouse.y);
  ctx.strokeStyle = "#50f6e1a8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, TAU);
  ctx.moveTo(-15, 0); ctx.lineTo(-5, 0);
  ctx.moveTo(15, 0); ctx.lineTo(5, 0);
  ctx.moveTo(0, -15); ctx.lineTo(0, -5);
  ctx.moveTo(0, 15); ctx.lineTo(0, 5);
  ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.save();
  if (screenShake > 0) {
    ctx.translate(rand(-screenShake, screenShake), rand(-screenShake, screenShake));
  }

  drawBackground();
  drawPickups();
  for (const enemy of enemies) drawEnemy(enemy);
  drawBullets();
  drawParticles();

  if (state !== "start") drawPlayer();
  if (state === "playing") drawAimReticle();

  ctx.restore();
}

function updateUI() {
  $("health-text").textContent =
    `${Math.ceil(player.hp)} / ${Math.ceil(player.maxHp)}`;
  $("health-bar").style.width = `${clamp(player.hp / player.maxHp * 100, 0, 100)}%`;

  $("energy-text").textContent = `${Math.floor(player.energy)}%`;
  $("energy-bar").style.width = `${clamp(player.energy / player.maxEnergy * 100, 0, 100)}%`;

  const threat = Math.min(5, Math.ceil(wave / 2));
  $("threat-text").textContent =
    threat <= 1 ? "LOW" : threat <= 3 ? "ELEVATED" : "CRITICAL";

  document.querySelectorAll(".threat-meter i").forEach((el, i) => {
    el.classList.toggle("active", i < threat);
  });

  $("kills").textContent = String(kills).padStart(3, "0");
  $("accuracy").textContent = shotsFired
    ? `${Math.round(shotsHit / shotsFired * 100)}%`
    : "100%";
  $("best-combo").textContent = `x${bestCombo}`;
  $("wave-number").textContent = String(wave).padStart(2, "0");
  $("score").textContent = String(score).padStart(6, "0");
  $("combo-display").innerHTML = `COMBO <strong>x${combo}</strong>`;
  $("wave-progress-text").textContent = `${killsThisWave} / ${spawnTarget}`;
  $("wave-progress-bar").style.width =
    `${clamp(killsThisWave / Math.max(1, spawnTarget) * 100, 0, 100)}%`;
  $("enemy-count").textContent = enemies.length;
  $("run-time").textContent = formatTime(elapsed);
  $("upgrade-count").textContent = `${upgradesTaken} INSTALLED`;
  $("record-score").textContent = String(highScore).padStart(6, "0");

  $("dash-indicator").innerHTML = dashCooldown <= 0
    ? 'DASH READY <span>SHIFT</span>'
    : `DASH ${dashCooldown.toFixed(1)}s <span>SHIFT</span>`;
  $("dash-indicator").style.opacity = dashCooldown <= 0 ? "1" : ".5";
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function gameLoop(timestamp) {
  const dt = previousFrame
    ? Math.min((timestamp - previousFrame) / 1000, 0.033)
    : 0;
  previousFrame = timestamp;
  lastTime = timestamp;

  if (state === "playing") update(dt);
  else if (state === "start") animationFrame += dt;

  render();
  requestAnimationFrame(gameLoop);
}

// Convert pointer coordinates to our fixed-resolution canvas.
function updateMouse(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = clamp((event.clientX - rect.left) / rect.width * WORLD.w, 0, WORLD.w);
  mouse.y = clamp((event.clientY - rect.top) / rect.height * WORLD.h, 0, WORLD.h);
}

canvas.addEventListener("pointermove", updateMouse);
canvas.addEventListener("pointerdown", event => {
  updateMouse(event);
  if (event.button === 0 && state === "playing") {
    mouseDown = true;
    fireBullet();
  }
});
window.addEventListener("pointerup", () => { mouseDown = false; });
window.addEventListener("blur", () => {
  mouseDown = false;
  keys.clear();
  if (state === "playing") pauseGame();
});

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
  }

  if (key === "escape") {
    if (state === "playing" || state === "paused") pauseGame();
    return;
  }

  if (state === "upgrade" && ["1", "2", "3"].includes(key)) {
    const cards = [...$("upgrade-options").querySelectorAll(".upgrade-card")];
    cards[Number(key) - 1]?.click();
    return;
  }

  if (keys.has(key)) return;
  keys.add(key);

  if (state !== "playing") return;

  if (key === "shift") dash();
  if (key === "e") energyPulse();
});

window.addEventListener("keyup", event => {
  keys.delete(event.key.toLowerCase());
});

$("start-btn").addEventListener("click", startGame);
$("restart-btn").addEventListener("click", startGame);
$("resume-btn").addEventListener("click", pauseGame);

$("sound-btn").addEventListener("click", () => {
  muted = !muted;
  $("sound-btn").innerHTML = muted ? "♫ <span>SOUND OFF</span>" : "♫ <span>SOUND ON</span>";
  if (!muted) sound(500, 0.08);
});

// Start on the title screen. The animation runs even before gameplay.
loadRecord();
generateObstacles();
updateUI();
requestAnimationFrame(gameLoop);
