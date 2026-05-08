const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, shell, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

let mainWindow
let tray

const RESPAWN_URL = 'https://respawnapp.uk'

// Remove default menu bar
Menu.setApplicationMenu(null)

// ── AUTO UPDATER ──
function setupAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', () => {
    // Silent download — don't bother the user
    console.log('Update available, downloading silently...')
  })

  autoUpdater.on('update-downloaded', () => {
    // Show notification that update is ready
    if (Notification.isSupported()) {
      const notif = new Notification({
        title: 'Respawn Update Ready 🚀',
        body: 'A new version has been downloaded. Restart to apply.',
        icon: path.join(__dirname, 'icon.ico'),
      })
      notif.on('click', () => {
        autoUpdater.quitAndInstall(false, true)
      })
      notif.show()
    }
  })

  autoUpdater.on('error', (err) => {
    console.log('Auto updater error:', err)
  })

  // Check for updates every 30 minutes
  autoUpdater.checkForUpdatesAndNotify()
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 30 * 60 * 1000)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'Respawn',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#090b0f',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
  })

  mainWindow.loadURL(RESPAWN_URL)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(RESPAWN_URL)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Respawn',
      click: () => { mainWindow.show(); mainWindow.focus() }
    },
    { type: 'separator' },
    {
      label: 'Check for Updates',
      click: () => autoUpdater.checkForUpdatesAndNotify()
    },
    { type: 'separator' },
    {
      label: 'Quit Respawn',
      click: () => { app.isQuiting = true; app.quit() }
    }
  ])

  tray.setToolTip('Respawn — Find Your Squad')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()
  // Start auto updater after app loads
  setTimeout(setupAutoUpdater, 3000)
})

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.on('window-all-closed', (e) => {
  e.preventDefault()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
