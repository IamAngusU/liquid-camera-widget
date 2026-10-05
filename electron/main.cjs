const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("node:path");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

let mainWindow;

function sizeForRatio(ratio) {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const landscapeWidth = Math.min(620, Math.round(workArea.width * 0.38));

  if (ratio < 0.8) {
    const height = Math.min(680, Math.round(workArea.height * 0.72));
    return [Math.round(height * ratio), height];
  }

  const width = landscapeWidth;
  return [width, Math.round(width / ratio)];
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 520,
    minWidth: 280,
    minHeight: 280,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    resizable: true,
    hasShadow: false,
    roundedCorners: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.once("ready-to-show", () => mainWindow?.show());

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("window:close", () => mainWindow?.close());
ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:always-on-top", (_event, value) => {
  mainWindow?.setAlwaysOnTop(Boolean(value), "floating");
  return mainWindow?.isAlwaysOnTop() ?? false;
});
ipcMain.handle("window:aspect-ratio", (_event, ratio) => {
  if (!mainWindow || !Number.isFinite(ratio) || ratio <= 0) return;
  const [width, height] = sizeForRatio(ratio);
  mainWindow.setAspectRatio(ratio);
  mainWindow.setSize(width, height, true);
});
