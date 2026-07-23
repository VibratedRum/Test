/**
 * Pirate Enemies — hyper-realistic 2D / 3D showcase
 * Character art generated with Grok Imagine.
 */

import { createArena2D } from './arena2d.js';
import { createArena3D } from './arena3d.js';

const views = {
  gallery: document.getElementById('view-gallery'),
  '2d': document.getElementById('view-2d'),
  '3d': document.getElementById('view-3d'),
};

const modeButtons = document.querySelectorAll('.mode-btn');
const jumpButtons = document.querySelectorAll('[data-jump]');

let arena2d = null;
let arena3d = null;
let activeMode = 'gallery';

function setMode(mode) {
  if (!views[mode] || mode === activeMode) {
    if (mode === activeMode) return;
  }

  activeMode = mode;

  for (const [key, el] of Object.entries(views)) {
    const on = key === mode;
    el.hidden = !on;
    el.classList.toggle('is-active', on);
  }

  modeButtons.forEach((btn) => {
    const on = btn.dataset.mode === mode;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', String(on));
  });

  if (mode === '2d') {
    if (!arena2d) arena2d = createArena2D(document.getElementById('arena-2d'));
    arena2d.resume();
    arena3d?.pause();
  } else if (mode === '3d') {
    if (!arena3d) arena3d = createArena3D(document.getElementById('arena-3d'));
    arena3d.resume();
    arena2d?.pause();
  } else {
    arena2d?.pause();
    arena3d?.pause();
  }
}

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

jumpButtons.forEach((btn) => {
  btn.addEventListener('click', () => setMode(btn.dataset.jump));
});

document.getElementById('spawn-2d')?.addEventListener('click', () => {
  arena2d?.spawn();
});
document.getElementById('attack-2d')?.addEventListener('click', () => {
  arena2d?.attackAll();
});
document.getElementById('spawn-3d')?.addEventListener('click', () => {
  arena3d?.spawn();
});
document.getElementById('attack-3d')?.addEventListener('click', () => {
  arena3d?.attackAll();
});
document.getElementById('orbit-3d')?.addEventListener('click', () => {
  arena3d?.toggleOrbit();
});

setMode('gallery');
