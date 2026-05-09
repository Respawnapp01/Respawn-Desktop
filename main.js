const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, shell, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

let mainWindow, splashWindow, tray
const RESPAWN_URL = 'https://respawnapp.uk'
Menu.setApplicationMenu(null)

// ── SPLASH SCREEN ──
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  })
  splashWindow.loadURL(`data:text/html,<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-family: 'Segoe UI', sans-serif;
    -webkit-app-region: drag;
  }
  .card {
    background: #0d1117;
    border: 1px solid #21262d;
    border-radius: 20px;
    width: 320px;
    height: 320px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    box-shadow: 0 0 60px rgba(0,229,255,0.15), 0 20px 60px rgba(0,0,0,0.8);
    animation: fadeIn 0.4s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  img { width: 100px; height: 100px; object-fit: contain; }
  .title { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: 0.1em; }
  .title span { color: #00e5ff; }
  .bar { width: 160px; height: 3px; background: #21262d; border-radius: 2px; overflow: hidden; }
  .fill { height: 100%; background: #00e5ff; border-radius: 2px; animation: load 1.8s ease forwards; box-shadow: 0 0 8px #00e5ff; }
  @keyframes load { from { width: 0; } to { width: 100%; } }
  .sub { font-size: 12px; color: #8b949e; letter-spacing: 0.08em; }
</style>
</head>
<body>
  <div class="card">
    <div class="title">Respawn</div>
    <div class="bar"><div class="fill"></div></div>
    <div class="sub">FIND YOUR SQUAD</div>
  </div>
</body>
</html>`)
}

// ── MAIN WINDOW ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#090b0f',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    show: false,
  })

  mainWindow.loadURL(RESPAWN_URL)

  mainWindow.webContents.on('did-finish-load', () => {
    // Inject custom titlebar
    mainWindow.webContents.insertCSS(`
      body { padding-top: 36px !important; }
      .sidenav, #mob-tabbar { top: 36px !important; }
      .page { top: 36px !important; }
      #page-welcome, #page-auth { top: 36px !important; }
      #respawn-titlebar {
        position: fixed !important;
        top: 0 !important; left: 0 !important; right: 0 !important;
        height: 36px !important;
        background: #0d1117 !important;
        border-bottom: 1px solid #21262d !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0 12px 0 16px !important;
        z-index: 99999 !important;
        -webkit-app-region: drag !important;
        user-select: none !important;
      }
      .tb-logo { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: #fff; letter-spacing: 0; }
      .tb-logo span { color: #00e5ff; }
      .tb-btns { display: flex; gap: 2px; -webkit-app-region: no-drag; }
      .tb-btn { width: 28px; height: 22px; border: none; background: none; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #8b949e; font-size: 12px; transition: background 0.15s, color 0.15s; }
      .tb-btn:hover { background: #21262d; color: #fff; }
      .tb-btn.close:hover { background: #ff4d4d; color: #fff; }
    `)
    mainWindow.webContents.executeJavaScript(`
      if (!document.getElementById('respawn-titlebar')) {
        const bar = document.createElement('div');
        bar.id = 'respawn-titlebar';
        bar.innerHTML = \`
          <div class="tb-logo">
            <svg width="14" height="14" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 10 H48 Q54 10 54 16 V38 Q54 44 48 44 H28 L18 54 V44 H16 Q10 44 10 38 V16 Q10 10 16 10 Z" stroke="#00e5ff" stroke-width="3.5" stroke-linejoin="round"/>
            </svg>
            Re<span style="color:#00e5ff">spawn</span>
          </div>
          <div class="tb-btns">
            <button class="tb-btn" id="tb-min" title="Minimise">─</button>
            <button class="tb-btn" id="tb-max" title="Maximise">□</button>
            <button class="tb-btn close" id="tb-close" title="Close">✕</button>
          </div>
        \`;
        document.body.insertBefore(bar, document.body.firstChild);
        document.getElementById('tb-min').addEventListener('click', () => window.electronAPI?.minimize());
        document.getElementById('tb-max').addEventListener('click', () => window.electronAPI?.maximize());
        document.getElementById('tb-close').addEventListener('click', () => window.electronAPI?.close());
      }
    `)
    // Hide splash and show main window
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close()
      mainWindow.show()
    }, 2000)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(RESPAWN_URL)) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) { e.preventDefault(); mainWindow.hide() }
  })
}

// ── TRAY ──
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Respawn', click: () => { mainWindow.show(); mainWindow.focus() } },
    { type: 'separator' },
    { label: 'Check for Updates', click: () => autoUpdater.checkForUpdatesAndNotify() },
    { type: 'separator' },
    { label: 'Quit Respawn', click: () => { app.isQuiting = true; app.quit() } }
  ])
  tray.setToolTip('Respawn — Find Your Squad 🎮')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    if (mainWindow.isVisible()) mainWindow.hide()
    else { mainWindow.show(); mainWindow.focus() }
  })
}

// ── IPC — titlebar buttons ──
ipcMain.on('minimize', () => mainWindow?.minimize())
ipcMain.on('maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
ipcMain.on('close', () => mainWindow?.hide())
ipcMain.on('check-updates', () => autoUpdater.checkForUpdatesAndNotify())

// ── AUTO UPDATER ──
function setupAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.setFeedURL({ provider: 'github', owner: 'Respawnapp01', repo: 'Respawn-Desktop' })
  autoUpdater.on('checking-for-update', () => console.log('Checking for updates...'))
  autoUpdater.on('update-available', () => {
    if (mainWindow) mainWindow.webContents.executeJavaScript(`if(typeof toast==='function')toast('Update found! Downloading... 🚀','info');`).catch(()=>{})
  })
  autoUpdater.on('update-not-available', () => {
    if (mainWindow) mainWindow.webContents.executeJavaScript(`if(typeof toast==='function')toast('Respawn is up to date ✅','success');`).catch(()=>{})
  })
  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(`if(typeof toast==='function')toast('Update ready! Restart to install 🚀','success');`).catch(()=>{})
    }
    if (Notification.isSupported()) {
      const n = new Notification({ title: 'Respawn Update Ready 🚀', body: 'Click to restart and install', icon: path.join(__dirname, 'icon.ico') })
      n.on('click', () => autoUpdater.quitAndInstall(false, true))
      n.show()
    }
  })
  autoUpdater.on('error', e => console.log('Updater error:', e?.message))
  autoUpdater.checkForUpdatesAndNotify()
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 30 * 60 * 1000)
}

app.whenReady().then(() => {
  createSplash()
  createWindow()
  createTray()
  setTimeout(setupAutoUpdater, 5000)
})

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) { app.quit() }
else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus() }
  })
}

app.on('window-all-closed', e => e.preventDefault())
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
