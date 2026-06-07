const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const BUILD_COMMIT = process.env.BUILD_COMMIT || 'local';
const BUILD_TIME = process.env.BUILD_TIME || new Date(0).toISOString();

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  } catch (_) {
    return null;
  }
}

function readText(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
  } catch (_) {
    return '';
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

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
      if (Buffer.byteLength(data) > limit) {
        reject(new Error('BODY_TOO_LARGE'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function parseVersionInfo() {
  const getH5st = readText('getH5st.js');
  const h5st = readText('h5st.js');
  const mainJs = readText('js_security_v3_main_0.1.8.js');
  const js = readText('js_security_v3_0.1.8.js');
  const js317 = readText(path.join('js317', 'js_security_v3_0.1.7.js'));

  const versionMatch = (getH5st + '\n' + h5st).match(/const\s+version\s*=\s*['"]([^'"]+)['"]/);
  const fileMatch = (getH5st + '\n' + h5st).match(/h5_file_v([0-9.]+)/);

  return {
    h5st: versionMatch ? versionMatch[1] : null,
    h5_file: fileMatch ? `h5_file_v${fileMatch[1]}` : null,
    js_security_v3: '0.1.8',
    js_security_v3_legacy: '0.1.7',
    file_hashes: {
      getH5st_js: getH5st ? sha256(getH5st).slice(0, 16) : null,
      h5st_js: h5st ? sha256(h5st).slice(0, 16) : null,
      js_security_v3_main_0_1_8: mainJs ? sha256(mainJs).slice(0, 16) : null,
      js_security_v3_0_1_8: js ? sha256(js).slice(0, 16) : null,
      js_security_v3_0_1_7: js317 ? sha256(js317).slice(0, 16) : null,
    },
  };
}

function getMetadata() {
  const pkg = readJson('package.json') || {};
  return {
    ok: true,
    service: 'jdh5st-arm64-study',
    mode: 'offline-study',
    note: 'Local offline study image. Real JD cookie/request automation is intentionally not exposed by this server.',
    version: parseVersionInfo(),
    build: {
      commit: BUILD_COMMIT,
      time: BUILD_TIME,
    },
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
    routes: ['GET /health', 'GET /version', 'POST /sign/offline', 'POST /sign (disabled)'],
  };
}

function offlineSign(input) {
  const now = Date.now();
  const appId = input.appId || input.appid || 'fb5df';
  const functionId = input.functionId || input.functionid || 'testFunction';
  const body = input.body === undefined ? {} : input.body;
  const client = input.client || 'pc';
  const clientVersion = input.clientVersion || input.client_version || '1.0.0';
  const t = Number(input.t || input.timestamp || now);
  const fingerprint = input.fingerprint || input.fp || 'study_fp_only';
  const normalizedBody = typeof body === 'string' ? body : stableStringify(body);
  const version = parseVersionInfo();
  const canonical = [
    `appid:${appId}`,
    `body:${normalizedBody}`,
    `client:${client}`,
    `clientVersion:${clientVersion}`,
    `functionId:${functionId}`,
    `t:${t}`,
    `fp:${fingerprint}`,
    `h5st:${version.h5st || 'unknown'}`,
  ].join('&');
  const studyHash = sha256(canonical);

  return {
    ok: true,
    mode: 'offline-study',
    warning: 'This is a deterministic offline study result, not a real JD h5st signature.',
    input: {
      appId,
      functionId,
      body,
      client,
      clientVersion,
      t,
      fingerprint,
    },
    normalizedBody,
    canonical,
    result: {
      h5stVersion: version.h5st,
      h5File: version.h5_file,
      studyH5st: `study_${studyHash}`,
      studyH5stShort: `study_${studyHash.slice(0, 24)}`,
    },
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    sendJson(res, 200, getMetadata());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/version') {
    sendJson(res, 200, {
      ok: true,
      service: 'jdh5st-arm64-study',
      mode: 'offline-study',
      version: parseVersionInfo(),
      build: { commit: BUILD_COMMIT, time: BUILD_TIME },
      runtime: { node: process.version, arch: process.arch, platform: process.platform },
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/sign/offline') {
    try {
      const raw = await readBody(req);
      const input = raw.trim() ? JSON.parse(raw) : {};
      sendJson(res, 200, offlineSign(input));
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message || String(error) });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/sign') {
    sendJson(res, 501, {
      ok: false,
      error: 'SIGN_ENDPOINT_DISABLED',
      message: 'Use POST /sign/offline for deterministic offline study tests. Real JD signing is not exposed.',
    });
    return;
  }

  sendJson(res, 404, {
    ok: false,
    error: 'NOT_FOUND',
    routes: ['GET /health', 'GET /version', 'POST /sign/offline', 'POST /sign (disabled)'],
  });
});

server.listen(PORT, HOST, () => {
  console.log(`jdh5st ARM64 offline study server listening on ${HOST}:${PORT}`);
});
