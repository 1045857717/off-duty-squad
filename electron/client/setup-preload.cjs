const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("clientSetup", {
  connect: (url) => ipcRenderer.invoke("client:connect", url),
});
