const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, shell } = require('electron')
const path = require('path')

let mainWindow
let tray

const RESPAWN_URL = 'https://respawnapp.uk'
const APP_NAME = 'Respawn'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'Respawn',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#090b0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    titleBarStyle: 'default',
    show: false, // Don't show until ready
  })

  // Load the app
  mainWindow.loadURL(RESPAWN_URL)

  // Show window when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in browser, not in app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(RESPAWN_URL)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Minimise to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  // Use app icon for tray
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Respawn',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Respawn',
      click: () => {
        app.isQuiting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('Respawn — Find Your Squad')
  tray.setContextMenu(contextMenu)

  // Click tray icon to show/hide
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// Show native Windows notification
function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
      icon: path.join(__dirname, 'icon.ico'),
      silent: false,
    }).show()
  }
}

// App ready
app.whenReady().then(() => {
  createWindow()
  createTray()

  // Request notification permission
  if (Notification.isSupported()) {
    showNotification('Respawn is running', 'Find your squad 🎮')
  }
})

// Prevent multiple instances
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

// Keep app running in background
app.on('window-all-closed', (e) => {
  e.preventDefault()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
