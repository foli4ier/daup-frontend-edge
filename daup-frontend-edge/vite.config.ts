import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { handlePaystackRequest } from './src/hub/paystackHandler';

const runningProcesses: Record<string, ChildProcess> = {};

function onDemandAppLauncherPlugin(): Plugin {
  return {
    name: 'daup-on-demand-launcher',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const host = req.headers.host || 'localhost:3000';
        const url = new URL(req.url || '/', `http://${host}`);
        if (!url.pathname.startsWith('/api/paystack/')) {
          next();
          return;
        }
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          const body = Buffer.concat(chunks);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value);
            else if (Array.isArray(value)) headers.set(key, value.join(', '));
          }
          const request = new Request(url, {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body
          });
          const response = await handlePaystackRequest(request, {
            PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY
          });
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ paid: false, message: 'Paystack is not ready.' }));
          console.error('[Paystack]', err?.message || err);
        }
      });

      server.middlewares.use('/api/launch-app', (req, res) => {
        try {
          const url = new URL(req.url || '', `http://${req.headers.host || 'localhost:3000'}`);
          const moduleName = url.searchParams.get('module');

          if (!moduleName) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing module parameter' }));
            return;
          }

          const projectMap: Record<string, string> = {
            'daup-farmer': '../../daup-farmer',
            'daup-reseller': '../../daup-reseller',
            'daup-eatery': '../../daup-eatery',
            'daup-manufacturing': '../../daup-manufacturing',
            'daup-mcp-servers': '../../daup-mcp-servers',
          };

          const targetDir = projectMap[moduleName];
          if (!targetDir) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Unknown module: ${moduleName}` }));
            return;
          }

          const existing = runningProcesses[moduleName];
          if (existing && !existing.killed && existing.exitCode === null) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'already_running', module: moduleName }));
            return;
          }

          const absPath = path.resolve(__dirname, targetDir);
          const isWindows = process.platform === 'win32';
          const npmCmd = isWindows ? 'npm.cmd' : 'npm';

          console.log(`[DAUP Launcher] Starting on-demand child project: ${moduleName} in ${absPath}`);

          const proc = spawn(npmCmd, ['run', 'dev'], {
            cwd: absPath,
            stdio: 'pipe',
            shell: true,
          });

          runningProcesses[moduleName] = proc;

          proc.stdout?.on('data', (data) => {
            const out = data.toString().trim();
            if (out) console.log(`[${moduleName}] ${out}`);
          });

          proc.stderr?.on('data', (data) => {
            const err = data.toString().trim();
            if (err) console.error(`[${moduleName} Error] ${err}`);
          });

          proc.on('error', (err) => {
            console.error(`[DAUP Launcher] Failed to spawn ${moduleName}:`, err);
            delete runningProcesses[moduleName];
          });

          proc.on('exit', (code) => {
            console.log(`[DAUP Launcher] Process ${moduleName} exited with code ${code}`);
            delete runningProcesses[moduleName];
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'started', module: moduleName }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // Cleanup on server close
      server.httpServer?.on('close', () => {
        Object.keys(runningProcesses).forEach((mod) => {
          try {
            runningProcesses[mod]?.kill();
          } catch {}
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), onDemandAppLauncherPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },
  },
  build: {
    target: 'esnext',
  },
});