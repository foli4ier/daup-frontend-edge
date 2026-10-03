import { execSync, spawn } from 'node:child_process';

const hooks = [
  'https://webhook.site/8e8ddd3a-8796-457b-891a-84cc3b863003',
  'https://ntfy.sh/daup-workers-build-96af',
];

function sh(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    const stdout = error.stdout?.toString?.() ?? '';
    const stderr = error.stderr?.toString?.() ?? '';
    return `exit ${error.status}\n${stdout}\n${stderr}`.trim();
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
  const text = `${title}\n${body}`.slice(0, 20000);
  await Promise.all(
    hooks.map((hook) =>
      fetch(hook, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: text,
      }).catch(() => {})
    )
  );
}

const context = [
  `WORKERS_CI=${process.env.WORKERS_CI ?? ''}`,
  `CI=${process.env.CI ?? ''}`,
  `NODE=${process.version}`,
  sh('pwd'),
  sh('npx wrangler --version'),
].join('\n');

if (process.argv.includes('--ping')) {
  await post('ping', context);
  process.exit(0);
}

if (process.env.WORKERS_CI !== '1') {
  process.exit(0);
}

await post('build-start', `${context}\n${sh('ls -la dist dist/assets 2>&1 || true')}`);

const upload = await run('npx', ['wrangler', 'versions', 'upload']);
await post(`versions-upload exit ${upload.code}`, upload.out);

const preview = await run('npx', ['wrangler', 'preview']);
await post(`preview exit ${preview.code}`, preview.out);
