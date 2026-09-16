const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const ADMIN_URL = "https://enjoy-ar-poc.alex-enzo.chatgpt.site/admin";
let activeProcess = null;

function ffmpegPath() {
  if (!app.isPackaged) return require("ffmpeg-static");
  const binary = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  return path.join(process.resourcesPath, "ffmpeg-static", binary);
}

function safeName(name) {
  const stem = path.basename(name, path.extname(name)).replace(/[^a-zA-Z0-9() _.-]/g, "_");
  return `${stem}-web.mp4`;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1050,
    minHeight: 720,
    backgroundColor: "#071426",
    title: "Scan & Enjoy Admin",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://enjoy-ar-poc.alex-enzo.chatgpt.site")) return { action: "allow" };
    void shell.openExternal(url); return { action: "deny" };
  });
  window.webContents.session.setPermissionRequestHandler((_contents, permission, callback) => callback(permission === "media"));
  void window.loadURL(ADMIN_URL);
}

ipcMain.handle("cancel-video", async () => {
  if (activeProcess && activeProcess.exitCode === null) activeProcess.kill("SIGTERM");
});

ipcMain.handle("compress-video", async (event, input) => {
  if (!input || !(input.bytes instanceof ArrayBuffer) || typeof input.name !== "string") throw new Error("Fișier video invalid.");
  const task = path.join(os.tmpdir(), `scan-enjoy-${crypto.randomUUID()}`);
  await fs.mkdir(task, { recursive: true });
  const extension = path.extname(input.name).slice(0, 8) || ".video";
  const source = path.join(task, `input${extension}`);
  const output = path.join(task, "output.mp4");
  await fs.writeFile(source, Buffer.from(input.bytes));
  try {
    const args = ["-y", "-i", source, "-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale=1280:1280:force_original_aspect_ratio=decrease:force_divisible_by=2", "-c:v", "libx264", "-preset", "veryfast", "-b:v", "1000k", "-maxrate", "1100k", "-bufsize", "2200k", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0", "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-ar", "44100", "-movflags", "+faststart", "-sn", "-progress", "pipe:1", "-nostats", output];
    activeProcess = spawn(ffmpegPath(), args, { windowsHide: true });
    let duration = 0;
    let outputTime = 0;
    let errors = "";
    activeProcess.stderr.setEncoding("utf8");
    activeProcess.stderr.on("data", (chunk) => {
      errors = `${errors}${chunk}`.slice(-4000);
      const match = chunk.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (match) duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    });
    activeProcess.stdout.setEncoding("utf8");
    activeProcess.stdout.on("data", (chunk) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (line.startsWith("out_time_ms=")) outputTime = Number(line.slice(12)) / 1_000_000;
        if (duration > 0) event.sender.send("video-progress", Math.max(1, Math.min(98, Math.round(outputTime / duration * 100))));
      }
    });
    const code = await new Promise((resolve, reject) => { activeProcess.once("error", reject); activeProcess.once("close", resolve); });
    activeProcess = null;
    if (code !== 0) throw new Error(code === null ? "Procesarea a fost anulată." : `FFmpeg s-a oprit. ${errors.slice(-700)}`);
    const result = await fs.readFile(output);
    event.sender.send("video-progress", 100);
    return { bytes: result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength), name: safeName(input.name) };
  } finally {
    activeProcess = null;
    await fs.rm(task, { recursive: true, force: true });
  }
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
