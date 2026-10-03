import { execSync, spawn } from 'node:child_process';

const hook = 'https://webhook.site/8e8ddd3a-8796-457b-891a-84cc3b863003';

function sh(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const stdout = error.stdout?.toString?.() ?? '';
    const stderr = error.stderr?.toString?.() ?? '';
    return `exit ${error.status}\n${stdout}\n${stderr}`;
  }
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      out += chunk.toString();
    });
    child.on('close', (code) => resolve({ code, out: out.slice(-12000) }));
  });
}

async function post(title, body) {
  await fetch(hook, {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: `${title}\n${body}`.slice(0, 20000),
  }).catch(() => {});
}

await post(
  'context',
  [
    sh('node -v'),
    sh('pwd'),
    sh('npx wrangler --version'),
    sh('ls -la dist dist/assets 2>&1 || true'),
  ].join('\n')
);

const upload = await run('npx', ['wrangler', 'versions', 'upload']);
await post(`versions-upload exit ${upload.code}`, upload.out);

const preview = await run('npx', ['wrangler', 'preview']);
await post(`preview exit ${preview.code}`, preview.out);
