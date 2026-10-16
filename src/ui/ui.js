/** Large-focus game screens and read-only HUD. UI commands are routed through the application's intent boundary. */
import { ITEMS, NPC, WEAPONS } from '../sim/content.js';
const sigil = `<svg class="title-sigil" viewBox="0 0 80 100" fill="none" stroke="#c8ae75" stroke-width=".9" aria-hidden="true"><circle cx="40" cy="40" r="25"/><circle cx="40" cy="40" r="30" stroke-dasharray="1 6"/><path d="M40 1v91M18 41C18 9 62 9 62 41l7 29H11l7-29ZM23 78h34M31 85h18M9 40h62M40 2l5 9-5 9-5-9Z"/><circle cx="40" cy="94" r="2"/></svg>`;
const button = (action, label, extra = '') =>
  `<button class="menu-button" data-action="${action}" ${extra}>${label}</button>`;
const footer = `<div class="panel-footer"><span><kbd>↑ ↓</kbd> Navigate <kbd>✕</kbd> Select</span><button data-action="back">◯ &nbsp; Return</button></div>`;
const roman = (n) => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][n] || 'IX';
export function createUI(onAction) {
  const root = document.querySelector('#interface');
  let screen = '',
    lastFocus = '',
    snapshot = null,
    settings = null,
    lastEvent = 0,
    damage = [];
  root.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (button && !button.disabled) onAction(button.dataset.action, 1);
  });
  function show(next, s, config, extra = {}) {
    screen = next;
    snapshot = s;
    settings = config;
    const p = s?.p,
      c = s?.c;
    lastFocus = document.activeElement?.dataset?.action || '';
    let content = '';
    if (next === 'title')
      content = `<section class="title-screen"><div class="title-copy">${sigil}<div class="eyebrow">A SONG FOR THE ASHEN</div><h1>Tarnished<span>Tune</span></h1><div class="chapter">THE HOLLOW BELFRY</div><p class="title-description">The world has forgotten its song.<br>Give it a reason to remember.</p><nav class="menu-list" aria-label="Main menu">${extra.hasSave ? button('continue', 'Continue the pilgrimage', 'class="primary"') : ''}${button('new', 'Begin a new journey')}${button('guide', 'Field guide')}${button('settings', 'Settings')}${button('about', 'About this journey')}</nav></div><div class="title-caption"><span>“Even silence has an echo.”</span><small>AN ORIGINAL TALE · ONE COMPLETE CHAPTER</small></div><div class="title-bottom"><span class="prompt"><kbd>✕</kbd> Enter the sanctuary <span style="opacity:.5">/ ENTER</span></span><span class="build-label">TARNISHED TUNE–4R &nbsp; / &nbsp; MY-3DGE</span><span id="idle-label">A pilgrimage begins in 10 seconds</span></div></section>`;
    if (next === 'pause')
      content = `<section class="menu-scenic"><div class="panel narrow"><div class="eyebrow">${s.region.toUpperCase()}</div><h2>A moment of stillness.</h2><p class="intro">The world can wait.</p><nav class="menu-list">${button('resume', 'Continue the journey')}${button('journal', 'Collected echoes')}${button('guide', 'Field guide')}${button('settings', 'Settings')}${button('title', 'Return to title')}</nav></div></section>`;
    if (next === 'settings')
      content = `<section class="panel-screen"><div class="panel narrow"><div class="eyebrow">MAKE YOURSELF AT HOME</div><h2>Settings</h2>${setting('volume', 'Sound', `${Math.round(config.volume * 100)}%`)}${setting('music', 'Music', `${Math.round(config.music * 100)}%`)}${setting('quality', 'Visual quality', config.quality.toUpperCase())}${setting('reducedMotion', 'Reduced motion', config.reducedMotion ? 'ON' : 'OFF')}${setting('assist', 'Gentler journey', config.assist ? 'ON' : 'OFF')}${setting('invertY', 'Invert camera Y', config.invertY ? 'ON' : 'OFF')}<p class="setting-note">Gentler journey reduces incoming damage by 40%. All encounters, rewards and the ending remain available.<br>← → to adjust · ${extra.backend || 'Loading renderer'}</p>${footer}</div></section>`;
    if (next === 'guide')
      content = `<section class="panel-screen"><div class="panel"><div class="eyebrow">THE PILGRIM’S FIELD GUIDE</div><h2>Listen. Commit. Endure.</h2><p class="intro">Your stamina is your lifeline. Read the windup, then make your moment count.</p><div class="guide-grid">${guide('Find your footing', 'Left stick to move. Right stick to orbit. Click R3 to lock onto a foe. D-pad left cycles targets.', 'W A S D · drag mouse to orbit · Tab lock · C cycle')}${guide('Strike with purpose', 'R1 chains light strikes. R2 commits to a heavy blow. Break a foe’s posture, then land a heavy riposte.', 'J / left click light · K heavy · Q switch blade')}${guide('Weather the storm', 'L1 guards. Tap L2 just before impact to parry. A heavy attack after a block is a guard counter.', 'L / right click guard · F parry')}${guide('Leave the blade behind', 'Circle rolls through attacks. Cross jumps low shockwaves. Click L3 to sprint. Movement and attacks spend stamina.', 'Space roll · V jump · Shift sprint')}${guide('Keep an ember', 'Square drinks an Amber Phial. Triangle speaks, collects and rests. Rest restores you and returns ordinary enemies.', 'H heal · E interact · Escape pause')}${guide('Remember your song', 'Find three verses to unlock Resonance: L2 + R2. Death leaves your echoes behind; return to reclaim them.', 'R Resonance · M journal · D-pad right switch blade')}</div>${footer}</div></section>`;
    if (next === 'journal') {
      const entries = c.lore
        .map((id) => (id === 'mara' ? NPC : ITEMS.find((i) => i.id === id)))
        .filter(Boolean);
      content = `<section class="panel-screen"><div class="panel"><div class="eyebrow">${c.verses.length} OF 3 VERSES RECOVERED</div><h2>Collected echoes</h2><p class="intro">${c.bossDead ? 'The guardian has fallen. The bell awaits your hand.' : c.verses.length < 2 ? 'Follow the amber lights through the court and broken nave. Two verses will open the belfry.' : 'The belfry is open. An optional third verse waits in the Mourning Garden.'}</p>${entries.length ? entries.map((i) => `<article class="journal-entry"><h3>${i.name}</h3><p>${i.text}</p></article>`).join('') : '<p class="intro">Speak to Mara or seek inscriptions among the stones.</p>'}${c.verses
        .map((id) => ITEMS.find((i) => i.id === id))
        .map((i) => `<article class="journal-entry"><h3>${i.name}</h3><p>${i.text}</p></article>`)
        .join('')}${footer}</div></section>`;
    }
    if (next === 'shrine')
      content = `<section class="panel-screen"><div class="panel narrow"><div class="eyebrow">THE FLAME REMEMBERS</div><h2>${c.checkpoint === 'choir' ? 'Choir Refuge' : 'Kindled Court'}</h2><p class="intro">Wounds mended. Phials replenished.<br>Beyond the fire, the fallen rise again.</p><p class="small-note">VOW ${roman(p.level)} &nbsp; · &nbsp; ${p.echoes} ECHOES</p><nav class="menu-list">${button('upgrade', p.level < 8 ? `Strengthen your vow <span class="index">${80 + p.level * 60} ◇</span>` : 'Vow fulfilled', p.echoes < 80 + p.level * 60 || p.level >= 8 ? 'disabled' : '')}${button('depart', 'Leave the flame')}${button('journal', 'Read collected echoes')}</nav><p class="small-note">Each vow grants health, stamina and weapon strength.<br>Progress is saved here automatically.</p></div></section>`;
    if (next === 'death')
      content = `<section class="panel-screen"><div class="panel ending death"><div class="eyebrow" style="justify-content:center">THE SONG IS NOT OVER</div><h2>FALLEN SILENT</h2><p class="intro">${c.drop?.echoes || 0} echoes wait where you fell.<br>Rise at the flame, and find your way back.</p><nav class="menu-list">${button('retry', 'Rise again')}${button('title', 'Return to title')}</nav></div></section>`;
    if (next === 'won')
      content = `<section class="panel-screen"><div class="panel ending"><div class="ending-mark">♧</div><div class="eyebrow" style="justify-content:center">A WORLD GIVEN VOICE</div><h2>DAWN, RETURNED.</h2><p class="intro">The bell rings once. Somewhere beyond the mist,<br>another voice answers. Your pilgrimage is complete.</p><p class="small-note">${c.verses.length} verses remembered &nbsp; · &nbsp; ${c.deaths} returns to the flame &nbsp; · &nbsp; Vow ${roman(p.level)}</p><nav class="menu-list">${button('new', 'Walk the path again')}${button('title', 'Return to title')}</nav></div></section>`;
    if (next === 'confirm')
      content = `<section class="panel-screen"><div class="panel narrow"><div class="eyebrow">A NEW PILGRIMAGE</div><h2>Begin again?</h2><p class="intro">Starting a new journey replaces your saved checkpoint.</p><nav class="menu-list">${button('back', 'Keep the current journey')}${button('new-confirmed', 'Begin a new journey')}</nav></div></section>`;
    if (next === 'about')
      content = `<section class="panel-screen"><div class="panel"><div class="eyebrow">TARNISHED TUNE–4R</div><h2>An echo. A new voice.</h2><div class="about-copy"><p>An original spiritual successor inspired by the deliberate combat, exploration and atmosphere of <strong>Elden Ring (2022)</strong>. No source-game assets, characters, locations or music are used.</p><p><strong>Initial date</strong> · 16 October 2026<br><strong>Game engine</strong> · my-3dge 0.0.0, pinned to ff439e2. three.js r182 / Rapier 0.21.0.<br><a href="https://github.com/michaelcrosato/my-3dge" target="_blank" rel="noreferrer">Engine source</a> · <a href="https://github.com/michaelcrosato/TarnishedTune-4R" target="_blank" rel="noreferrer">Game source and full credits</a></p><p><strong>Environment</strong> · Local Bash CLI on Ubuntu Linux / WSL2, Node.js 22.23.3. Browser runtime. RTX 3060 Ti detected on the host; actual rendering adapter is recorded in verification results.</p><p><strong>Model and effort</strong> · OpenAI GPT-6, acting as Codex. Exact model variant and reasoning effort are not exposed by the session.</p><p>All geometry, textures, character motion and sound are made by code. The engine remains commit-pinned and unmodified. See ENGINE-FEEDBACK.md for the separate engine evaluation.</p></div>${footer}</div></section>`;
    root.innerHTML = content;
    const focus =
      root.querySelector(`[data-action="${lastFocus}"]:not(:disabled)`) ||
      root.querySelector('button:not(:disabled)');
    focus?.focus({ preventScroll: true });
  }
  function setting(key, label, value) {
    return `<button class="setting-button" data-action="setting:${key}">${label}<span>‹ &nbsp; ${value} &nbsp; ›</span></button>`;
  }
  function guide(title, body, keys) {
    return `<article class="guide-item"><h3>${title}</h3><p>${body}</p><small>${keys}</small></article>`;
  }
  return {
    get screen() {
      return screen;
    },
    show,
    navigate(input) {
      const buttons = [...root.querySelectorAll('button:not(:disabled),a')];
      let index = buttons.indexOf(document.activeElement);
      for (const key of input.p) {
        if (key === 'down' || key === 'up' || key === 'lock') {
          index = (index + (key === 'up' ? -1 : 1) + buttons.length) % buttons.length;
          buttons[index]?.focus();
          buttons[index]?.scrollIntoView({ block: 'nearest' });
        }
        if (key === 'confirm') document.activeElement?.click();
        if (key === 'roll' || key === 'back' || key === 'pause') onAction('back');
        if (key === 'left' || key === 'right') {
          const action = document.activeElement?.dataset?.action;
          if (action?.startsWith('setting:')) onAction(action, key === 'left' ? -1 : 1);
        }
      }
    },
    update(s, mode, device, dt, view) {
      const { p, c } = s;
      document.querySelector('#hud').hidden = mode === 'title';
      document.querySelector('#demo-banner').hidden = mode !== 'demo';
      const set = (id, text) => {
        const el = document.getElementById(id);
        if (el.textContent !== String(text)) el.textContent = text;
      };
      document.querySelector('#health-fill').style.width = `${(p.hp / p.maxHp) * 100}%`;
      document.querySelector('#stamina-fill').style.width = `${(p.stamina / p.maxStamina) * 100}%`;
      set('health-text', `${p.hp} / ${p.maxHp}`);
      set('vow', `VOW ${roman(p.level)}`);
      set('region', s.region);
      set('verse-count', `${c.verses.length} / 3 VERSES`);
      set(
        'objective',
        c.bossDead
          ? 'Ring the silent bell'
          : c.bossStarted
            ? 'Silence the Bellkeeper'
            : c.verses.length < 2
              ? 'Follow the amber lights'
              : c.verses.length === 2
                ? 'The belfry awaits · A verse remains'
                : 'Restore the belfry’s song',
      );
      set('flasks', p.flasks);
      set('echoes', `${p.echoes} echoes`);
      set('weapon-name', WEAPONS[p.weapon].name);
      set('heal-key', `${device === 'gamepad' ? '□' : 'H'} · AMBER PHIAL`);
      set(
        'control-hint',
        device === 'gamepad'
          ? 'R1  Strike     R2  Heavy\nL2  Parry      ◯  Roll'
          : 'J  Strike     K  Heavy     F  Parry\nSpace  Roll     Tab  Lock     Esc  Pause',
      );
      const inter = document.querySelector('#interact');
      inter.hidden = !s.interaction || !!screen;
      inter.innerHTML = s.interaction
        ? `<kbd>${device === 'gamepad' ? '△' : 'E'}</kbd>${s.interaction.label}`
        : '';
      const toast = document.querySelector('#toast');
      toast.textContent = c.message;
      toast.style.opacity = c.tick < c.messageUntil && !screen ? '1' : '0';
      const boss = s.enemies.find((e) => e.kind === 'boss');
      document.querySelector('#boss').hidden = !c.bossStarted || c.bossDead;
      document.querySelector('#boss-fill').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      set('boss-phase', boss.phase === 2 ? 'THE UNBOUND CHORUS' : 'THE LAST LISTENER');
      for (const e of c.events)
        if (e.id > lastEvent) {
          if (e.type === 'hit') {
            const node = document.createElement('span');
            node.textContent = e.amount;
            document.querySelector('#damage-numbers').append(node);
            damage.push({ node, x: e.x, z: e.z, life: 0.9 });
          }
          lastEvent = e.id;
        }
      damage = damage.filter((d) => {
        d.life -= dt;
        if (d.life < 0) {
          d.node.remove();
          return false;
        }
        const pos = view.project(d.x, 2, d.z);
        d.node.style.left = `${pos.x}px`;
        d.node.style.top = `${pos.y}px`;
        d.node.style.display = pos.visible ? '' : 'none';
        return true;
      });
    },
    reset() {
      lastEvent = 0;
      damage.forEach((d) => d.node.remove());
      damage = [];
    },
  };
}
