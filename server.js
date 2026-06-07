const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  } catch (error) {
    return null;
  }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function getStudyMetadata() {
  const pkg = readJson('package.json') || {};
  return {
    ok: true,
    service: 'jdh5st-arm64-study',
    mode: 'study',
    note: 'Local study image. Real JD cookie/request automation is intentionally not exposed by this server.',
    package: {
      name: pkg.name,
      version: pkg.version,
      dependencies: pkg.dependencies || {},
    },
    runtime: {
      node: process.version,
      arch: process.arch,
      platform: process.platform,
      pid: process.pid,
    },
    files: {
      jsSecurityMain: fs.existsSync(path.join(ROOT, 'js_security_v3_main_0.1.8.js')),
      jsSecurity: fs.existsSync(path.join(ROOT, 'js_security_v3_0.1.8.js')),
      js317: fs.existsSync(path.join(ROOT, 'js317', 'js_security_v3_0.1.7.js')),
      getH5st: fs.existsSync(path.join(ROOT, 'getH5st.js')),
      h5st: fs.existsSync(path.join(ROOT, 'h5st.js')),
    },
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    sendJson(res, 200, getStudyMetadata());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/sign') {
    sendJson(res, 501, {
      ok: false,
      error: 'SIGN_ENDPOINT_DISABLED',
      message: 'This ARM64 image is a safe study scaffold. Wire an offline signer explicitly before using /sign.',
    });
    return;
  }

  sendJson(res, 404, {
    ok: false,
    error: 'NOT_FOUND',
    routes: ['GET /health', 'GET /', 'POST /sign (disabled)'],
  });
});

server.listen(PORT, HOST, () => {
  console.log(`jdh5st ARM64 study server listening on ${HOST}:${PORT}`);
});
