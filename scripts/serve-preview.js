import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml']
]);
const port = Number(process.env.PORT) || 4173;

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const file = resolve(root, `.${pathname}`);
  const relativePath = relative(root, file);
  if (isAbsolute(relativePath) || relativePath === '..' || relativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
    response.writeHead(403).end();
    return;
  }

  let stat;
  try {
    stat = statSync(file);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      response.writeHead(404).end();
      return;
    }
    console.error('Could not inspect preview file', error);
    response.writeHead(500).end();
    return;
  }
  if (!stat.isFile()) {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, {
    'Content-Length': stat.size,
    'Content-Type': contentTypes.get(extname(file).toLowerCase()) || 'application/octet-stream'
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  const stream = createReadStream(file);
  stream.on('error', (error) => {
    console.error('Could not read preview file', error);
    response.destroy(error);
  });
  stream.pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`NutriMeal preview server: http://127.0.0.1:${port}/app-preview.html`);
});
