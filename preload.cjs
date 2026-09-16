const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("scanEnjoyDesktop", {
  platform: process.platform === "darwin" ? "mac" : "windows",
  compressVideo: (input) => ipcRenderer.invoke("compress-video", input),
  cancelVideo: () => ipcRenderer.invoke("cancel-video"),
  onVideoProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("video-progress", listener);
    return () => ipcRenderer.removeListener("video-progress", listener);
  },
});
