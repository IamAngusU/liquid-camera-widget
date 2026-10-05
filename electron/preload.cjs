const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("luma", {
  close: () => ipcRenderer.invoke("window:close"),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("window:always-on-top", value),
  setAspectRatio: (ratio) => ipcRenderer.invoke("window:aspect-ratio", ratio),
  getPlatform: () => process.platform
});
