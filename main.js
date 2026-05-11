const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, shell, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

let mainWindow, splashWindow, tray
const RESPAWN_URL = 'https://respawnapp.uk'
Menu.setApplicationMenu(null)

// ── SPLASH SCREEN ──
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 380, height: 380,
    frame: false, transparent: true,
    alwaysOnTop: true, skipTaskbar: true,
    resizable: false, center: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  })
  splashWindow.loadURL(`data:text/html,<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:transparent;display:flex;align-items:center;justify-content:center;height:100vh;-webkit-app-region:drag}
.card{background:#0d1117;border:1px solid #21262d;border-radius:24px;width:300px;height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;box-shadow:0 0 80px rgba(0,229,255,.2),0 20px 60px rgba(0,0,0,.9);animation:pop .4s cubic-bezier(.175,.885,.32,1.275)}
@keyframes pop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
.title{font-family:"Segoe UI",sans-serif;font-size:34px;font-weight:800;color:#fff;letter-spacing:.04em}
.title span{color:#00e5ff}
.bar{width:180px;height:3px;background:#21262d;border-radius:2px;overflow:hidden}
.fill{height:100%;background:linear-gradient(90deg,#00e5ff,#7c3aed);animation:load 2s ease forwards;box-shadow:0 0 10px #00e5ff}
@keyframes load{from{width:0}to{width:100%}}
.sub{font-family:"Segoe UI",sans-serif;font-size:11px;color:#8b949e;letter-spacing:.15em;text-transform:uppercase}
</style></head>
<body><div class="card">
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
    <path d="M16 10H48Q54 10 54 16V38Q54 44 48 44H28L18 54V44H16Q10 44 10 38V16Q10 10 16 10Z" stroke="#00e5ff" stroke-width="3" stroke-linejoin="round"/>
    <rect x="24" y="24" width="5" height="9" rx="2.5" fill="#00e5ff"/>
    <rect x="35" y="24" width="5" height="9" rx="2.5" fill="#00e5ff"/>
  </svg>
  <div class="title">Re<span>spawn</span></div>
  <div class="bar"><div class="fill"></div></div>
  <div class="sub">Find Your Squad</div>
</div></body></html>`)
}

// ── MAIN WINDOW ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820,
    minWidth: 800, minHeight: 600,
    // Use titleBarOverlay — native Windows titlebar area, no CSS fighting
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0d1117',
      symbolColor: '#8b949e',
      height: 36
    },
    backgroundColor: '#090b0f',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    show: false,
  })

  mainWindow.loadURL(RESPAWN_URL)

  // Inject minimal CSS to account for the 36px overlay area
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      body { padding-top: 36px !important; }
      .sidenav { top: 36px !important; height: calc(100vh - 36px) !important; }
      .main-area { top: 36px !important; }
      .sidebar-panel { top: 36px !important; }
      #page-welcome, #page-auth { padding-top: 36px !important; }
    `)

    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null }
      mainWindow.show()
    }, 2400)
  })

  // Remove extra padding in fullscreen
  mainWindow.on('enter-full-screen', () => {
    mainWindow.setTitleBarOverlay({ height: 0 })
    mainWindow.webContents.insertCSS(`
      body { padding-top: 0 !important; }
      .sidenav { top: 0 !important; height: 100vh !important; }
      .main-area { top: 0 !important; }
      .sidebar-panel { top: 0 !important; }
    `)
  })
  mainWindow.on('leave-full-screen', () => {
    mainWindow.setTitleBarOverlay({ color: '#0d1117', symbolColor: '#8b949e', height: 36 })
    mainWindow.webContents.insertCSS(`
      body { padding-top: 36px !important; }
      .sidenav { top: 36px !important; height: calc(100vh - 36px) !important; }
      .main-area { top: 36px !important; }
      .sidebar-panel { top: 36px !important; }
    `)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(RESPAWN_URL)) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })
  mainWindow.on('close', (e) => { if (!app.isQuiting) { e.preventDefault(); mainWindow.hide() } })
}

// ── TRAY ──
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('Respawn — Find Your Squad 🎮')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Respawn', click: () => { mainWindow.show(); mainWindow.focus() } },
    { type: 'separator' },
    { label: 'Check for Updates', click: () => autoUpdater.checkForUpdatesAndNotify() },
    { type: 'separator' },
    { label: 'Quit Respawn', click: () => { app.isQuiting = true; app.quit() } }
  ]))
  tray.on('click', () => { if (mainWindow.isVisible()) mainWindow.hide(); else { mainWindow.show(); mainWindow.focus() } })
}

// ── IPC ──
ipcMain.on('minimize', () => mainWindow?.minimize())
ipcMain.on('maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
ipcMain.on('close', () => mainWindow?.hide())
ipcMain.on('check-updates', () => autoUpdater.checkForUpdatesAndNotify())

// ── AUTO UPDATER ──
function setupAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.setFeedURL({ provider: 'github', owner: 'Respawnapp01', repo: 'Respawn-Desktop' })
  autoUpdater.on('checking-for-update', () => mainWindow?.webContents.executeJavaScript(`if(typeof toast==='function')toast('Checking for updates...','info')`).catch(()=>{}))
  autoUpdater.on('update-available', () => mainWindow?.webContents.executeJavaScript(`if(typeof toast==='function')toast('Update found! Downloading... 🚀','info')`).catch(()=>{}))
  autoUpdater.on('update-not-available', () => mainWindow?.webContents.executeJavaScript(`if(typeof toast==='function')toast('Respawn is up to date ✅','success')`).catch(()=>{}))
  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.executeJavaScript(`if(typeof toast==='function')toast('Update ready — restart to install 🚀','success')`).catch(()=>{})
    if (Notification.isSupported()) {
      const n = new Notification({ title: 'Respawn Update Ready 🚀', body: 'Click to restart and install', icon: path.join(__dirname, 'icon.ico') })
      n.on('click', () => autoUpdater.quitAndInstall(true, true))
      n.show()
    }
  })
  autoUpdater.on('error', e => console.log('Updater error:', e?.message))
  autoUpdater.checkForUpdatesAndNotify()
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 30 * 60 * 1000)
}

// ── INIT ──
app.whenReady().then(() => { createSplash(); createWindow(); createTray(); setTimeout(setupAutoUpdater, 5000) })
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) { app.quit() }
else { app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus() } }) }
app.on('window-all-closed', e => e.preventDefault())
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
