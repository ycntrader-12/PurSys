const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, explicit, and typed API facade to the renderer process
contextBridge.exposeInMainWorld('purSysApi', {
  getOsInfo: () => ipcRenderer.invoke('pursys:get-os-info'),
  getMetrics: () => ipcRenderer.invoke('pursys:get-metrics'),
  getHwid: () => ipcRenderer.invoke('pursys:get-hwid'),
  verifyLicense: (key) => ipcRenderer.invoke('pursys:verify-license', key),
  scanSystem: (categories) => ipcRenderer.invoke('pursys:scan-system', categories),
  cleanSystem: (categories, licenseKey) =>
    ipcRenderer.invoke('pursys:clean-system', { categories, licenseKey }),
  flushRam: (licenseKey) => ipcRenderer.invoke('pursys:flush-ram', licenseKey),
  listStartup: () => ipcRenderer.invoke('pursys:list-startup'),
  toggleStartup: (name, enable, licenseKey) =>
    ipcRenderer.invoke('pursys:toggle-startup', { name, enable, licenseKey }),
});
