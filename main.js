const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, shell, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

let mainWindow, splashWindow, tray
const RESPAWN_URL = 'https://respawnapp.uk'
Menu.setApplicationMenu(null)

// ── SPLASH SCREEN ──
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 380,
    height: 380,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  })
  splashWindow.loadURL(`data:text/html,<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:transparent;display:flex;align-items:center;justify-content:center;height:100vh;-webkit-app-region:drag}
.card{background:#0d1117;border:1px solid #21262d;border-radius:24px;width:300px;height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;box-shadow:0 0 80px rgba(0,229,255,0.2),0 20px 60px rgba(0,0,0,.9);animation:pop .4s cubic-bezier(.175,.885,.32,1.275)}
@keyframes pop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
.logo{display:flex;flex-direction:column;align-items:center;gap:12px}
.title{font-family:'Segoe UI',sans-serif;font-size:32px;font-weight:800;color:#fff;letter-spacing:.06em}
.title span{color:#00e5ff}
.bar{width:180px;height:3px;background:#21262d;border-radius:2px;overflow:hidden}
.fill{height:100%;background:linear-gradient(90deg,#00e5ff,#7c3aed);border-radius:2px;animation:load 2s ease forwards;box-shadow:0 0 10px #00e5ff}
@keyframes load{from{width:0}to{width:100%}}
.sub{font-family:'Segoe UI',sans-serif;font-size:11px;color:#8b949e;letter-spacing:.15em;text-transform:uppercase}
</style></head>
<body><div class="card">
  <div class="logo">
    <svg width="52" height="52" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 10 H48 Q54 10 54 16 V38 Q54 44 48 44 H28 L18 54 V44 H16 Q10 44 10 38 V16 Q10 10 16 10 Z" stroke="#00e5ff" stroke-width="3" stroke-linejoin="round"/>
      <rect x="24" y="24" width="5" height="9" rx="2.5" fill="#00e5ff"/>
      <rect x="35" y="24" width="5" height="9" rx="2.5" fill="#00e5ff"/>
    </svg>
    <div class="title">Re<span>spawn</span></div>
  </div>
  <div class="bar"><div class="fill"></div></div>
  <div class="sub">Find Your Squad</div>
</div></body></html>`)
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
    // Inject custom titlebar CSS + HTML
    mainWindow.webContents.insertCSS(`
      #respawn-titlebar {
        position: fixed !important;
        top: 0 !important; left: 0 !important; right: 0 !important;
        height: 36px !important;
        background: var(--s900, #0d1117) !important;
        border-bottom: 1px solid var(--s700, #21262d) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0 0 0 14px !important;
        z-index: 999999 !important;
        -webkit-app-region: drag !important;
        user-select: none !important;
        transition: transform 0.2s ease !important;
      }
      #respawn-titlebar.hidden { transform: translateY(-36px) !important; }
      body { padding-top: 36px !important; }
      .sidenav { top: 36px !important; height: calc(100vh - 36px) !important; }
      .main-area { top: 36px !important; }
      #page-welcome, #page-auth { padding-top: 36px !important; }
      .tb-logo { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #fff; letter-spacing: 0; font-family: 'Rajdhani', 'Segoe UI', sans-serif; }
      .tb-logo span { color: #00e5ff; }
      .tb-btns { display: flex; -webkit-app-region: no-drag; height: 36px; }
      .tb-btn { width: 46px; height: 36px; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #8b949e; font-size: 13px; transition: background 0.15s, color 0.15s; }
      .tb-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
      .tb-btn.close:hover { background: #e81123; color: #fff; }
    `)
    mainWindow.webContents.executeJavaScript(`
      if (!document.getElementById('respawn-titlebar')) {
        const bar = document.createElement('div');
        bar.id = 'respawn-titlebar';
        bar.innerHTML = \`
          <div class="tb-logo">
            <svg width="16" height="16" viewBox="0 0 64 64" fill="none">
              <path d="M16 10 H48 Q54 10 54 16 V38 Q54 44 48 44 H28 L18 54 V44 H16 Q10 44 10 38 V16 Q10 10 16 10 Z" stroke="#00e5ff" stroke-width="3.5" stroke-linejoin="round"/>
            </svg>
            Re<span>spawn</span>
          </div>
          <div class="tb-btns">
            <button class="tb-btn" id="tb-min">&#x2500;</button>
            <button class="tb-btn" id="tb-max">&#x25A1;</button>
            <button class="tb-btn close" id="tb-close">&#x2715;</button>
          </div>
        \`;
        document.body.insertBefore(bar, document.body.firstChild);
        document.getElementById('tb-min').onclick = () => window.electronAPI?.minimize();
        document.getElementById('tb-max').onclick = () => window.electronAPI?.maximize();
        document.getElementById('tb-close').onclick = () => window.electronAPI?.close();

        // Auto-hide titlebar in fullscreen
        document.addEventListener('fullscreenchange', () => {
          bar.classList.toggle('hidden', !!document.fullscreenElement);
          document.body.style.paddingTop = document.fullscreenElement ? '0' : '36px';
        });
      }
    `)

    // Show window, hide splash after 2.2s
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close()
        splashWindow = null
      }
      mainWindow.show()
    }, 2200)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(RESPAWN_URL)) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) { e.preventDefault(); mainWindow.hide() }
  })

  // Hide titlebar when Electron goes fullscreen
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.executeJavaScript(`
      const bar = document.getElementById('respawn-titlebar');
      if(bar){bar.classList.add('hidden');document.body.style.paddingTop='0';}
    `).catch(()=>{})
  })
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.executeJavaScript(`
      const bar = document.getElementById('respawn-titlebar');
      if(bar){bar.classList.remove('hidden');document.body.style.paddingTop='36px';}
    `).catch(()=>{})
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

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.executeJavaScript(`if(typeof toast==='function')toast('Checking for updates...','info');`).catch(()=>{})
  })
  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.executeJavaScript(`if(typeof toast==='function')toast('Update found! Downloading silently... 🚀','info');`).catch(()=>{})
  })
  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.executeJavaScript(`if(typeof toast==='function')toast('Respawn is up to date ✅','success');`).catch(()=>{})
  })
  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.executeJavaScript(`if(typeof toast==='function')toast('Update ready! Restart to install 🚀','success');`).catch(()=>{})
    // Show Windows notification
    if (Notification.isSupported()) {
      const n = new Notification({ title: 'Respawn Update Ready 🚀', body: 'Restart to install the latest version', icon: path.join(__dirname, 'icon.ico') })
      n.on('click', () => autoUpdater.quitAndInstall(true, true))
      n.show()
    }
  })
  autoUpdater.on('error', e => console.log('Updater error:', e?.message))
  autoUpdater.checkForUpdatesAndNotify()
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 30 * 60 * 1000)
}

// ── APP INIT ──
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
