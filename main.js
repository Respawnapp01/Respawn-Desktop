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
    frame: false, backgroundColor: '#090b0f',
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
    const TB_H = 36
    mainWindow.webContents.insertCSS(`
      #_rtb {
        position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important;
        height: ${TB_H}px !important; z-index: 2147483647 !important;
        background: #0d1117 !important; border-bottom: 1px solid #21262d !important;
        display: flex !important; align-items: center !important;
        justify-content: space-between !important;
        padding-left: 14px !important;
        -webkit-app-region: drag !important; user-select: none !important;
        transition: opacity .2s !important;
      }
      #_rtb.hide { opacity: 0 !important; pointer-events: none !important; }
      ._rtb-logo { display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#fff;font-family:Rajdhani,"Segoe UI",sans-serif;letter-spacing:.04em;white-space:nowrap }
      ._rtb-logo em { color:#00e5ff;font-style:normal }
      ._rtb-btns { display:flex;-webkit-app-region:no-drag;height:${TB_H}px }
      ._rtb-btn { width:46px;height:${TB_H}px;border:none;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#8b949e;font-size:14px;transition:background .15s,color .15s }
      ._rtb-btn:hover { background:rgba(255,255,255,.08);color:#fff }
      ._rtb-btn._close:hover { background:#c42b1c;color:#fff }
      body { padding-top: ${TB_H}px !important; }
      .sidenav { top: ${TB_H}px !important; height: calc(100vh - ${TB_H}px) !important; }
      .main-area { top: ${TB_H}px !important; }
      .sidebar-panel { top: ${TB_H}px !important; }
      #mob-tabbar { bottom: 0 !important; }
      #page-welcome, #page-auth { top: ${TB_H}px !important; height: calc(100vh - ${TB_H}px) !important; }
    `)

    mainWindow.webContents.executeJavaScript(`
      if (!document.getElementById('_rtb')) {
        const b = document.createElement('div');
        b.id = '_rtb';
        b.innerHTML = \`
          <div class="_rtb-logo">
            <svg width="15" height="15" viewBox="0 0 64 64" fill="none">
              <path d="M16 10H48Q54 10 54 16V38Q54 44 48 44H28L18 54V44H16Q10 44 10 38V16Q10 10 16 10Z" stroke="#00e5ff" stroke-width="3.5" stroke-linejoin="round"/>
            </svg>
            Re<em>spawn</em>
          </div>
          <div class="_rtb-btns">
            <button class="_rtb-btn" id="_tb_min">&#x2500;</button>
            <button class="_rtb-btn" id="_tb_max">&#x25A1;</button>
            <button class="_rtb-btn _close" id="_tb_cls">&#x2715;</button>
          </div>
        \`;
        document.body.insertBefore(b, document.body.firstChild);
        document.getElementById('_tb_min').onclick = () => window.electronAPI?.minimize();
        document.getElementById('_tb_max').onclick = () => window.electronAPI?.maximize();
        document.getElementById('_tb_cls').onclick = () => window.electronAPI?.close();
      }
    `)

    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null }
      mainWindow.show()
    }, 2400)
  })

  // Hide/show titlebar on fullscreen
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.executeJavaScript(`
      const b=document.getElementById('_rtb');if(b)b.classList.add('hide');
      document.body.style.paddingTop='0';
      const sn=document.querySelector('.sidenav');if(sn){sn.style.top='0';sn.style.height='100vh';}
      const ma=document.querySelector('.main-area');if(ma)ma.style.top='0';
    `).catch(()=>{})
  })
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.executeJavaScript(`
      const b=document.getElementById('_rtb');if(b)b.classList.remove('hide');
      document.body.style.paddingTop='36px';
      const sn=document.querySelector('.sidenav');if(sn){sn.style.top='36px';sn.style.height='calc(100vh - 36px)';}
      const ma=document.querySelector('.main-area');if(ma)ma.style.top='36px';
    `).catch(()=>{})
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
