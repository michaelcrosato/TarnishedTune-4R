/** Verify the engine handoff has not been changed accidentally. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const lock = JSON.parse(readFileSync('engine-lock.json', 'utf8'));
const hash = createHash('sha256').update(readFileSync(lock.artifact)).digest('hex');
if (hash !== lock.sha256)
  throw Error('Engine artifact differs from engine-lock.json. Document any intentional patch.');
console.log(`my-3dge ${lock.commit}: verified ${hash}`);
