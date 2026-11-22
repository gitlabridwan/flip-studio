import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const { values } = parseArgs({
  options: { host: { type: 'string' }, port: { type: 'string' }, strictPort: { type: 'boolean' } },
});
const port = Number(values.port || process.env.FLIPSTUDIO_PORT || 4173);
const host = values.host || '127.0.0.1';
const types = {
  html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  pdf: 'application/pdf', webp: 'image/webp', png: 'image/png',
  woff2: 'font/woff2', wasm: 'application/wasm',
};

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const { pathname } = new URL(request.url, 'http://localhost');
    const path = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    if (!/^(index\.html$|(?:assets|src|vendor|publikasi)\/)/.test(path) || path.split('/').some(part => part === '..' || part.startsWith('.'))) {
      response.writeHead(404).end('File tidak ditemukan.');
      return;
    }
    const file = resolve(root, path);
    const info = file.startsWith(root + sep) ? await stat(file) : null;
    if (!info?.isFile()) {
      response.writeHead(404).end('File tidak ditemukan.');
      return;
    }
    response.writeHead(200, {
      'Content-Type': types[file.split('.').at(-1).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404).end('File tidak ditemukan.');
  }
});

server.listen(port, host, () => {
  const address = server.address();
  console.log('FlipStudio berjalan di http://' + (host === '0.0.0.0' ? 'localhost' : host) + ':' + address.port);
});
