import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {deploymentSpec} from './delivery/base/spec.mjs';

const root = process.cwd();
const policy = JSON.parse(await readFile(join(root, 'packaging.json'), 'utf8'));
const bytes = JSON.stringify(await deploymentSpec(root, policy.artifact.specInputs), null, 2) + '\n';
const target = join(root, 'management/integration/deployment-spec.json');
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== bytes) throw Error('Deployment specification is stale. Run pnpm delivery:spec after the real build.');
  console.log('Deployment specification matches the real build and source policy.');
} else {
  await mkdir(join(root, 'management/integration'), {recursive: true});
  await writeFile(target, bytes);
  console.log('Wrote deployment specification.');
}
