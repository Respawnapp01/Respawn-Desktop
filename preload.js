const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  checkForUpdates: () => ipcRenderer.send('check-updates'),
  // Overlay
  sendOverlayNotify: (data) => ipcRenderer.send('overlay-notify', data),
  sendOverlayRenReply: (reply) => ipcRenderer.send('overlay-ren-reply', reply),
  onOverlayFocus: (cb) => ipcRenderer.on('overlay-focus', (e, data) => cb(data)),
  onOverlayAcceptFriend: (cb) => ipcRenderer.on('overlay-accept-friend', (e, uid) => cb(uid)),
  onOverlayReply: (cb) => ipcRenderer.on('overlay-reply', (e, data) => cb(data)),
  onOverlayRenAsk: (cb) => ipcRenderer.on('overlay-ren-ask', (e, msg) => cb(msg)),
})
