const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('overlayAPI', {
  send: (channel, data) => {
    const allowed = ['overlay-open-app','overlay-hide','overlay-dnd','overlay-accept-friend',
                     'overlay-reply','overlay-ren-ask','overlay-set-clickthrough','overlay-get-app-path',
                     'overlay-call-start','overlay-call-speaking','overlay-call-end']
    if (allowed.includes(channel)) ipcRenderer.send(channel, data)
  },
  on: (channel, cb) => {
    const allowed = ['overlay-notify','overlay-ren-reply','overlay-app-path','overlay-call-start','overlay-call-speaking','overlay-call-end']
    if (allowed.includes(channel)) ipcRenderer.on(channel, (e, ...args) => cb(...args))
  }
})
