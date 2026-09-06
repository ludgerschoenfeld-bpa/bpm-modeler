const path = require('path');

// Vite copies the public directory unchanged, so the same source icon is
// available from the project in development and from app.asar after packaging.
function appIconPath(app) {
  return path.join(app.getAppPath(), app.isPackaged ? 'dist' : 'public', 'favicon.png');
}

module.exports = { appIconPath };
