/* Entities — player, enemies, NPCs, props, projectiles */
const Entities = (() => {
  const { TILE } = Maps;

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function rect(x, y, w, h) {
    return { x, y, w, h };
  }

  function centerRect(cx, cy, w, h) {
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  class Player {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.w = 22;
      this.h = 22;
      this.speed = 2.35;
      this.dir = 'down';
      this.hp = 6;
      this.maxHp = 6;
      this.coins = 0;
      this.keys = 0;
      this.bombs = 0;
      this.hasSword = false;
      this.hasMap = false;
      this.hasCompass = false;
      this.potions = 0;
      this.invuln = 0;
      this.attackTimer = 0;
      this.attackBox = null;
      this.anim = 0;
      this.moving = false;
      this.dead = false;
      this.facingVec = { x: 0, y: 1 };
    }

    body() {
      return centerRect(this.x, this.y, this.w, this.h);
    }

    update(dt, world) {
      if (this.dead) return;
      if (this.invuln > 0) this.invuln -= dt;
      if (this.attackTimer > 0) {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) this.attackBox = null;
      }

      let dx = 0, dy = 0;
      if (this.attackTimer <= 0) {
        if (Input.isDown('left')) dx -= 1;
        if (Input.isDown('right')) dx += 1;
        if (Input.isDown('up')) dy -= 1;
        if (Input.isDown('down')) dy += 1;
      }
      this.moving = dx !== 0 || dy !== 0;
      if (this.moving) {
        const len = Math.hypot(dx, dy) || 1;
        dx = (dx / len) * this.speed;
        dy = (dy / len) * this.speed;
        if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 'right' : 'left';
        else this.dir = dy > 0 ? 'down' : 'up';
        this.facingVec = {
          x: this.dir === 'left' ? -1 : this.dir === 'right' ? 1 : 0,
          y: this.dir === 'up' ? -1 : this.dir === 'down' ? 1 : 0,
        };
        this.anim += dt * 10;
        world.moveActor(this, dx, dy);
      }

      if (Input.wasPressed('sword') && this.hasSword && this.attackTimer <= 0) {
        this.swing();
        AudioSys.sfx.swing();
      }
      if (Input.wasPressed('item') && this.bombs > 0 && this.attackTimer <= 0) {
        world.spawnBomb(this.x + this.facingVec.x * 28, this.y + this.facingVec.y * 28);
        this.bombs--;
        UI.refresh();
      }
    }

    swing() {
      this.attackTimer = 0.22;
      const reach = 28;
      const size = 26;
      this.attackBox = centerRect(
        this.x + this.facingVec.x * reach,
        this.y + this.facingVec.y * reach,
        size,
        size
      );
    }

    hurt(amount, kx, ky, world) {
      if (this.invuln > 0 || this.dead) return;
      this.hp -= amount;
      this.invuln = 1.0;
      AudioSys.sfx.hurt();
      if (kx != null) world.moveActor(this, kx * 10, ky * 10);
      UI.refresh();
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        AudioSys.sfx.die();
        world.onPlayerDeath();
      }
    }

    heal(n) {
      this.hp = Math.min(this.maxHp, this.hp + n);
      UI.refresh();
    }

    draw(ctx) {
      if (this.dead) return;
      if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) return;
      const img = Assets.get('player_' + this.dir);
      const bob = this.moving ? Math.sin(this.anim) * 2 : 0;
      const iw = 40, ih = 48;
      ctx.drawImage(img, this.x - iw / 2, this.y - ih / 2 - 8 + bob, iw, ih);
      if (this.attackBox && this.hasSword) {
        const sword = Assets.get('item_sword');
        const ab = this.attackBox;
        ctx.save();
        ctx.translate(ab.x + ab.w / 2, ab.y + ab.h / 2);
        const ang = this.dir === 'right' ? 0 : this.dir === 'left' ? Math.PI : this.dir === 'up' ? -Math.PI / 2 : Math.PI / 2;
        ctx.rotate(ang + (0.22 - this.attackTimer) * 8);
        ctx.drawImage(sword, -12, -12, 28, 28);
        ctx.restore();
      }
    }
  }

  const ENEMY_DEFS = {
    crab: { hp: 2, speed: 0.7, damage: 1, sprite: 'enemy_crab', w: 28, h: 24, score: 5 },
    skeleton: { hp: 3, speed: 1.05, damage: 1, sprite: 'enemy_skeleton', w: 26, h: 30, score: 10 },
    pirate: { hp: 4, speed: 1.2, damage: 2, sprite: 'enemy_pirate', w: 26, h: 32, score: 15 },
    captain: { hp: 20, speed: 1.35, damage: 2, sprite: 'boss_captain', w: 48, h: 52, score: 200, boss: true },
  };

  class Enemy {
    constructor(kind, x, y) {
      const d = ENEMY_DEFS[kind];
      this.kind = kind;
      this.x = x;
      this.y = y;
      Object.assign(this, d);
      this.maxHp = d.hp;
      this.hp = d.hp;
      this.dirTimer = 0;
      this.vx = 0;
      this.vy = 0;
      this.hurtTimer = 0;
      this.dead = false;
      this.flash = 0;
      this.aiPhase = 0;
      this.shootTimer = 0;
    }

    body() {
      return centerRect(this.x, this.y, this.w, this.h);
    }

    update(dt, world, player) {
      if (this.dead) return;
      if (this.hurtTimer > 0) this.hurtTimer -= dt;
      this.flash = Math.max(0, this.flash - dt);

      if (this.boss) {
        this.updateBoss(dt, world, player);
        return;
      }

      this.dirTimer -= dt;
      if (this.dirTimer <= 0) {
        this.dirTimer = 0.6 + Math.random() * 1.2;
        const toP = Math.random() < 0.55;
        if (toP) {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const len = Math.hypot(dx, dy) || 1;
          this.vx = (dx / len) * this.speed;
          this.vy = (dy / len) * this.speed;
        } else {
          const a = Math.random() * Math.PI * 2;
          this.vx = Math.cos(a) * this.speed;
          this.vy = Math.sin(a) * this.speed;
        }
      }
      if (this.hurtTimer <= 0) world.moveActor(this, this.vx, this.vy);

      if (aabb(this.body(), player.body()) && player.invuln <= 0) {
        const kx = Math.sign(player.x - this.x) || 1;
        const ky = Math.sign(player.y - this.y);
        player.hurt(this.damage, kx, ky, world);
      }
    }

    updateBoss(dt, world, player) {
      this.aiPhase += dt;
      this.shootTimer -= dt;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      const charge = Math.sin(this.aiPhase * 1.5) > 0.3;
      const spd = charge ? this.speed * 1.8 : this.speed * 0.7;
      if (this.hurtTimer <= 0) {
        world.moveActor(this, (dx / len) * spd, (dy / len) * spd);
      }
      if (this.shootTimer <= 0) {
        this.shootTimer = this.hp < 8 ? 0.9 : 1.4;
        const angles = this.hp < 8 ? [0, 0.5, -0.5, 1, -1] : [0, 0.7, -0.7];
        angles.forEach((off) => {
          const ang = Math.atan2(dy, dx) + off;
          world.spawnProjectile(this.x, this.y, Math.cos(ang) * 2.4, Math.sin(ang) * 2.4, 1, 'enemy');
        });
      }
      if (aabb(this.body(), player.body()) && player.invuln <= 0) {
        player.hurt(this.damage, Math.sign(dx) || 1, Math.sign(dy), world);
      }
    }

    takeHit(dmg, kx, ky, world) {
      if (this.dead) return;
      this.hp -= dmg;
      this.hurtTimer = 0.2;
      this.flash = 0.2;
      this.x += kx * 8;
      this.y += ky * 8;
      AudioSys.sfx.hit();
      if (this.hp <= 0) {
        this.dead = true;
        world.onEnemyDeath(this);
      }
    }

    draw(ctx) {
      if (this.dead) return;
      const img = Assets.get(this.sprite);
      if (this.flash > 0) ctx.globalAlpha = 0.45;
      const scale = this.boss ? 1.15 : 1;
      const iw = (this.boss ? 70 : 44) * scale;
      const ih = (this.boss ? 68 : 48) * scale;
      ctx.drawImage(img, this.x - iw / 2, this.y - ih / 2 - 6, iw, ih);
      ctx.globalAlpha = 1;
      if (this.boss) {
        const pct = this.hp / this.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(this.x - 40, this.y - ih / 2 - 16, 80, 8);
        ctx.fillStyle = pct > 0.3 ? '#d44' : '#f80';
        ctx.fillRect(this.x - 40, this.y - ih / 2 - 16, 80 * pct, 8);
        ctx.strokeStyle = '#e0b145';
        ctx.strokeRect(this.x - 40, this.y - ih / 2 - 16, 80, 8);
      }
    }
  }

  class Projectile {
    constructor(x, y, vx, vy, damage, team) {
      this.x = x; this.y = y; this.vx = vx; this.vy = vy;
      this.damage = damage; this.team = team;
      this.life = 2.5; this.dead = false; this.r = 6;
    }
    body() { return centerRect(this.x, this.y, this.r * 2, this.r * 2); }
    update(dt, world, player) {
      this.life -= dt;
      if (this.life <= 0) { this.dead = true; return; }
      this.x += this.vx;
      this.y += this.vy;
      const screen = world.screen;
      const tx = Math.floor(this.x / TILE);
      const ty = Math.floor(this.y / TILE);
      if (!Maps.walkable(screen, tx, ty)) { this.dead = true; return; }
      if (this.team === 'enemy' && aabb(this.body(), player.body())) {
        player.hurt(this.damage, Math.sign(this.vx), Math.sign(this.vy), world);
        this.dead = true;
      }
    }
    draw(ctx) {
      ctx.fillStyle = '#3dff8a';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.x - 1, this.y - 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  class Bomb {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.timer = 1.5;
      this.dead = false;
      this.exploded = false;
      this.blast = 0;
    }
    update(dt, world) {
      this.timer -= dt;
      if (!this.exploded && this.timer <= 0) {
        this.exploded = true;
        this.blast = 0.35;
        AudioSys.sfx.bomb();
        world.bombBlast(this.x, this.y, 56);
      }
      if (this.exploded) {
        this.blast -= dt;
        if (this.blast <= 0) this.dead = true;
      }
    }
    draw(ctx) {
      if (this.exploded) {
        const r = 56 * (1 - this.blast / 0.35);
        ctx.fillStyle = `rgba(255,160,40,${this.blast / 0.35})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const img = Assets.get('item_bomb');
      const shake = this.timer < 0.5 ? Math.sin(this.timer * 40) * 2 : 0;
      ctx.drawImage(img, this.x - 14 + shake, this.y - 16, 28, 32);
    }
  }

  return { Player, Enemy, Projectile, Bomb, aabb, centerRect, rect, ENEMY_DEFS };
})();
