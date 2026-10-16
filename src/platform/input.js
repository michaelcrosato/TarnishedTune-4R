/** PS5-compatible standard gamepad mapping, with keyboard/mouse mapped to the same actions. */
export const KEYS = {
  KeyJ: 'light',
  KeyK: 'heavy',
  Space: 'roll',
  KeyF: 'parry',
  KeyE: 'interact',
  KeyH: 'heal',
  KeyR: 'skill',
  KeyQ: 'weapon',
  Tab: 'lock',
  KeyC: 'cycle',
  KeyV: 'jump',
  Escape: 'pause',
  Enter: 'confirm',
  Backspace: 'back',
  KeyM: 'journal',
};
export const PAD = {
  0: 'confirm',
  1: 'roll',
  2: 'heal',
  3: 'interact',
  4: 'guard',
  5: 'light',
  6: 'parry',
  7: 'heavy',
  9: 'pause',
  10: 'sprint',
  11: 'lock',
  12: 'journal',
  13: 'jump',
  14: 'cycle',
  15: 'weapon',
};
const dead = (v, d = 0.2) => (Math.abs(v) < d ? 0 : (Math.sign(v) * (Math.abs(v) - d)) / (1 - d));
export function cameraMove(x, z, yaw) {
  const len = Math.max(1, Math.hypot(x, z));
  return [(-x * Math.cos(yaw) + z * Math.sin(yaw)) / len, (x * Math.sin(yaw) + z * Math.cos(yaw)) / len];
}
export function gamepadState(pad) {
  if (!pad) return { held: [], move: [0, 0], look: [0, 0], axes: [0, 0], active: false };
  const buttons = pad.buttons.map((b) => (typeof b === 'number' ? b > 0.5 : b.pressed || b.value > 0.5)),
    held = [];
  for (const [i, name] of Object.entries(PAD)) if (buttons[i]) held.push(name);
  // Cross is jump during gameplay, confirm in menus. L2+R2 is Resonance.
  if (buttons[0]) held.push('jump');
  if (buttons[6] && buttons[7]) {
    held.push('skill');
    held.splice(held.indexOf('parry'), 1);
    held.splice(held.indexOf('heavy'), 1);
  }
  const move = [dead(pad.axes[0] || 0), dead(-(pad.axes[1] || 0))],
    look = [dead(pad.axes[2] || 0), dead(pad.axes[3] || 0)];
  return {
    held,
    move,
    look,
    axes: [pad.axes[0] || 0, pad.axes[1] || 0],
    active: buttons.some(Boolean) || move.some((v) => v !== 0) || look.some((v) => v !== 0),
  };
}
export function createInput(onPhysical) {
  const keys = new Set(),
    press = new Set(),
    mouse = new Set();
  let previousPad = new Set(),
    lookAccum = [0, 0],
    device = 'keyboard',
    mouseDown = false;
  function physical(event) {
    device = event?.type?.startsWith('touch') ? 'touch' : 'keyboard';
    return onPhysical(event);
  }
  addEventListener('keydown', (e) => {
    if (
      ['Space', 'Tab', 'Enter', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
        e.code,
      )
    )
      e.preventDefault();
    if (physical(e)) {
      keys.clear();
      press.clear();
      return;
    }
    if (!e.repeat) {
      if (KEYS[e.code]) press.add(KEYS[e.code]);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') press.add('up');
      if (e.code === 'ArrowDown' || e.code === 'KeyS') press.add('down');
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') press.add('left');
      if (e.code === 'ArrowRight' || e.code === 'KeyD') press.add('right');
    }
    keys.add(e.code);
  });
  addEventListener('keyup', (e) => {
    physical(e);
    keys.delete(e.code);
  });
  addEventListener('pointerdown', (e) => {
    if (physical(e)) return;
    if (e.target.tagName !== 'CANVAS') return;
    mouseDown = true;
    const action = e.button === 2 ? 'guard' : 'light';
    mouse.add(action);
    press.add(action);
  });
  addEventListener('pointerup', (e) => {
    physical(e);
    mouseDown = false;
    mouse.clear();
  });
  addEventListener('pointermove', (e) => {
    if (e.movementX || e.movementY) {
      if (physical(e)) return;
      if (e.target.tagName === 'CANVAS' && mouseDown) {
        lookAccum[0] += e.movementX * 0.055;
        lookAccum[1] += e.movementY * 0.055;
      }
    }
  });
  addEventListener('wheel', physical, { passive: true });
  addEventListener('touchstart', physical, { passive: true });
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('blur', () => {
    keys.clear();
    mouse.clear();
    press.clear();
    previousPad.clear();
  });
  let injectedPad = null,
    menuHeld = '',
    nextRepeat = 0,
    sprintLatched = false;
  return {
    get device() {
      return device;
    },
    injectPad(value) {
      injectedPad = value;
    },
    clear() {
      keys.clear();
      mouse.clear();
      press.clear();
      lookAccum = [0, 0];
    },
    poll(yaw, dt, time) {
      const pads = navigator.getGamepads?.() || [],
        pad = injectedPad || Array.from(pads).find((p) => p?.connected),
        s = gamepadState(pad);
      if (s.active) {
        device = 'gamepad';
        if (onPhysical({ type: 'gamepad' })) {
          previousPad = new Set(s.held);
          press.clear();
          return { move: [0, 0], look: [0, 0], p: [], b: [] };
        }
      }
      const buttons = new Set(s.held);
      if (buttons.has('sprint') && !previousPad.has('sprint')) sprintLatched = !sprintLatched;
      if (Math.hypot(...s.move) < 0.05) sprintLatched = false;
      for (const b of buttons) if (!previousPad.has(b)) press.add(b);
      previousPad = buttons;
      const x =
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) +
        s.move[0];
      const z =
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) +
        s.move[1];
      const move = cameraMove(x, z, yaw);
      const b = [...mouse, ...s.held.filter((v) => v === 'guard')];
      if (sprintLatched) b.push('sprint');
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) b.push('sprint');
      if (keys.has('KeyL')) b.push('guard');
      const direction =
        s.axes[1] < -0.5
          ? 'up'
          : s.axes[1] > 0.5
            ? 'down'
            : s.axes[0] < -0.5
              ? 'left'
              : s.axes[0] > 0.5
                ? 'right'
                : pad?.buttons[12]?.pressed
                  ? 'up'
                  : pad?.buttons[13]?.pressed
                    ? 'down'
                    : pad?.buttons[14]?.pressed
                      ? 'left'
                      : pad?.buttons[15]?.pressed
                        ? 'right'
                        : '';
      if (direction && (direction !== menuHeld || time > nextRepeat)) {
        press.add(direction);
        nextRepeat = time + (direction === menuHeld ? 0.13 : 0.36);
      }
      menuHeld = direction;
      const p = [...press];
      press.clear();
      const look = [s.look[0] + lookAccum[0], s.look[1] + lookAccum[1]];
      lookAccum = [0, 0];
      return { move, look, p, b };
    },
    rumble(amount = 0.4) {
      const pad = Array.from(navigator.getGamepads?.() || []).find((p) => p?.connected);
      try {
        pad?.vibrationActuator
          ?.playEffect('dual-rumble', { duration: 90, strongMagnitude: amount, weakMagnitude: amount * 0.5 })
          ?.catch(() => {});
      } catch {}
    },
  };
}
