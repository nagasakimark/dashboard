const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

protocol.registerSchemesAsPrivileged([
  { scheme: 'file', privileges: { secure: true, standard: true } }
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  protocol.handle('file', (request) => {
    return new Response(
      new FileReader(path.join(__dirname, '../build/index.html'))
    );
  });

  const indexPath = path.join(__dirname, '../build/index.html');
  win.loadFile(indexPath);

  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) {
      event.preventDefault();
      win.loadFile(indexPath);
    }
  });

  win.webContents.openDevTools();
}

app.whenReady()
  .then(createWindow)
  .catch(console.error);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
