const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  session: {
    load: () => ipcRenderer.invoke('session:load'),
    save: (token) => ipcRenderer.invoke('session:save', token),
    clear: () => ipcRenderer.invoke('session:clear'),
  },
});
