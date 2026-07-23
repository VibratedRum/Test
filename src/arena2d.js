/**
 * 2D pirate arena — sprite enemies with idle / walk / attack animation.
 * Textures: Grok Imagine hyper-realistic character renders.
 */

const SPRITES = {
  rourke: {
    idle: '/assets/pirate-2d-idle.png',
    attack: '/assets/pirate-2d-attack.png',
    name: 'Captain Rourke',
  },
  voss: {
    idle: '/assets/pirate-2d-female-idle.png',
    attack: '/assets/pirate-2d-female-idle.png',
    name: 'Lady Voss',
  },
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

class Pirate2D {
  constructor(kind, x, y, images) {
    this.kind = kind;
    this.images = images;
    this.x = x;
    this.y = y;
    this.vx = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 55);
    this.facing = this.vx >= 0 ? 1 : -1;
    this.state = 'walk';
    this.bob = Math.random() * Math.PI * 2;
    this.attackT = 0;
    this.scale = 0.42 + Math.random() * 0.12;
    this.groundY = y;
  }

  attack() {
    this.state = 'attack';
    this.attackT = 0.55;
    this.vx = 0;
  }

  update(dt, bounds) {
    this.bob += dt * 6;

    if (this.state === 'attack') {
      this.attackT -= dt;
      if (this.attackT <= 0) {
        this.state = 'walk';
        this.vx = this.facing * (40 + Math.random() * 55);
      }
    } else {
      this.x += this.vx * dt;
      if (this.x < bounds.left || this.x > bounds.right) {
        this.vx *= -1;
        this.facing = this.vx >= 0 ? 1 : -1;
        this.x = Math.max(bounds.left, Math.min(bounds.right, this.x));
      }

      // Occasional idle pause
      if (Math.random() < 0.004) {
        this.state = 'idle';
        this.vx = 0;
        setTimeout(() => {
          if (this.state === 'idle') {
            this.state = 'walk';
            this.vx = this.facing * (40 + Math.random() * 55);
          }
        }, 700 + Math.random() * 900);
      }
    }
  }

  draw(ctx) {
    const img =
      this.state === 'attack' ? this.images.attack : this.images.idle;
    if (!img) return;

    const bobY = Math.sin(this.bob) * (this.state === 'walk' ? 6 : 2);
    const w = img.width * this.scale;
    const h = img.height * this.scale;
    const strike =
      this.state === 'attack' ? Math.sin((1 - this.attackT / 0.55) * Math.PI) * 18 : 0;

    ctx.save();
    ctx.translate(this.x + strike * this.facing, this.groundY + bobY);
    ctx.scale(this.facing, 1);

    // Soft contact shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 8, w * 0.22, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.drawImage(img, -w / 2, -h + 10, w, h);

    if (this.state === 'attack') {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#c4a35a';
      ctx.beginPath();
      ctx.arc(w * 0.15, -h * 0.45, 28 + strike, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export function createArena2D(canvas) {
  const ctx = canvas.getContext('2d');
  const countEl = document.getElementById('count-2d');
  const pirates = [];
  const images = {};
  let running = false;
  let raf = 0;
  let last = 0;
  let bg = null;
  let ready = false;

  const bounds = { left: 120, right: canvas.width - 120 };

  async function init() {
    const [idleR, atkR, idleV, battle] = await Promise.all([
      loadImage(SPRITES.rourke.idle),
      loadImage(SPRITES.rourke.attack),
      loadImage(SPRITES.voss.idle),
      loadImage('/assets/pirate-battle-scene.png'),
    ]);
    images.rourke = { idle: idleR, attack: atkR };
    images.voss = { idle: idleV, attack: idleV };
    bg = battle;
    ready = true;
    spawn();
    spawn();
    updateCount();
  }

  function spawn() {
    if (!ready) return;
    const kinds = Object.keys(SPRITES);
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const x = 180 + Math.random() * (canvas.width - 360);
    const y = canvas.height * 0.82 + Math.random() * 28;
    pirates.push(new Pirate2D(kind, x, y, images[kind]));
    updateCount();
  }

  function attackAll() {
    pirates.forEach((p) => p.attack());
  }

  function updateCount() {
    if (countEl) countEl.textContent = `Enemies: ${pirates.length}`;
  }

  function drawBackdrop() {
    if (bg) {
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(5, 10, 14, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, '#1a3a4a');
      g.addColorStop(1, '#050a0e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Deck planks
    const deckY = canvas.height * 0.72;
    ctx.fillStyle = 'rgba(42, 28, 18, 0.75)';
    ctx.fillRect(0, deckY, canvas.width, canvas.height - deckY);
    ctx.strokeStyle = 'rgba(196, 163, 90, 0.12)';
    for (let i = 0; i < 12; i++) {
      const y = deckY + i * 18;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016);
    last = t;

    drawBackdrop();
    pirates.sort((a, b) => a.groundY - b.groundY);
    for (const p of pirates) {
      p.update(dt, bounds);
      p.draw(ctx);
    }

    raf = requestAnimationFrame(frame);
  }

  function resume() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  init();

  return { spawn, attackAll, resume, pause };
}
