const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  setOpacity: (v) => ipcRenderer.send("desktop:opacity", v),
  setCompact: (v) => ipcRenderer.send("desktop:compact", v),
  setPassthrough: (v) => ipcRenderer.send("desktop:passthrough", v),
  setPinned: (v) => ipcRenderer.send("desktop:pinned", v),
  hide: () => ipcRenderer.send("desktop:hide"),
  close: () => ipcRenderer.send("desktop:close"),
  onStatus: (cb) => {
    const listener = (_e, s) => {
      if (typeof s === "string") cb(s);
    };
    ipcRenderer.on("desktop:status", listener);
    return () => ipcRenderer.removeListener("desktop:status", listener);
  },
});
