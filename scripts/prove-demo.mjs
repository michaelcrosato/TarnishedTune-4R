/** No browser or server: play the complete authored route using normal controls. */
import { createGame } from '../src/sim/game.js';
import { createPilot } from '../src/sim/pilot.js';
const seeds = process.argv.slice(2).map(Number);
if (!seeds.length) seeds.push(17);
for (const seed of seeds) {
  const game = await createGame(seed),
    pilot = createPilot();
  let state,
    step = 0;
  for (; step < 60000; step++) {
    state = game.read();
    if (state.c.status === 'won') break;
    game.step(pilot.next(state));
    if (process.env.TRACE && step % 1800 === 0)
      console.log(
        JSON.stringify({
          step,
          stage: pilot.stage,
          p: state.p,
          foes: state.enemies
            .filter((e) => e.hp > 0 && e.active)
            .map((e) => ({ id: e.id, hp: e.hp, state: e.state, x: e.x, z: e.z })),
          verses: state.c.verses,
        }),
      );
  }
  state = game.read();
  console.log(
    JSON.stringify({
      seed,
      steps: step,
      seconds: (step / 60).toFixed(1),
      status: state.c.status,
      stage: pilot.stage,
      hp: state.p.hp,
      deaths: state.c.deaths,
      verses: state.c.verses.length,
      kills: state.c.kills,
      stats: state.c.stats,
      hash: game.engine.hash(),
    }),
  );
  if (state.c.status !== 'won') {
    console.log(JSON.stringify(state));
    process.exitCode = 1;
  }
}
