/* Asset loader — Grok Imagine sprites, tiles, UI */
const Assets = (() => {
  const images = {};
  const manifest = {
    player_down: 'assets/sprites/player_down.png',
    player_up: 'assets/sprites/player_up.png',
    player_left: 'assets/sprites/player_left.png',
    player_right: 'assets/sprites/player_right.png',
    enemy_skeleton: 'assets/sprites/enemy_skeleton.png',
    enemy_crab: 'assets/sprites/enemy_crab.png',
    enemy_pirate: 'assets/sprites/enemy_pirate.png',
    boss_captain: 'assets/sprites/boss_captain.png',
    npc_fisherman: 'assets/sprites/npc_fisherman.png',
    npc_shopkeeper: 'assets/sprites/npc_shopkeeper.png',
    prop_palm: 'assets/sprites/prop_palm.png',
    prop_chest: 'assets/sprites/prop_chest.png',
    prop_rock: 'assets/sprites/prop_rock.png',
    prop_door: 'assets/sprites/prop_door.png',
    prop_bush: 'assets/sprites/prop_bush.png',
    prop_hut: 'assets/sprites/prop_hut.png',
    prop_boat: 'assets/sprites/prop_boat.png',
    prop_sign: 'assets/sprites/prop_sign.png',
    tile_sand: 'assets/tiles/tile_sand.png',
    tile_water: 'assets/tiles/tile_water.png',
    tile_grass: 'assets/tiles/tile_grass.png',
    tile_stone: 'assets/tiles/tile_stone.png',
    tile_wood: 'assets/tiles/tile_wood.png',
    item_sword: 'assets/ui/item_sword.png',
    item_heart: 'assets/ui/item_heart.png',
    item_key: 'assets/ui/item_key.png',
    item_bomb: 'assets/ui/item_bomb.png',
    item_coin: 'assets/ui/item_coin.png',
    item_compass: 'assets/ui/item_compass.png',
    item_map: 'assets/ui/item_map.png',
    item_potion: 'assets/ui/item_potion.png',
    title_bg: 'assets/bg/title_bg.png',
  };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load ' + src));
      img.src = src;
    });
  }

  async function loadAll(onProgress) {
    const keys = Object.keys(manifest);
    let done = 0;
    await Promise.all(keys.map(async (key) => {
      images[key] = await loadImage(manifest[key]);
      done++;
      if (onProgress) onProgress(done / keys.length);
    }));
    return images;
  }

  function get(key) {
    return images[key];
  }

  return { loadAll, get, images };
})();
