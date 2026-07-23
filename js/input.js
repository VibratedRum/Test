/* Keyboard + touch-friendly input */
const Input = (() => {
  const down = new Set();
  const pressed = new Set();
  const map = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
    z: 'sword', Z: 'sword', j: 'sword', J: 'sword',
    x: 'item', X: 'item', k: 'item', K: 'item',
    ' ': 'action', Enter: 'action',
    i: 'inventory', I: 'inventory',
    m: 'map', M: 'map',
    Escape: 'pause', p: 'pause', P: 'pause',
  };

  window.addEventListener('keydown', (e) => {
    const a = map[e.key];
    if (!a) return;
    e.preventDefault();
    if (!down.has(a)) pressed.add(a);
    down.add(a);
  });
  window.addEventListener('keyup', (e) => {
    const a = map[e.key];
    if (!a) return;
    down.delete(a);
  });
  window.addEventListener('blur', () => {
    down.clear();
    pressed.clear();
  });

  function isDown(a) { return down.has(a); }
  function wasPressed(a) { return pressed.has(a); }
  function endFrame() { pressed.clear(); }

  return { isDown, wasPressed, endFrame };
})();
