/* Coral Cay — screen-based world like ALttP */
const TILE = 48;
const MAP_W = 16;
const MAP_H = 11; // playfield under 48px HUD → 528px

/*
 Tile legend:
  . sand   ~ water (solid)   g grass   w wood dock
  # stone wall (solid)  = stone floor  : cliff/rock solid
  T tree solid   B bush cuttable   R rock bombable
  D locked door  d open door / stairs
  H hut blocker  C chest spot (entity)  N npc spot
  S spawn
*/

const Maps = (() => {
  const overworld = {};
  const dungeon = {};

  function parse(rows) {
    const grid = rows.map((r) => r.split(''));
    return { w: MAP_W, h: MAP_H, grid };
  }

  // Row must be exactly 16 chars
  overworld['0,0'] = {
    name: 'South Dock',
    biome: 'sand',
    music: 'overworld',
    map: parse([
      'ggTgggg::ggggTgg',
      'g..............g',
      'g..T........T..g',
      'g..............g',
      'g......S.......g',
      'wwwwwwwwwwwwwwww',
      '~~~~~~~~~~~~~~~.',
      '~~~~~~~~~~~~~~~.',
      '~~~~~~~~~~~~~~~.',
      '~~~~~~~~~~~~~~~.',
      '~~~~~~~~~~~~~~~.',
    ]),
    links: { n: '0,1' },
    entities: [
      { type: 'npc', id: 'fisherman', x: 4, y: 3, sprite: 'npc_fisherman', name: 'Old Finn',
        lines: [
          "Ahoy, matey! Name's Finn. Storm washed ye onto Coral Cay?",
          "Captain Bones stole the Sea Crown from the village shrine.",
          "Take my old cutlass from the chest by the palms. Ye'll need it.",
          "Bones hides in the Blackreef Fortress north of the jungle.",
        ]},
      { type: 'prop', id: 'boat', x: 11, y: 4, sprite: 'prop_boat', solid: true },
      { type: 'prop', id: 'palm1', x: 2, y: 2, sprite: 'prop_palm', solid: true },
      { type: 'prop', id: 'palm2', x: 12, y: 2, sprite: 'prop_palm', solid: true },
      { type: 'chest', id: 'chest_sword', x: 13, y: 3, loot: 'sword',
        message: 'You found the Tide Cutlass!' },
      { type: 'sign', id: 'sign1', x: 7, y: 3, sprite: 'prop_sign',
        lines: ['CORAL CAY', '← Village   Jungle ↑', 'Dock of Lost Anchors'] },
    ],
  };

  overworld['0,1'] = {
    name: 'Palm Path',
    biome: 'grass',
    music: 'overworld',
    map: parse([
      'Tggggg..gggggggT',
      'gT............Tg',
      'g..B..T..T..B..g',
      'g..............g',
      'g......S.......g',
      'g..T........T..g',
      'g..............g',
      'g..B........B..g',
      'g..............g',
      'Tg............gT',
      'TTggggggggggggTT',
    ]),
    links: { n: '0,2', s: '0,0', e: '1,1', w: null },
    entities: [
      { type: 'enemy', kind: 'crab', x: 4, y: 5 },
      { type: 'enemy', kind: 'crab', x: 11, y: 6 },
      { type: 'prop', id: 'palm3', x: 3, y: 2, sprite: 'prop_palm', solid: true },
      { type: 'prop', id: 'palm4', x: 12, y: 5, sprite: 'prop_palm', solid: true },
      { type: 'bush', x: 3, y: 2 },
      { type: 'bush', x: 12, y: 2 },
      { type: 'bush', x: 3, y: 7 },
      { type: 'bush', x: 12, y: 7 },
      { type: 'pickup', kind: 'coin', x: 8, y: 3 },
    ],
  };

  overworld['1,1'] = {
    name: 'Tide Village',
    biome: 'sand',
    music: 'overworld',
    map: parse([
      '############g:::',
      '#..........#ggg.',
      '#..H.......#g...',
      '#..........#g.T.',
      '#....S.....#g...',
      '#..........#ggg.',
      '#..........#####',
      '#..............#',
      '#....N.........#',
      '#..............#',
      '################',
    ]),
    links: { w: '0,1', n: '1,2' },
    entities: [
      { type: 'prop', id: 'hut', x: 3, y: 2, sprite: 'prop_hut', solid: true },
      { type: 'npc', id: 'shop', x: 5, y: 8, sprite: 'npc_shopkeeper', name: 'Madam Pearl',
        lines: [
          "Welcome to Pearl's Provisions, sailor.",
          "Bombs are 20 doubloons. A red potion is 15.",
          "Press X near me if ye have the coin… or buy from the chests I stocked.",
          "The fortress door needs a Skeleton Key. Crabs and bones guard the ruins.",
        ],
        shop: true },
      { type: 'chest', id: 'chest_bombs', x: 10, y: 8, loot: 'bombs', cost: 20,
        message: 'Bought a pouch of Bombs! (x5)' },
      { type: 'chest', id: 'chest_potion', x: 12, y: 8, loot: 'potion', cost: 15,
        message: 'Bought a Tide Potion!' },
      { type: 'chest', id: 'chest_heart', x: 2, y: 7, loot: 'heart_container',
        message: 'A Heart Container! Max health up!' },
      { type: 'sign', id: 'signv', x: 8, y: 4, sprite: 'prop_sign',
        lines: ['TIDE VILLAGE', 'May the Sea Crown return.'] },
    ],
  };

  overworld['0,2'] = {
    name: 'Jungle Bend',
    biome: 'grass',
    music: 'overworld',
    map: parse([
      'TTTT..::::..TTTT',
      'TT............TT',
      'T..B.R....R.B..T',
      'T..............T',
      'T......S.......T',
      'T..T........T..T',
      'T..............T',
      'T..B........B..T',
      'T..............T',
      'TT............TT',
      'TTTTgg....ggTTTT',
    ]),
    links: { s: '0,1', e: '1,2', n: '0,3' },
    entities: [
      { type: 'enemy', kind: 'crab', x: 5, y: 6 },
      { type: 'enemy', kind: 'skeleton', x: 10, y: 4 },
      { type: 'enemy', kind: 'skeleton', x: 7, y: 7 },
      { type: 'rock', x: 5, y: 2 },
      { type: 'rock', x: 10, y: 2 },
      { type: 'bush', x: 3, y: 2 },
      { type: 'bush', x: 12, y: 2 },
      { type: 'bush', x: 3, y: 7 },
      { type: 'bush', x: 12, y: 7 },
      { type: 'chest', id: 'chest_key_hint', x: 8, y: 3, loot: 'coin_bag',
        message: 'A bag of doubloons! (x10)' },
      { type: 'prop', id: 'palm5', x: 4, y: 5, sprite: 'prop_palm', solid: true },
      { type: 'prop', id: 'palm6', x: 11, y: 5, sprite: 'prop_palm', solid: true },
    ],
  };

  overworld['1,2'] = {
    name: 'Ruined Watch',
    biome: 'stone',
    music: 'overworld',
    map: parse([
      '########..######',
      '#..............#',
      '#..R........R..#',
      '#..............#',
      '#......S.......#',
      '#..............#',
      '#..=======.....#',
      '#..=........=..#',
      '#..====.====...#',
      '#..............#',
      '######....######',
    ]),
    links: { w: '0,2', s: '1,1', n: '1,3' },
    entities: [
      { type: 'enemy', kind: 'pirate', x: 4, y: 3 },
      { type: 'enemy', kind: 'pirate', x: 11, y: 5 },
      { type: 'enemy', kind: 'skeleton', x: 8, y: 7 },
      { type: 'rock', x: 3, y: 2 },
      { type: 'rock', x: 12, y: 2 },
      { type: 'chest', id: 'chest_ruins_key', x: 8, y: 8, loot: 'key',
        message: 'You found the Skeleton Key!' },
      { type: 'pickup', kind: 'heart', x: 3, y: 8 },
    ],
  };

  overworld['0,3'] = {
    name: 'Cliff Approach',
    biome: 'grass',
    music: 'overworld',
    map: parse([
      '::::########::::',
      '::::#......#::::',
      'gggg#......#gggg',
      'g...........T..g',
      'g......S.......g',
      'g..T........T..g',
      'g..............g',
      'g..B...R...B...g',
      'g..............g',
      'gg............gg',
      'TTgg........ggTT',
    ]),
    links: { s: '0,2', e: '1,3' },
    entities: [
      { type: 'enemy', kind: 'pirate', x: 5, y: 6 },
      { type: 'enemy', kind: 'skeleton', x: 10, y: 5 },
      { type: 'door', id: 'fortress_door', x: 7.5, y: 2, locked: true, target: 'd0' },
      { type: 'rock', x: 7, y: 7 },
      { type: 'bush', x: 3, y: 7 },
      { type: 'bush', x: 11, y: 7 },
      { type: 'sign', id: 'signf', x: 4, y: 3, sprite: 'prop_sign',
        lines: ['BLACKREEF FORTRESS', 'Only a Skeleton Key opens these gates.'] },
      { type: 'prop', id: 'palm7', x: 12, y: 3, sprite: 'prop_palm', solid: true },
      { type: 'prop', id: 'palm8', x: 3, y: 5, sprite: 'prop_palm', solid: true },
    ],
  };

  overworld['1,3'] = {
    name: 'North Bluff',
    biome: 'stone',
    music: 'overworld',
    map: parse([
      '################',
      '#~~~~~~~~~~~~~~#',
      '#~............~#',
      '#~..R......R..~#',
      '#~.....S......~#',
      '#~............~#',
      '#~~~~~~~~~~~~~~#',
      '#..............#',
      '#..B........B..#',
      '#..............#',
      '######....######',
    ]),
    links: { w: '0,3', s: '1,2' },
    entities: [
      { type: 'enemy', kind: 'crab', x: 5, y: 8 },
      { type: 'enemy', kind: 'crab', x: 10, y: 8 },
      { type: 'rock', x: 4, y: 3 },
      { type: 'rock', x: 11, y: 3 },
      { type: 'chest', id: 'chest_bluff', x: 8, y: 4, loot: 'bombs',
        message: 'You found Bombs! (x3)' },
      { type: 'bush', x: 3, y: 8 },
      { type: 'bush', x: 12, y: 8 },
    ],
  };

  // Dungeon rooms
  dungeon.d0 = {
    name: 'Fortress Gatehall',
    biome: 'dungeon',
    music: 'dungeon',
    map: parse([
      '################',
      '#==============#',
      '#=............=#',
      '#=............=#',
      '#=.....S......=#',
      '#=............=#',
      '#=............=#',
      '#=.....##.....=#',
      '#=............=#',
      '#=======dd=====#',
      '################',
    ]),
    links: { s: 'over:0,3', n: 'd1' },
    entities: [
      { type: 'enemy', kind: 'skeleton', x: 4, y: 3 },
      { type: 'enemy', kind: 'skeleton', x: 11, y: 3 },
      { type: 'enemy', kind: 'pirate', x: 8, y: 6 },
      { type: 'chest', id: 'd_map', x: 3, y: 8, loot: 'map',
        message: 'You found the Dungeon Map!' },
      { type: 'pickup', kind: 'coin', x: 12, y: 8 },
    ],
  };

  dungeon.d1 = {
    name: 'Powder Gallery',
    biome: 'dungeon',
    music: 'dungeon',
    map: parse([
      '################',
      '#======dd======#',
      '#=............=#',
      '#=..R......R..=#',
      '#=.....S......=#',
      '#=............=#',
      '#=..########..=#',
      '#=............=#',
      '#=............=#',
      '#======dd======#',
      '################',
    ]),
    links: { s: 'd0', n: 'd2', e: 'd1b' },
    entities: [
      { type: 'enemy', kind: 'pirate', x: 4, y: 7 },
      { type: 'enemy', kind: 'pirate', x: 11, y: 7 },
      { type: 'rock', x: 4, y: 3 },
      { type: 'rock', x: 11, y: 3 },
      { type: 'chest', id: 'd_compass', x: 8, y: 8, loot: 'compass',
        message: 'You found the Compass!' },
      { type: 'pickup', kind: 'heart', x: 8, y: 2 },
    ],
  };

  dungeon.d1b = {
    name: 'Side Cache',
    biome: 'dungeon',
    music: 'dungeon',
    map: parse([
      '################',
      '#==============#',
      '#=............=#',
      '#=............=#',
      '#=S...........=#',
      '#=............=#',
      '#=............=#',
      '#=............=#',
      '#=............=#',
      '#==============#',
      '################',
    ]),
    links: { w: 'd1' },
    entities: [
      { type: 'enemy', kind: 'skeleton', x: 10, y: 4 },
      { type: 'enemy', kind: 'skeleton', x: 10, y: 7 },
      { type: 'chest', id: 'd_bigkey_heart', x: 12, y: 5, loot: 'heart_container',
        message: 'A Heart Container!' },
      { type: 'chest', id: 'd_bombs2', x: 12, y: 7, loot: 'bombs',
        message: 'Bombs! (x5)' },
    ],
  };

  dungeon.d2 = {
    name: 'Throne Ante',
    biome: 'dungeon',
    music: 'dungeon',
    map: parse([
      '########dd######',
      '#==============#',
      '#=............=#',
      '#=..##....##..=#',
      '#=.....S......=#',
      '#=............=#',
      '#=..##....##..=#',
      '#=............=#',
      '#=............=#',
      '#======dd======#',
      '################',
    ]),
    links: { s: 'd1', n: 'dboss' },
    entities: [
      { type: 'enemy', kind: 'pirate', x: 3, y: 4 },
      { type: 'enemy', kind: 'pirate', x: 12, y: 4 },
      { type: 'enemy', kind: 'skeleton', x: 5, y: 7 },
      { type: 'enemy', kind: 'skeleton', x: 10, y: 7 },
      { type: 'pickup', kind: 'potion', x: 8, y: 5 },
    ],
  };

  dungeon.dboss = {
    name: 'Captain Bones',
    biome: 'dungeon',
    music: 'boss',
    map: parse([
      '################',
      '#==============#',
      '#=............=#',
      '#=............=#',
      '#=.....S......=#',
      '#=............=#',
      '#=............=#',
      '#=............=#',
      '#=............=#',
      '#======dd======#',
      '################',
    ]),
    links: { s: 'd2' },
    entities: [
      { type: 'boss', kind: 'captain', x: 8, y: 3 },
    ],
  };

  const solidChars = new Set(['#', '~', ':', 'T', 'H']);
  // D and R and B handled as entities mostly; map D is wall until unlocked

  function getScreen(id) {
    if (id.startsWith('d') || id === 'dboss') return dungeon[id];
    return overworld[id];
  }

  function isTileSolid(ch) {
    return solidChars.has(ch) || ch === 'D';
  }

  function walkable(screen, tx, ty) {
    if (!screen) return false;
    if (ty < 0 || ty >= MAP_H || tx < 0 || tx >= MAP_W) return true; // screen transition
    const ch = screen.map.grid[ty][tx];
    return !isTileSolid(ch);
  }

  function findSpawn(screen) {
    const g = screen.map.grid;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (g[y][x] === 'S') return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
      }
    }
    return { x: 8 * TILE, y: 5 * TILE };
  }

  const worldGraph = [
    ['0,3', '1,3'],
    ['0,2', '1,2'],
    ['0,1', '1,1'],
    ['0,0', null],
  ];

  return {
    TILE, MAP_W, MAP_H, overworld, dungeon, getScreen, walkable, findSpawn,
    isTileSolid, worldGraph,
  };
})();
