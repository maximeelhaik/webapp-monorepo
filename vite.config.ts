import { defineConfig, loadEnv } from 'vite';
Object.assign(process.env, loadEnv('', process.cwd(), ''));
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import adjectifHandler from './apps/adjectif/api/generate';
import worldHandler from './apps/world/api/generate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = process.env.APP || 'adjectif';

function apiMiddlewarePlugin() {
  return {
    name: 'api-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.startsWith('/api/generate')) {
          let body = {};
          if (req.method === 'POST') {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            try {
              body = JSON.parse(Buffer.concat(buffers).toString());
            } catch (e) {}
          }

          const url = `http://${req.headers.host}${req.url}`;
          const webReq = new Request(url, {
            method: req.method,
            headers: req.headers as any,
            body: req.method === 'POST' ? JSON.stringify(body) : undefined,
          });

          let response;
          if ((body as any).app === 'world') {
            response = await worldHandler(webReq);
          } else {
            response = await adjectifHandler(webReq);
          }

          res.statusCode = response.status;
          response.headers.forEach((value: string, key: string) => {
            res.setHeader(key, value);
          });
          if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
          }

          const reader = response.body?.getReader();
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
              if (typeof res.flush === 'function') {
                res.flush();
              }
            }
          }
          res.end();
          return;
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  root: `apps/${app}`,
  plugins: [
    react(),
    tailwindcss(),
    apiMiddlewarePlugin(),
  ],
  resolve: {
    alias: {
      '@new-app-ia/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
