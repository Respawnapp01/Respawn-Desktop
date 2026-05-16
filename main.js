const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, shell, ipcMain, dialog, screen } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

let mainWindow, splashWindow, overlayWindow, tray
const RESPAWN_URL = 'https://respawnapp.uk/app'
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
    autoHideMenuBar: true,
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

  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null }
      mainWindow.show()
    }, 2400)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(RESPAWN_URL)) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })

  // When minimised — ask if user wants overlay
  mainWindow.on('minimize', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) return // Already showing
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Enable Overlay', 'Just Minimise'],
      defaultId: 0,
      title: 'Gaming Overlay',
      message: 'Enable the Respawn gaming overlay?',
      detail: 'A floating icon will appear on screen so you get notifications while gaming.',
      icon: path.join(__dirname, 'icon.ico')
    })
    if (choice === 0) createOverlay()
  })

  mainWindow.on('close', (e) => { if (!app.isQuiting) { e.preventDefault(); mainWindow.hide() } })
}

// ── OVERLAY WINDOW ──
function createOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.show()
    return
  }
  overlayWindow = new BrowserWindow({
    width: screen.getPrimaryDisplay().workAreaSize.width,
    height: screen.getPrimaryDisplay().workAreaSize.height,
    x: 0, y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'overlay-preload.js'),
    }
  })
  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'))
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })
  // Send app path so overlay can load logo
  overlayWindow.webContents.on('did-finish-load', () => {
    overlayWindow.webContents.send('overlay-app-path', __dirname)
  })
  overlayWindow.on('closed', () => { overlayWindow = null })
}

// ── TRAY ──
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('Respawn — Find Your Squad 🎮')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Respawn', click: () => { mainWindow.show(); mainWindow.focus() } },
    { label: 'Toggle Overlay', click: () => { if (overlayWindow && !overlayWindow.isDestroyed()) { overlayWindow.close() } else { createOverlay() } } },
    { type: 'separator' },
    { label: 'Check for Updates', click: () => autoUpdater.checkForUpdatesAndNotify() },
    { type: 'separator' },
    { label: 'Quit Respawn', click: () => { app.isQuiting = true; app.quit() } }
  ]))
  tray.on('click', () => { if (mainWindow.isVisible()) mainWindow.hide(); else { mainWindow.show(); mainWindow.focus() } })
}

// ── IPC ──
ipcMain.on('overlay-set-clickthrough', (e, passThrough) => {
  overlayWindow?.setIgnoreMouseEvents(passThrough, { forward: true })
})
ipcMain.on('overlay-get-app-path', (e) => {
  e.sender.send('overlay-app-path', __dirname)
})
ipcMain.on('minimize', () => mainWindow?.minimize())
ipcMain.on('maximize', () => { if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize() })
ipcMain.on('close', () => mainWindow?.hide())
ipcMain.on('check-updates', () => autoUpdater.checkForUpdatesAndNotify())

// Overlay IPC
ipcMain.on('overlay-open-app', (e, data) => {
  mainWindow?.show(); mainWindow?.focus()
  if (data) mainWindow?.webContents.send('overlay-focus', data)
})
ipcMain.on('overlay-hide', () => { overlayWindow?.close() })
ipcMain.on('overlay-dnd', (e, isDND) => { /* store state */ })
ipcMain.on('overlay-accept-friend', (e, uid) => {
  mainWindow?.webContents.send('overlay-accept-friend', uid)
})
ipcMain.on('overlay-reply', (e, data) => {
  mainWindow?.webContents.send('overlay-reply', data)
})
ipcMain.on('overlay-ren-ask', async (e, msg) => {
  // Forward to main window which has the Gemini API
  mainWindow?.webContents.send('overlay-ren-ask', msg)
})

// Forward Ren reply back to overlay
ipcMain.on('overlay-ren-reply', (e, reply) => {
  overlayWindow?.webContents.send('overlay-ren-reply', reply)
})

// Forward notifications from main app to overlay
ipcMain.on('overlay-notify', (e, data) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('overlay-notify', data)
  }
})

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
      const n = new Notification({
        title: 'Respawn Update Ready 🚀',
        body: 'Click to restart and install the latest version',
        icon: path.join(__dirname, 'icon.ico')
      })
      n.on('click', () => {
        // Force close everything before installing
        app.isQuiting = true
        if (tray) tray.destroy()
        if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.destroy()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.removeAllListeners('close')
          mainWindow.destroy()
        }
        setTimeout(() => autoUpdater.quitAndInstall(false, true), 500)
      })
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
