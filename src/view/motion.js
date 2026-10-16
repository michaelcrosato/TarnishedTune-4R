/** Read-only pose authoring. Attack samples use the actual simulation windup/active/recovery durations. */
import { WEAPONS, ARCHETYPES } from '../sim/content.js';
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
const neutral = () => ({
  body: [0, 0, 0],
  hips: [0, 0, 0],
  chest: [0, 0, 0],
  head: [0, 0, 0],
  armL: [-0.18, 0, 0.12],
  foreL: [-0.65, 0, 0],
  wristL: [0.6, 0, 0],
  armR: [-0.25, 0, -0.12],
  foreR: [-0.5, 0, 0],
  wristR: [-0.35, 0, 0],
  hipY: 0.98,
  bodyY: 0,
  bodyZ: 0,
  feet: [
    [-0.17, 0.1, 0],
    [0.17, 0.1, 0],
  ],
  twoHand: 0,
  flask: 0,
  trail: 0,
  bladeAim: [0, 0, 0],
  aimWeight: 0,
});
function apply(pose, values, weight = 1) {
  for (const [key, value] of Object.entries(values)) {
    pose[key] = Array.isArray(value) ? mix3(pose[key], value, weight) : mix(pose[key], value, weight);
  }
}
/** A stance foot moves backwards at the character's travel rate; the return phase lifts and eases the toe. */
export function gaitParameters(speed) {
  const jog = clamp((speed - 2.2) / 1.4),
    run = clamp((speed - 4.3) / 2.4);
  return {
    stride: mix(0.8, 0.94, jog) + 0.18 * run,
    stance: mix(0.6, 0.36, jog) - 0.04 * run,
    lift: 0.15 + 0.1 * jog + 0.06 * run,
    run,
  };
}
export function gaitFoot(phase, stride, lift, stance = 0.6) {
  const u = ((phase % 1) + 1) % 1;
  if (u < stance) return { z: stride * (0.5 - u / stance), y: 0.1, planted: true };
  const t = (u - stance) / (1 - stance);
  return { z: stride * (-0.5 + smooth(t)), y: 0.1 + Math.sin(Math.PI * t) * lift, planted: false };
}
const LIGHTS = [
  {
    wind: {
      armR: [-1.1, 0.95, -0.85],
      foreR: [-1.1, 0, 0],
      wristR: [-0.3, 0, 0],
      chest: [-0.06, 0.62, -0.08],
    },
    hit: { armR: [-1.5, -1.15, 0.65], foreR: [-0.1, 0, 0], wristR: [-0.3, 0, 0], chest: [0.16, -0.72, 0.1] },
  },
  {
    wind: {
      armR: [-1.6, -1.05, 0.7],
      foreR: [-0.95, 0, 0],
      wristR: [-0.4, 0, 0.2],
      chest: [-0.06, -0.6, 0.06],
    },
    hit: {
      armR: [-1.35, 1.1, -0.8],
      foreR: [-0.15, 0, 0],
      wristR: [-0.5, 0, -0.1],
      chest: [0.12, 0.62, -0.08],
    },
  },
  {
    wind: { armR: [-0.35, -0.15, -0.15], foreR: [-2, 0, 0], wristR: [0.7, 0, 0], chest: [-0.12, 0.22, 0] },
    hit: { armR: [-1.7, -0.15, -0.2], foreR: [-0.05, 0, 0], wristR: [0.1, 0, 0], chest: [0.22, -0.15, 0] },
  },
];
function strikePose(pose, elapsed, move, style, heavy = false) {
  const wind = smooth(elapsed / move.windup),
    active = clamp((elapsed - move.windup) / move.active),
    recovery = smooth((elapsed - move.windup - move.active) / move.recovery);
  const anticipation = heavy
    ? {
        armR: [-2.5, -0.1, -0.6],
        foreR: [-0.4, 0, 0],
        wristR: [0.35, 0, 0],
        chest: [-0.2, 0.18, 0],
        hipY: 0.91,
      }
    : style.wind;
  const contact = heavy
    ? {
        armR: [-1.2, -0.12, -0.45],
        foreR: [-0.1, 0, 0],
        wristR: [0.35, 0, 0],
        chest: [0.3, -0.1, 0],
        hipY: 0.88,
      }
    : style.hit;
  apply(pose, anticipation, wind);
  if (elapsed >= move.windup) apply(pose, contact, smooth(active));
  const neutralPose = neutral();
  for (const key of Object.keys(anticipation))
    pose[key] = Array.isArray(pose[key])
      ? mix3(pose[key], neutralPose[key], recovery)
      : mix(pose[key], neutralPose[key], recovery);
  pose.bodyZ =
    0.14 *
    Math.sin(
      Math.PI * clamp((elapsed - move.windup * 0.5) / (move.active + move.windup * 0.5 + move.recovery)),
    );
  const cut = 1 - Math.pow(1 - active, 3);
  const reverse = style === LIGHTS[1] ? -1 : 1;
  pose.bladeAim = heavy
    ? [0, mix(1.35, -0.2, cut), 0]
    : style === LIGHTS[2]
      ? [0, 0.02, 0]
      : [reverse * mix(1.15, -1.15, cut), mix(0.14, -0.08, cut), 0];
  pose.aimWeight = wind * (1 - recovery);
  pose.twoHand = heavy ? 1 - recovery : 0;
  pose.trail = elapsed >= move.windup && elapsed < move.windup + move.active ? 1 : 0;
}
export function sampleMotion(unit, context) {
  const { time, phase, speed, age, moveX = 0, moveZ = 1, landing = 0 } = context,
    pose = neutral(),
    moving = context.moveWeight ?? clamp(speed / 0.5);
  const { stride, lift, stance, run } = gaitParameters(speed);
  for (let i = 0; i < 2; i++) {
    const foot = gaitFoot(phase + i * 0.5, stride, lift, stance);
    pose.feet[i] = [
      (i ? 1 : -1) * 0.17 + foot.z * moveX * moving,
      mix(0.1, foot.y, moving),
      foot.z * moveZ * moving,
    ];
  }
  pose.hipY -= moving * (0.1 + run * 0.08);
  pose.hipY +=
    Math.sin(phase * Math.PI * 4) * 0.025 * moving - Math.sin(clamp(landing / 0.3) * Math.PI) * 0.12;
  pose.body[0] = (0.06 + 0.14 * run) * moving;
  pose.chest[1] = Math.sin(phase * Math.PI * 2) * 0.11 * moving;
  pose.armL[0] += Math.sin(phase * Math.PI * 2) * 0.35 * moving;
  pose.armR[0] -= Math.sin(phase * Math.PI * 2) * 0.28 * moving;
  pose.foreL[0] -= run * 0.35;
  pose.foreR[0] -= run * 0.4;
  if (speed < 0.1) {
    pose.chest[0] = Math.sin(time * 2) * 0.015;
    pose.hipY += Math.sin(time * 2) * 0.006;
    pose.head[1] = Math.sin(time * 0.65) * 0.035;
  }
  if (unit.guard)
    apply(pose, {
      armL: [-1.25, -0.2, 0.35],
      foreL: [-0.7, 0, 0],
      wristL: [1.8, 0, 0],
      chest: [0.06, -0.2, 0],
      hipY: 0.93,
    });
  if (unit.state === 'attack')
    strikePose(
      pose,
      unit.elapsed,
      WEAPONS[unit.weapon][unit.attack],
      LIGHTS[unit.combo % 3],
      unit.attack === 'heavy',
    );
  if (['windup', 'strike', 'recover'].includes(unit.state)) {
    const a = ARCHETYPES[unit.kind],
      windup = Math.round(a.windup * (unit.phase === 2 ? 0.82 : 1)),
      active = unit.kind === 'boss' ? 24 : 14,
      recovery = Math.round(a.recovery * (unit.phase === 2 ? 0.8 : 1));
    const elapsed =
      unit.state === 'windup'
        ? windup - unit.timer
        : unit.state === 'strike'
          ? windup + active - unit.timer
          : windup + active + recovery - unit.timer;
    if (unit.kind === 'cantor')
      apply(
        pose,
        {
          armR: [-1.4, 0, -0.3],
          foreR: [-1.15, 0, 0],
          armL: [-1.1, 0.4, 0.7],
          foreL: [-0.7, 0, 0],
          chest: [-0.1, 0, 0],
        },
        unit.state === 'recover' ? clamp(unit.timer / recovery) : smooth(elapsed / windup),
      );
    else
      strikePose(
        pose,
        elapsed,
        { windup, active, recovery },
        LIGHTS[(unit.attack || 0) % 2],
        unit.kind === 'boss' || unit.kind === 'knight',
      );
    if (unit.kind === 'boss' && (unit.attack || 0) % 3 === 2) {
      pose.body[0] += 0.16;
      pose.hipY -= 0.09;
    }
  }
  if (unit.state === 'parry') {
    const u = unit.elapsed / 30,
      power = unit.elapsed < 13 ? smooth(unit.elapsed / 7) : 1 - smooth((unit.elapsed - 13) / 17);
    apply(
      pose,
      { armL: [-1.6, -0.7, -0.4], foreL: [-0.25, 0, 0], wristL: [1.6, 0, 0.3], chest: [0, 0.3, 0] },
      power,
    );
    pose.bodyZ = 0.1 * Math.sin(Math.PI * u);
  }
  if (unit.state === 'roll') {
    const u = clamp(unit.elapsed / 32),
      tuck = Math.sin(Math.PI * u);
    pose.body[0] = -Math.PI * 2 * smooth(u);
    pose.bodyY = 0.55 * tuck;
    pose.hipY = 0.98 - 0.38 * tuck;
    pose.armL = [-1.8, 0, 0.3];
    pose.armR = [-1.6, 0, -0.3];
    pose.foreL = [-1.4, 0, 0];
    pose.foreR = [-1.4, 0, 0];
    pose.feet = [
      [-0.17, 0.1 + 0.45 * tuck, 0.15 * tuck],
      [0.17, 0.1 + 0.45 * tuck, -0.15 * tuck],
    ];
  }
  if (unit.state === 'heal') {
    const lift = smooth(unit.elapsed / 24) * (1 - smooth((unit.elapsed - 53) / 22));
    apply(
      pose,
      { armL: [-1.25, 0.2, -0.4], foreL: [-1.8, 0, 0], wristL: [-0.35, 0, 0], head: [-0.16, 0, 0] },
      lift,
    );
    pose.flask = lift;
  }
  if (unit.state === 'skill' || unit.state === 'phase') {
    const u = unit.state === 'skill' ? unit.elapsed / 75 : 1 - unit.timer / 150;
    const raise = smooth(u / 0.35) * (1 - smooth((u - 0.7) / 0.3));
    apply(
      pose,
      {
        armL: [-0.35, 0, -1.5],
        armR: [-0.35, 0, 1.5],
        foreL: [-0.2, 0, 0],
        foreR: [-0.2, 0, 0],
        head: [-0.25, 0, 0],
        chest: [-0.1, 0, 0],
      },
      raise,
    );
    pose.hipY += 0.045 * raise;
  }
  if (unit.state === 'hurt' || unit.state === 'stagger') {
    const hit = Math.exp(-age * 8),
      stagger = unit.state === 'stagger' ? 0.5 : 0;
    apply(
      pose,
      {
        body: [-0.27 - hit * 0.2, 0, 0.12 * hit],
        chest: [-0.15, 0.1, 0.1],
        head: [0.2, 0, 0],
        hipY: 0.83,
        armR: [-0.1, 0, -0.4],
      },
      Math.max(hit, stagger),
    );
  }
  if (unit.y > 0 && unit.hp > 0) {
    const tuck = clamp((unit.vy || 0) / 6.6);
    pose.feet = [
      [-0.17, 0.2 + 0.3 * tuck, 0.3],
      [0.17, 0.25, -0.2],
    ];
    pose.armL[2] = 0.5;
    pose.armR[2] = -0.4;
  }
  if (unit.hp <= 0) {
    const fall = smooth(age / 0.75);
    pose.body = [(-Math.PI / 2) * fall, 0, 0.08 * Math.sin(age * 7) * Math.exp(-age * 3)];
    pose.bodyY = 0.18 * fall;
    pose.hipY = 0.98;
    pose.armL = [-0.2, 0, 0.9];
    pose.armR = [0, 0, -0.8];
    pose.wristR = [0, 0, 0];
    pose.foreL = [-0.25, 0, 0];
    pose.foreR = [0, 0, 0];
    pose.head = [0.25, 0, -0.2];
    pose.chest = [0, 0, 0];
    pose.feet = [
      [-0.17, 0.1, 0.12],
      [0.17, 0.1, -0.12],
    ];
  }
  return pose;
}
