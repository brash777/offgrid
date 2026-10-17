const { app, ipcMain, safeStorage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const MAX_TOKEN_LENGTH = 512;

function sessionFile() {
  return path.join(app.getPath('userData'), 'session.bin');
}

function registerSessionStore(isAppUrl) {
  const fromApp = (event) => isAppUrl(event.senderFrame?.url ?? '');

  ipcMain.handle('session:load', async (event) => {
    if (!fromApp(event) || !safeStorage.isEncryptionAvailable()) {
      return null;
    }
    try {
      return safeStorage.decryptString(await fs.readFile(sessionFile()));
    } catch {
      return null;
    }
  });

  ipcMain.handle('session:save', async (event, token) => {
    const valid = typeof token === 'string' && token.length > 0 && token.length <= MAX_TOKEN_LENGTH;
    if (!fromApp(event) || !valid || !safeStorage.isEncryptionAvailable()) {
      return false;
    }
    await fs.writeFile(sessionFile(), safeStorage.encryptString(token), { mode: 0o600 });
    return true;
  });

  ipcMain.handle('session:clear', async (event) => {
    if (!fromApp(event)) {
      return false;
    }
    await fs.rm(sessionFile(), { force: true });
    return true;
  });
}

module.exports = { registerSessionStore };
