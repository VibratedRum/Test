/* Tide of Legends — main game loop & world */
const UI = {
  el: {},
  bind() {
    const ids = [
      'hud', 'hearts', 'coins', 'keys', 'bombs', 'equipped-icon', 'sword-slot',
      'title-screen', 'dialogue', 'dialogue-name', 'dialogue-text',
      'inventory', 'inv-grid', 'map-overlay', 'minimap', 'pause-screen',
      'gameover', 'victory', 'victory-stats', 'item-get', 'item-get-img', 'item-get-text',
      'btn-start', 'btn-resume', 'btn-totitle', 'btn-retry', 'btn-again', 'btn-touch',
      'touch-controls',
    ];
    ids.forEach((id) => { this.el[id] = document.getElementById(id); });
  },
  show(id) { this.el[id]?.classList.remove('hidden'); },
  hide(id) { this.el[id]?.classList.add('hidden'); },
  enableTouchUi(on = true) {
    document.body.classList.toggle('touch-ui', on);
    try { localStorage.setItem('tide-touch-ui', on ? '1' : '0'); } catch (_) {}
    if (this.el['btn-touch']) {
      this.el['btn-touch'].textContent = on ? 'Touch Controls: On' : 'Use Touch Controls';
    }
  },
  setTouchPad(visible) {
    const el = this.el['touch-controls'];
    if (!el) return;
    // On phones always show during play; desktop needs touch-ui enabled
    const mobile = Input.isTouchDevice();
    const allow = mobile || document.body.classList.contains('touch-ui');
    const show = !!(visible && allow);
    el.classList.toggle('is-visible', show);
    if (show) {
      el.hidden = false;
      el.removeAttribute('hidden');
    } else {
      el.hidden = true;
    }
  },
  refresh() {
    const p = Game.player;
    if (!p) return;
    const hearts = this.el.hearts;
    hearts.innerHTML = '';
    const full = Math.ceil(p.hp);
    for (let i = 0; i < p.maxHp; i++) {
      const img = document.createElement('img');
      img.src = 'assets/ui/item_heart.png';
      img.alt = 'heart';
      if (i >= full) img.style.opacity = '0.25';
      else if (i === full - 1 && p.hp % 1 !== 0) img.style.opacity = '0.55';
      hearts.appendChild(img);
    }
    this.el.coins.textContent = p.coins;
    this.el.keys.textContent = p.keys;
    this.el.bombs.textContent = p.bombs;
    this.el['sword-slot'].classList.toggle('locked', !p.hasSword);
  },
  renderInventory() {
    const p = Game.player;
    const items = [
      { key: 'sword', img: 'item_sword', have: p.hasSword, label: 'Tide Cutlass' },
      { key: 'bombs', img: 'item_bomb', have: p.bombs > 0, qty: p.bombs, label: 'Bombs' },
      { key: 'key', img: 'item_key', have: p.keys > 0, qty: p.keys, label: 'Keys' },
      { key: 'potion', img: 'item_potion', have: p.potions > 0, qty: p.potions, label: 'Potion' },
      { key: 'map', img: 'item_map', have: p.hasMap, label: 'Dungeon Map' },
      { key: 'compass', img: 'item_compass', have: p.hasCompass, label: 'Compass' },
      { key: 'coin', img: 'item_coin', have: true, qty: p.coins, label: 'Doubloons' },
      { key: 'heart', img: 'item_heart', have: true, qty: `${p.hp}/${p.maxHp}`, label: 'Life' },
    ];
    this.el['inv-grid'].innerHTML = items.map((it) => `
      <div class="inv-cell" title="${it.label}">
        ${it.have ? `<img src="assets/ui/${it.img}.png" alt="${it.label}" />` : ''}
        ${it.qty != null && it.have ? `<span class="qty">${it.qty}</span>` : ''}
      </div>`).join('');
  },
  drawMinimap() {
    const c = this.el.minimap;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const cellW = 70, cellH = 50;
    const ox = 40, oy = 20;
    const graph = Maps.worldGraph;
    const cur = Game.screenId;
    for (let gy = 0; gy < graph.length; gy++) {
      for (let gx = 0; gx < graph[gy].length; gx++) {
        const id = graph[gy][gx];
        if (!id) continue;
        const x = ox + gx * (cellW + 8);
        const y = oy + gy * (cellH + 8);
        ctx.fillStyle = id === cur ? '#e0b145' : '#1a4a58';
        ctx.fillRect(x, y, cellW, cellH);
        ctx.strokeStyle = '#7ec8c0';
        ctx.strokeRect(x, y, cellW, cellH);
        const scr = Maps.getScreen(id);
        ctx.fillStyle = '#d7f0ea';
        ctx.font = '11px serif';
        ctx.fillText(scr?.name?.slice(0, 12) || id, x + 6, y + 28);
      }
    }
    if (String(cur).startsWith('d') || cur === 'dboss') {
      ctx.fillStyle = '#e0b145';
      ctx.font = '14px Pirata One, serif';
      ctx.fillText('Inside Blackreef Fortress', 50, 220);
      if (Game.player.hasCompass) {
        ctx.fillText(cur === 'dboss' ? 'Boss nearby!' : 'Compass whispers…', 50, 200);
      }
    }
  },
};

const Game = {
  canvas: null,
  ctx: null,
  state: 'title', // title | play | dialogue | inventory | map | pause | itemget | dead | win
  player: null,
  screenId: '0,0',
  screen: null,
  entities: [],
  solids: [],
  projectiles: [],
  bombs: [],
  particles: [],
  openedChests: new Set(),
  cutBushes: new Set(),
  blownRocks: new Set(),
  unlockedDoors: new Set(),
  flags: {},
  dialogueQueue: [],
  dialogueIndex: 0,
  itemGetTimer: 0,
  transition: null,
  time: 0,
  kills: 0,
  startTime: 0,
  waterPhase: 0,
  cameraShake: 0,
  doorCooldown: 0,
  transitionCooldown: 0,

  async init() {
    UI.bind();
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    const params = new URLSearchParams(location.search);
    let savedTouch = null;
    try { savedTouch = localStorage.getItem('tide-touch-ui'); } catch (_) {}
    // Phones always get touch UI. Desktop: button / ?touch / saved "on".
    if (Input.isTouchDevice() || params.has('touch') || savedTouch === '1') {
      UI.enableTouchUi(true);
    }
    Input.bindTouchPad(document.getElementById('touch-controls'));
    // First tap anywhere unlocks audio + ensures touch UI on real devices
    const armTouch = () => {
      if (Input.isTouchDevice()) UI.enableTouchUi(true);
      AudioSys.unlock();
    };
    window.addEventListener('pointerdown', armTouch, { once: true, passive: true });
    window.addEventListener('touchstart', armTouch, { once: true, passive: true });

    await Assets.loadAll();
    this.bindButtons();
    this.loop(performance.now());
  },

  bindButtons() {
    UI.el['btn-start'].onclick = () => this.startGame();
    UI.el['btn-resume'].onclick = () => this.resume();
    UI.el['btn-totitle'].onclick = () => this.toTitle();
    UI.el['btn-retry'].onclick = () => this.startGame();
    UI.el['btn-again'].onclick = () => this.startGame();
    UI.el['btn-touch'].onclick = () => {
      const on = !document.body.classList.contains('touch-ui');
      UI.enableTouchUi(on);
    };

    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const which = btn.getAttribute('data-close');
        if (which === 'inventory') {
          UI.hide('inventory');
          this.state = 'play';
          UI.setTouchPad(true);
        } else if (which === 'map') {
          UI.hide('map-overlay');
          this.state = 'play';
          UI.setTouchPad(true);
        }
      });
    });

    // Tap dialogue / item-get overlays to advance
    UI.el.dialogue?.addEventListener('pointerup', () => {
      if (this.state === 'dialogue') this.advanceDialogue();
    });
    UI.el['item-get']?.addEventListener('pointerup', () => {
      if (this.state === 'itemget') {
        UI.hide('item-get');
        this.state = 'play';
        UI.setTouchPad(true);
      }
    });
  },

  startGame() {
    AudioSys.unlock().then(() => AudioSys.startMusic('overworld'));
    this.openedChests = new Set();
    this.cutBushes = new Set();
    this.blownRocks = new Set();
    this.unlockedDoors = new Set();
    this.flags = {};
    this.kills = 0;
    this.startTime = performance.now();
    this.player = new Entities.Player(0, 0);
    this.loadScreen('0,0', null);
    const spawn = Maps.findSpawn(this.screen);
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.state = 'play';
    document.body.classList.add('playing');
    if (Input.isTouchDevice()) UI.enableTouchUi(true);
    UI.hide('title-screen');
    UI.hide('gameover');
    UI.hide('victory');
    UI.hide('pause-screen');
    UI.show('hud');
    UI.setTouchPad(true);
    UI.refresh();
  },

  toTitle() {
    this.state = 'title';
    document.body.classList.remove('playing');
    AudioSys.stopMusic();
    UI.hide('hud');
    UI.hide('pause-screen');
    UI.hide('inventory');
    UI.hide('map-overlay');
    UI.setTouchPad(false);
    UI.show('title-screen');
  },

  resume() {
    this.state = 'play';
    UI.hide('pause-screen');
    UI.setTouchPad(true);
  },

  loadScreen(id, fromDir) {
    const wasDungeon = String(this.screenId).startsWith('d') || this.screenId === 'dboss';
    this.screenId = id;
    this.screen = Maps.getScreen(id);
    this.entities = [];
    this.solids = [];
    this.projectiles = [];
    this.bombs = [];
    this.buildScreenEntities();
    const music = this.screen.music || 'overworld';
    const nowDungeon = String(id).startsWith('d') || id === 'dboss';
    if (wasDungeon !== nowDungeon || music === 'boss') AudioSys.startMusic(music);

    // fromDir = which edge of the NEW screen the player entered from
    if (fromDir && this.player) {
      const spot = Maps.edgeSpawn(this.screen, fromDir);
      this.player.x = spot.x;
      this.player.y = spot.y;
      this.player.dir = fromDir === 'n' ? 'down' : fromDir === 's' ? 'up'
        : fromDir === 'w' ? 'right' : 'left';
      this.transitionCooldown = 0.45;
    }
  },

  buildScreenEntities() {
    const { TILE } = Maps;
    const list = this.screen.entities || [];
    list.forEach((e) => {
      const px = e.x * TILE + TILE / 2;
      const py = e.y * TILE + TILE / 2;
      if (e.type === 'enemy') {
        this.entities.push(new Entities.Enemy(e.kind, px, py));
      } else if (e.type === 'boss') {
        this.entities.push(new Entities.Enemy(e.kind, px, py));
      } else if (e.type === 'npc') {
        this.entities.push({
          type: 'npc', id: e.id, x: px, y: py, sprite: e.sprite, name: e.name,
          lines: e.lines, shop: e.shop, solid: true,
          w: 28, h: 28,
          body() { return Entities.centerRect(this.x, this.y, this.w, this.h); },
          draw(ctx) {
            const img = Assets.get(this.sprite);
            ctx.drawImage(img, this.x - 28, this.y - 36, 56, 64);
          },
        });
      } else if (e.type === 'prop') {
        this.entities.push({
          type: 'prop', id: e.id, x: px, y: py, sprite: e.sprite, solid: !!e.solid,
          w: 36, h: 36,
          body() { return Entities.centerRect(this.x, this.y, this.w, this.h); },
          draw(ctx) {
            const img = Assets.get(this.sprite);
            const sizes = {
              prop_palm: [56, 80], prop_hut: [88, 100], prop_boat: [70, 50],
              prop_sign: [32, 40],
            };
            const [iw, ih] = sizes[this.sprite] || [48, 48];
            ctx.drawImage(img, this.x - iw / 2, this.y - ih / 2 - 8, iw, ih);
          },
        });
      } else if (e.type === 'chest') {
        if (this.openedChests.has(e.id)) return;
        this.entities.push({
          type: 'chest', id: e.id, x: px, y: py, loot: e.loot, cost: e.cost || 0,
          message: e.message, solid: true, opened: false,
          w: 30, h: 26,
          body() { return Entities.centerRect(this.x, this.y, this.w, this.h); },
          draw(ctx) {
            const img = Assets.get('prop_chest');
            ctx.drawImage(img, this.x - 22, this.y - 20, 44, 40);
          },
        });
      } else if (e.type === 'sign') {
        this.entities.push({
          type: 'sign', id: e.id, x: px, y: py, lines: e.lines, solid: true,
          w: 24, h: 24,
          body() { return Entities.centerRect(this.x, this.y, this.w, this.h); },
          draw(ctx) {
            const img = Assets.get('prop_sign');
            ctx.drawImage(img, this.x - 18, this.y - 24, 36, 44);
          },
        });
      } else if (e.type === 'bush') {
        const key = `${this.screenId}:${e.x},${e.y}`;
        if (this.cutBushes.has(key)) return;
        this.entities.push({
          type: 'bush', key, x: px, y: py, solid: true, w: 28, h: 26,
          body() { return Entities.centerRect(this.x, this.y, this.w, this.h); },
          draw(ctx) {
            const img = Assets.get('prop_bush');
            ctx.drawImage(img, this.x - 20, this.y - 18, 40, 36);
          },
        });
      } else if (e.type === 'rock') {
        const key = `${this.screenId}:${e.x},${e.y}`;
        if (this.blownRocks.has(key)) return;
        this.entities.push({
          type: 'rock', key, x: px, y: py, solid: true, bombable: true, w: 32, h: 30,
          body() { return Entities.centerRect(this.x, this.y, this.w, this.h); },
          draw(ctx) {
            const img = Assets.get('prop_rock');
            ctx.drawImage(img, this.x - 22, this.y - 20, 44, 40);
          },
        });
      } else if (e.type === 'door') {
        const unlocked = this.unlockedDoors.has(e.id);
        this.entities.push({
          type: 'door', id: e.id, x: px, y: py, locked: e.locked && !unlocked,
          target: e.target, solid: !unlocked, w: 40, h: 36,
          body() { return Entities.centerRect(this.x, this.y, this.w, this.h); },
          draw(ctx) {
            const img = Assets.get('prop_door');
            if (!this.solid) ctx.globalAlpha = 0.35;
            ctx.drawImage(img, this.x - 28, this.y - 32, 56, 60);
            ctx.globalAlpha = 1;
          },
        });
      } else if (e.type === 'pickup') {
        const key = `pickup:${this.screenId}:${e.x},${e.y}`;
        if (this.flags[key]) return;
        this.entities.push({
          type: 'pickup', kind: e.kind, key, x: px, y: py, w: 20, h: 20,
          body() { return Entities.centerRect(this.x, this.y, this.w, this.h); },
          draw(ctx) {
            const map = { coin: 'item_coin', heart: 'item_heart', potion: 'item_potion', bombs: 'item_bomb' };
            const img = Assets.get(map[this.kind] || 'item_coin');
            const bob = Math.sin(Game.time * 4 + this.x) * 3;
            ctx.drawImage(img, this.x - 14, this.y - 14 + bob, 28, 28);
          },
        });
      }
    });
  },

  moveActor(actor, dx, dy) {
    const tryMove = (mx, my) => {
      const nx = actor.x + mx;
      const ny = actor.y + my;
      const box = Entities.centerRect(nx, ny, actor.w || 22, actor.h || 22);
      if (this.collidesSolid(box, actor)) return false;
      actor.x = nx;
      actor.y = ny;
      return true;
    };
    if (!tryMove(dx, 0)) tryMove(dx * 0.5, 0);
    if (!tryMove(0, dy)) tryMove(0, dy * 0.5);
  },

  collidesSolid(box, self) {
    const { TILE } = Maps;
    // tile collisions
    const x0 = Math.floor(box.x / TILE);
    const y0 = Math.floor(box.y / TILE);
    const x1 = Math.floor((box.x + box.w - 1) / TILE);
    const y1 = Math.floor((box.y + box.h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (ty < 0 || ty >= Maps.MAP_H || tx < 0 || tx >= Maps.MAP_W) continue;
        const ch = this.screen.map.grid[ty][tx];
        if (Maps.isTileSolid(ch)) return true;
      }
    }
    for (const e of this.entities) {
      if (e === self || e.dead || !e.solid || !e.body) continue;
      if (Entities.aabb(box, e.body())) return true;
    }
    return false;
  },

  spawnBomb(x, y) {
    this.bombs.push(new Entities.Bomb(x, y));
  },

  spawnProjectile(x, y, vx, vy, dmg, team) {
    this.projectiles.push(new Entities.Projectile(x, y, vx, vy, dmg, team));
  },

  bombBlast(x, y, r) {
    this.cameraShake = 0.35;
    const blast = Entities.centerRect(x - r, y - r, r * 2, r * 2);
    for (const e of this.entities) {
      if (e.dead) continue;
      if (e.takeHit && Entities.aabb(blast, e.body())) {
        e.takeHit(3, Math.sign(e.x - x), Math.sign(e.y - y), this);
      }
      if (e.bombable && Entities.aabb(blast, e.body())) {
        this.blownRocks.add(e.key);
        e.dead = true;
        e.solid = false;
        this.spawnPickup(e.x, e.y, Math.random() < 0.5 ? 'coin' : 'heart');
      }
    }
    if (Entities.aabb(blast, this.player.body())) {
      this.player.hurt(1, 0, 0, this);
    }
  },

  spawnPickup(x, y, kind) {
    this.entities.push({
      type: 'pickup', kind, x, y, w: 18, h: 18, ephemeral: true,
      body() { return Entities.centerRect(this.x, this.y, this.w, this.h); },
      draw(ctx) {
        const map = { coin: 'item_coin', heart: 'item_heart', potion: 'item_potion' };
        const img = Assets.get(map[kind] || 'item_coin');
        ctx.drawImage(img, this.x - 12, this.y - 12, 24, 24);
      },
    });
  },

  onEnemyDeath(enemy) {
    this.kills++;
    const roll = Math.random();
    if (roll < 0.35) this.spawnPickup(enemy.x, enemy.y, 'coin');
    else if (roll < 0.5) this.spawnPickup(enemy.x, enemy.y, 'heart');
    if (enemy.boss) {
      this.flags.bossDefeated = true;
      this.showItemGet('item_compass', 'Sea Crown reclaimed!');
      setTimeout(() => this.win(), 1600);
    }
  },

  onPlayerDeath() {
    this.state = 'dead';
    UI.setTouchPad(false);
    UI.show('gameover');
    AudioSys.stopMusic();
  },

  win() {
    this.state = 'win';
    UI.setTouchPad(false);
    AudioSys.sfx.win();
    AudioSys.stopMusic();
    const secs = Math.floor((performance.now() - this.startTime) / 1000);
    UI.el['victory-stats'].textContent =
      `Time ${Math.floor(secs / 60)}m ${secs % 60}s · ${this.kills} foes felled · ${this.player.coins} doubloons`;
    UI.show('victory');
  },

  interact() {
    const p = this.player;
    const reach = Entities.centerRect(
      p.x + p.facingVec.x * 24,
      p.y + p.facingVec.y * 24,
      28, 28
    );
    for (const e of this.entities) {
      if (e.dead || !e.body) continue;
      if (!Entities.aabb(reach, e.body()) && !Entities.aabb(p.body(), e.body())) continue;
      if (e.type === 'npc') {
        this.openDialogue(e.name, e.lines);
        return;
      }
      if (e.type === 'sign') {
        this.openDialogue('Sign', e.lines);
        return;
      }
      if (e.type === 'chest' && !e.opened) {
        this.openChest(e);
        return;
      }
      if (e.type === 'door') {
        this.useDoor(e);
        return;
      }
    }
  },

  openDialogue(name, lines) {
    this.state = 'dialogue';
    UI.setTouchPad(false);
    this.dialogueQueue = lines.slice();
    this.dialogueIndex = 0;
    UI.el['dialogue-name'].textContent = name;
    UI.el['dialogue-text'].textContent = this.dialogueQueue[0];
    UI.show('dialogue');
    AudioSys.sfx.talk();
  },

  advanceDialogue() {
    this.dialogueIndex++;
    if (this.dialogueIndex >= this.dialogueQueue.length) {
      UI.hide('dialogue');
      this.state = 'play';
      UI.setTouchPad(true);
      return;
    }
    UI.el['dialogue-text'].textContent = this.dialogueQueue[this.dialogueIndex];
    AudioSys.sfx.talk();
  },

  openChest(chest) {
    if (chest.cost && this.player.coins < chest.cost) {
      this.openDialogue('Chest', [`Needs ${chest.cost} doubloons.`]);
      return;
    }
    if (chest.cost) this.player.coins -= chest.cost;
    chest.opened = true;
    chest.solid = false;
    chest.dead = true;
    this.openedChests.add(chest.id);
    this.giveLoot(chest.loot, chest.message);
    AudioSys.sfx.chest();
    UI.refresh();
  },

  giveLoot(loot, message) {
    const p = this.player;
    let img = 'item_coin';
    if (loot === 'sword') { p.hasSword = true; img = 'item_sword'; }
    else if (loot === 'key') { p.keys++; img = 'item_key'; AudioSys.sfx.key(); }
    else if (loot === 'bombs') { p.bombs += 5; img = 'item_bomb'; }
    else if (loot === 'potion') { p.potions++; img = 'item_potion'; }
    else if (loot === 'heart_container') { p.maxHp += 2; p.hp = p.maxHp; img = 'item_heart'; AudioSys.sfx.heart(); }
    else if (loot === 'map') { p.hasMap = true; img = 'item_map'; }
    else if (loot === 'compass') { p.hasCompass = true; img = 'item_compass'; }
    else if (loot === 'coin_bag') { p.coins += 10; img = 'item_coin'; AudioSys.sfx.coin(); }
    else { p.coins += 5; }
    this.showItemGet(img, message || 'You got an item!');
    UI.refresh();
  },

  showItemGet(imgKey, text) {
    this.state = 'itemget';
    UI.setTouchPad(false);
    UI.el['item-get-img'].src = `assets/ui/${imgKey}.png`.replace('assets/ui/prop_', 'assets/sprites/prop_');
    if (imgKey.startsWith('item_')) UI.el['item-get-img'].src = `assets/ui/${imgKey}.png`;
    else UI.el['item-get-img'].src = `assets/ui/${imgKey}.png`;
    UI.el['item-get-text'].textContent = text;
    UI.show('item-get');
    AudioSys.sfx.item();
    this.itemGetTimer = 1.4;
  },

  useDoor(door) {
    if (door.locked) {
      if (this.player.keys > 0) {
        this.player.keys--;
        door.locked = false;
        door.solid = false;
        this.unlockedDoors.add(door.id);
        AudioSys.sfx.door();
        UI.refresh();
        this.openDialogue('Gate', ['The Skeleton Key turns… Blackreef Fortress opens!']);
      } else {
        this.openDialogue('Gate', ['Locked. A Skeleton Key is needed.']);
      }
      return;
    }
    if (door.target) {
      this.enterDungeon(door.target);
    }
  },

  enterDungeon(target) {
    this.loadScreen(target, null);
    const spawn = Maps.findSpawn(this.screen);
    this.player.x = spawn.x;
    this.player.y = Maps.MAP_H * Maps.TILE - Maps.TILE * 1.5;
    this.player.dir = 'up';
    this.doorCooldown = 1.0;
    AudioSys.sfx.door();
  },

  checkDoorTrigger() {
    if (this.doorCooldown > 0) return;
    for (const e of this.entities) {
      if (e.type !== 'door' || e.locked || !e.target) continue;
      if (Entities.aabb(this.player.body(), e.body())) {
        this.doorCooldown = 1.0;
        this.enterDungeon(e.target);
        return;
      }
    }
  },

  collectPickups() {
    const p = this.player;
    for (const e of this.entities) {
      if (e.type !== 'pickup' || e.dead) continue;
      if (!Entities.aabb(p.body(), e.body())) continue;
      e.dead = true;
      if (e.key) this.flags[e.key] = true;
      if (e.kind === 'coin') { p.coins += 1; AudioSys.sfx.coin(); }
      if (e.kind === 'heart') { p.heal(2); AudioSys.sfx.heart(); }
      if (e.kind === 'potion') { p.potions++; AudioSys.sfx.item(); }
      if (e.kind === 'bombs') { p.bombs += 3; AudioSys.sfx.item(); }
      UI.refresh();
    }
  },

  handleSwordHits() {
    const box = this.player.attackBox;
    if (!box) return;
    for (const e of this.entities) {
      if (!e.takeHit || e.dead) continue;
      if (Entities.aabb(box, e.body())) {
        e.takeHit(1, this.player.facingVec.x, this.player.facingVec.y, this);
      }
      if (e.type === 'bush' && Entities.aabb(box, e.body())) {
        this.cutBushes.add(e.key);
        e.dead = true;
        e.solid = false;
        if (Math.random() < 0.4) this.spawnPickup(e.x, e.y, Math.random() < 0.5 ? 'coin' : 'heart');
        AudioSys.sfx.swing();
      }
    }
  },

  checkScreenExit() {
    if (this.transitionCooldown > 0) return;
    const p = this.player;
    const { TILE, MAP_W, MAP_H } = Maps;
    const links = this.screen.links || {};
    const edge = TILE * 0.4; // forgiving threshold so openings are easy to cross
    let next = null;
    let dir = null;

    if (p.y < edge && links.n) { next = links.n; dir = 'n'; }
    else if (p.y > MAP_H * TILE - edge && links.s) { next = links.s; dir = 's'; }
    else if (p.x < edge && links.w) { next = links.w; dir = 'w'; }
    else if (p.x > MAP_W * TILE - edge && links.e) { next = links.e; dir = 'e'; }

    if (!next) {
      // Only clamp sides that are not exits
      if (!links.w) p.x = Math.max(14, p.x);
      if (!links.e) p.x = Math.min(MAP_W * TILE - 14, p.x);
      if (!links.n) p.y = Math.max(14, p.y);
      if (!links.s) p.y = Math.min(MAP_H * TILE - 14, p.y);
      return;
    }

    // Must be standing on (or past) a walkable edge tile — prevents wall-corner warps
    const tx = Math.max(0, Math.min(MAP_W - 1, Math.floor(p.x / TILE)));
    const ty = Math.max(0, Math.min(MAP_H - 1, Math.floor(p.y / TILE)));
    const edgeTile = dir === 'n' ? this.screen.map.grid[0][tx]
      : dir === 's' ? this.screen.map.grid[MAP_H - 1][tx]
        : dir === 'w' ? this.screen.map.grid[ty][0]
          : this.screen.map.grid[ty][MAP_W - 1];
    if (Maps.isTileSolid(edgeTile)) {
      // Push back slightly from a solid rim
      if (dir === 'n') p.y = Math.max(p.y, edge + 1);
      if (dir === 's') p.y = Math.min(p.y, MAP_H * TILE - edge - 1);
      if (dir === 'w') p.x = Math.max(p.x, edge + 1);
      if (dir === 'e') p.x = Math.min(p.x, MAP_W * TILE - edge - 1);
      return;
    }

    if (typeof next === 'string' && next.startsWith('over:')) {
      const id = next.slice(4);
      this.loadScreen(id, null);
      // Place south of fortress door so we don't instantly re-enter
      this.player.x = 8 * TILE;
      this.player.y = 5 * TILE;
      this.player.dir = 'down';
      this.doorCooldown = 1.0;
      this.transitionCooldown = 0.5;
      return;
    }
    // Enter the opposite edge of the destination screen
    const from = dir === 'n' ? 's' : dir === 's' ? 'n' : dir === 'e' ? 'w' : 'e';
    this.loadScreen(next, from);
  },

  update(dt) {
    this.time += dt;
    this.waterPhase += dt;
    if (this.cameraShake > 0) this.cameraShake -= dt;
    if (this.doorCooldown > 0) this.doorCooldown -= dt;
    if (this.transitionCooldown > 0) this.transitionCooldown -= dt;

    if (this.state === 'itemget') {
      this.itemGetTimer -= dt;
      if (this.itemGetTimer <= 0 || Input.wasPressed('action') || Input.wasPressed('sword')) {
        UI.hide('item-get');
        this.state = 'play';
        UI.setTouchPad(true);
      }
      Input.endFrame();
      return;
    }

    if (this.state === 'dialogue') {
      if (Input.wasPressed('action') || Input.wasPressed('sword')) this.advanceDialogue();
      Input.endFrame();
      return;
    }

    if (this.state === 'inventory') {
      if (Input.wasPressed('inventory') || Input.wasPressed('pause') || Input.wasPressed('action')) {
        UI.hide('inventory');
        this.state = 'play';
        UI.setTouchPad(true);
      }
      // use potion
      if (Input.wasPressed('item') && this.player.potions > 0 && this.player.hp < this.player.maxHp) {
        this.player.potions--;
        this.player.heal(6);
        AudioSys.sfx.heart();
        UI.renderInventory();
      }
      Input.endFrame();
      return;
    }

    if (this.state === 'map') {
      if (Input.wasPressed('map') || Input.wasPressed('pause') || Input.wasPressed('action')) {
        UI.hide('map-overlay');
        this.state = 'play';
        UI.setTouchPad(true);
      }
      Input.endFrame();
      return;
    }

    if (this.state === 'pause') {
      if (Input.wasPressed('pause')) this.resume();
      Input.endFrame();
      return;
    }

    if (this.state !== 'play') {
      Input.endFrame();
      return;
    }

    if (Input.wasPressed('pause')) {
      this.state = 'pause';
      UI.setTouchPad(false);
      UI.show('pause-screen');
      Input.endFrame();
      return;
    }
    if (Input.wasPressed('inventory')) {
      this.state = 'inventory';
      UI.setTouchPad(false);
      UI.renderInventory();
      UI.show('inventory');
      Input.endFrame();
      return;
    }
    if (Input.wasPressed('map')) {
      this.state = 'map';
      UI.setTouchPad(false);
      UI.drawMinimap();
      UI.show('map-overlay');
      Input.endFrame();
      return;
    }
    if (Input.wasPressed('action')) this.interact();

    // drink potion quickly with no bombs? keep bomb on X; potion via inventory

    this.player.update(dt, this);
    this.handleSwordHits();
    for (const e of this.entities) {
      if (e.update && !e.dead) e.update(dt, this, this.player);
    }
    for (const b of this.bombs) b.update(dt, this);
    for (const pr of this.projectiles) pr.update(dt, this, this.player);
    this.collectPickups();
    this.checkDoorTrigger();
    this.entities = this.entities.filter((e) => !e.dead);
    this.bombs = this.bombs.filter((b) => !b.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.checkScreenExit();
    Input.endFrame();
  },

  tileImage(ch) {
    if (ch === '~') return Assets.get('tile_water');
    if (ch === 'g' || ch === 'T' || ch === 'B') return Assets.get('tile_grass');
    if (ch === 'w') return Assets.get('tile_wood');
    if (ch === '#' || ch === '=' || ch === ':' || ch === 'D' || ch === 'd' || ch === 'H') return Assets.get('tile_stone');
    if (ch === 'R') return Assets.get('tile_sand');
    return Assets.get(this.screen.biome === 'grass' ? 'tile_grass'
      : this.screen.biome === 'dungeon' || this.screen.biome === 'stone' ? 'tile_stone'
        : this.screen.biome === 'sand' ? 'tile_sand' : 'tile_sand');
  },

  draw() {
    const ctx = this.ctx;
    const { TILE, MAP_W, MAP_H } = Maps;
    ctx.save();
    let sx = 0, sy = 0;
    if (this.cameraShake > 0) {
      sx = (Math.random() - 0.5) * 10;
      sy = (Math.random() - 0.5) * 10;
    }
    ctx.translate(sx, sy + 48); // HUD offset

    // clear playfield
    ctx.fillStyle = '#062029';
    ctx.fillRect(-sx, -sy - 48, this.canvas.width, this.canvas.height);

    if (this.state === 'title') {
      ctx.restore();
      return;
    }

    // tiles
    const grid = this.screen.map.grid;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const ch = grid[y][x];
        let img = this.tileImage(ch);
        if (ch === '.' ) {
          img = Assets.get(this.screen.biome === 'grass' ? 'tile_grass'
            : this.screen.biome === 'dungeon' || this.screen.biome === 'stone' ? 'tile_stone'
              : 'tile_sand');
        }
        if (ch === 'S' || ch === 'N' || ch === 'C') {
          img = Assets.get(this.screen.biome === 'grass' ? 'tile_grass'
            : this.screen.biome === 'dungeon' || this.screen.biome === 'stone' ? 'tile_stone'
              : this.screen.biome === 'sand' ? 'tile_sand' : 'tile_sand');
        }
        ctx.drawImage(img, x * TILE, y * TILE, TILE, TILE);
        if (ch === '~') {
          ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.sin(this.waterPhase * 3 + x + y) * 0.05})`;
          ctx.fillRect(x * TILE + 8, y * TILE + 12, 10, 4);
        }
        if (ch === '#') {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
        if (ch === ':') {
          ctx.fillStyle = 'rgba(40,30,20,0.45)';
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }

    // sort draw by y
    const drawList = [...this.entities.filter((e) => !e.dead)];
    if (this.player && !this.player.dead) drawList.push(this.player);
    drawList.sort((a, b) => a.y - b.y);
    for (const e of drawList) e.draw(ctx);
    for (const b of this.bombs) b.draw(ctx);
    for (const pr of this.projectiles) pr.draw(ctx);

    // room name
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(8, 8, 200, 22);
    ctx.fillStyle = '#e0b145';
    ctx.font = '16px Pirata One, serif';
    ctx.fillText(this.screen.name, 14, 24);

    ctx.restore();

    // top HUD bar fill
    ctx.fillStyle = 'rgba(8,20,28,0.92)';
    ctx.fillRect(0, 0, this.canvas.width, 48);
  },

  last: 0,
  loop(ts) {
    const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000);
    this.last = ts;
    if (this.state !== 'title' && this.state !== 'dead' && this.state !== 'win') {
      this.update(dt);
    } else {
      // still allow restart keys etc.
      if (this.state === 'title' && Input.wasPressed('action')) this.startGame();
      Input.endFrame();
    }
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  },
};

window.addEventListener('load', () => Game.init());
