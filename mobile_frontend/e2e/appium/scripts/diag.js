const fs = require('fs');
const path = require('path');
const http = require('http');

function exists(p) {
  try { return !!p && fs.existsSync(p); } catch { return false; }
}

async function checkAppium(host, port) {
  const url = `http://${host}:${port}/status`;
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: true, status: json });
        } catch {
          resolve({ ok: true, status: data });
        }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: String(e) }));
    req.setTimeout(2000, () => { try { req.destroy(); } catch {} resolve({ ok: false, error: 'timeout' }); });
  });
}

(async () => {
  const cwd = process.cwd();
  const env = process.env;
  const relApkAtRoot = path.resolve(cwd, '../../app-debug.apk');
  const relApkInBuild = path.resolve(cwd, '../../build/app/outputs/apk/debug/app-debug.apk');
  const userAbsApk = 'C:/Users/AnujiWeragoda/GIT/staff-management-system/Intern-project/mobile_frontend/app-debug.apk';
  const chosenApk = env.ANDROID_APP || [relApkAtRoot, relApkInBuild, userAbsApk].find(exists) || '(none found)';

  const host = env.APPIUM_HOST || '127.0.0.1';
  const port = Number(env.APPIUM_PORT || 4723);
  const appium = await checkAppium(host, port);

  const info = {
    node: process.version,
    cwd,
    env: {
      CAPS: env.CAPS,
      APPIUM_START: env.APPIUM_START,
      APPIUM_HOST: host,
      APPIUM_PORT: port,
      ANDROID_APP: env.ANDROID_APP,
      ANDROID_UDID: env.ANDROID_UDID,
      LOG_LEVEL: env.LOG_LEVEL,
    },
    apkCandidates: {
      ANDROID_APP_env: env.ANDROID_APP,
      relApkAtRoot: { path: relApkAtRoot, exists: exists(relApkAtRoot) },
      relApkInBuild: { path: relApkInBuild, exists: exists(relApkInBuild) },
      userAbsApk: { path: userAbsApk, exists: exists(userAbsApk) },
      chosenApk,
    },
    appiumStatus: appium,
  };

  console.log(JSON.stringify(info, null, 2));
})();
