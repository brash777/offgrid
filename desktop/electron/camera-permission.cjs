const { session, systemPreferences } = require('electron');

function registerCameraPermission(isAppUrl) {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const mediaTypes = details.mediaTypes ?? [];
    const cameraOnly = permission === 'media' && mediaTypes.length > 0 && mediaTypes.every((type) => type === 'video');
    if (!cameraOnly || !isAppUrl(details.requestingUrl ?? webContents.getURL())) {
      callback(false);
      return;
    }
    if (process.platform !== 'darwin') {
      callback(true);
      return;
    }
    const status = systemPreferences.getMediaAccessStatus('camera');
    if (status !== 'not-determined') {
      callback(status === 'granted');
      return;
    }
    systemPreferences.askForMediaAccess('camera').then(callback, () => callback(false));
  });
}

module.exports = { registerCameraPermission };
