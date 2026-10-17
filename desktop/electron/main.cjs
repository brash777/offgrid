const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const START_PAGE = process.env.FLOWSTORE_START_PAGE ?? 'index.html';

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#f4f3ef',
    show: false,
    title: 'OFFGRID',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    const allowed = DEV_SERVER_URL ? url.startsWith(DEV_SERVER_URL) : url.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
    }
  });

  if (DEV_SERVER_URL) {
    window.loadURL(`${DEV_SERVER_URL}/${START_PAGE}`);
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', START_PAGE));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
