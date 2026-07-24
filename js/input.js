/* Keyboard + touch / virtual-pad input */
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

  function press(a) {
    if (!a) return;
    if (!down.has(a)) pressed.add(a);
    down.add(a);
  }

  function release(a) {
    if (!a) return;
    down.delete(a);
  }

  function releaseAll(actions) {
    (actions || [...down]).forEach((a) => down.delete(a));
  }

  function tap(a) {
    press(a);
    // keep pressed flag for one frame; release held state next tick
    setTimeout(() => down.delete(a), 0);
  }

  function isDown(a) { return down.has(a); }
  function wasPressed(a) { return pressed.has(a); }
  function endFrame() { pressed.clear(); }

  function isTouchDevice() {
    try {
      if (window.matchMedia('(pointer: coarse)').matches) return true;
      if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true;
      if (window.matchMedia('(hover: none)').matches && window.innerWidth < 1024) return true;
    } catch (_) {}
    if (navigator.maxTouchPoints > 0) return true;
    if ('ontouchstart' in window) return true;
    if (window.innerWidth <= 900) return true;
    const ua = navigator.userAgent || '';
    if (/Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua)) return true;
    return false;
  }

  /** Bind on-screen control pad buttons with data-action attributes */
  function bindTouchPad(root) {
    if (!root) return;
    const dirs = new Set(['up', 'down', 'left', 'right']);
    const held = new Map(); // pointerId -> action

    const actionFromTarget = (el) => {
      const btn = el?.closest?.('[data-action]');
      return btn ? btn.getAttribute('data-action') : null;
    };

    const onDown = (e) => {
      const action = actionFromTarget(e.target);
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      const id = e.pointerId ?? 'mouse';
      // one pointer = one action; release previous if changed
      const prev = held.get(id);
      if (prev && prev !== action) release(prev);
      held.set(id, action);
      press(action);
      e.target.closest('[data-action]')?.classList.add('active');
    };

    const onUp = (e) => {
      const id = e.pointerId ?? 'mouse';
      const action = held.get(id) || actionFromTarget(e.target);
      if (action) {
        release(action);
        root.querySelector(`[data-action="${action}"]`)?.classList.remove('active');
      }
      held.delete(id);
      e.preventDefault();
    };

    // D-pad: allow sliding between directions
    const dpad = root.querySelector('#dpad');
    if (dpad) {
      const dirFromPoint = (clientX, clientY) => {
        const rect = dpad.getBoundingClientRect();
        const x = (clientX - rect.left) / rect.width - 0.5;
        const y = (clientY - rect.top) / rect.height - 0.5;
        const dead = 0.12;
        if (Math.abs(x) < dead && Math.abs(y) < dead) return null;
        if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'right' : 'left';
        return y > 0 ? 'down' : 'up';
      };

      let dpadPointer = null;
      let dpadDir = null;

      const setDpadDir = (next) => {
        if (dpadDir === next) return;
        if (dpadDir) {
          release(dpadDir);
          dpad.querySelector(`[data-action="${dpadDir}"]`)?.classList.remove('active');
        }
        dpadDir = next;
        if (dpadDir) {
          press(dpadDir);
          dpad.querySelector(`[data-action="${dpadDir}"]`)?.classList.add('active');
        }
      };

      dpad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        dpad.setPointerCapture?.(e.pointerId);
        dpadPointer = e.pointerId;
        setDpadDir(dirFromPoint(e.clientX, e.clientY));
      });
      dpad.addEventListener('pointermove', (e) => {
        if (dpadPointer !== e.pointerId) return;
        e.preventDefault();
        setDpadDir(dirFromPoint(e.clientX, e.clientY));
      });
      const endDpad = (e) => {
        if (dpadPointer != null && e.pointerId !== dpadPointer) return;
        setDpadDir(null);
        dpadPointer = null;
      };
      dpad.addEventListener('pointerup', endDpad);
      dpad.addEventListener('pointercancel', endDpad);
      dpad.addEventListener('lostpointercapture', endDpad);
    }

    // Action buttons (not on dpad)
    root.querySelectorAll('.touch-btn[data-action]').forEach((btn) => {
      if (btn.closest('#dpad')) return;
      btn.addEventListener('pointerdown', onDown);
      btn.addEventListener('pointerup', onUp);
      btn.addEventListener('pointercancel', onUp);
      btn.addEventListener('pointerleave', (e) => {
        // only release if this pointer was holding the button
        if (held.get(e.pointerId) === btn.getAttribute('data-action')) onUp(e);
      });
    });

    // Prevent page scroll / zoom while using pad
    root.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  return { isDown, wasPressed, endFrame, press, release, releaseAll, tap, isTouchDevice, bindTouchPad };
})();
