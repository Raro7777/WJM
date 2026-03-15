import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import path from 'path'
import { createTray, updateTrayBadge } from './tray'
import { WindowManager } from './window-manager'

let mainWindow: BrowserWindow | null = null
let windowManager: WindowManager | null = null
const detailWindows = new Map<string, BrowserWindow>()

const COLLAPSED_SIZE = { width: 90, height: 90 }
const HOVER_SIZE = { width: 360, height: 500 }
const MAX_EXPANDED_HEIGHT = 700

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay()

  mainWindow = new BrowserWindow({
    width: COLLAPSED_SIZE.width,
    height: COLLAPSED_SIZE.height,
    x: workArea.x + workArea.width - COLLAPSED_SIZE.width - 20,
    y: workArea.y + workArea.height - COLLAPSED_SIZE.height - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  windowManager = new WindowManager(mainWindow, COLLAPSED_SIZE, HOVER_SIZE)

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Snap to nearest corner after dragging
  mainWindow.on('moved', () => {
    if (windowManager && !windowManager.isExpanded) {
      windowManager.snapToNearestCorner()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    windowManager = null
  })
}

function openDetailWindow(taskId: string) {
  // If already open, focus it
  if (detailWindows.has(taskId)) {
    const existing = detailWindows.get(taskId)!
    existing.focus()
    return
  }

  const { workArea } = screen.getPrimaryDisplay()
  const detailWin = new BrowserWindow({
    width: 480,
    height: 700,
    x: workArea.x + workArea.width - 480 - 100,
    y: workArea.y + 50,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: true,
    minWidth: 400,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const url = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}?view=detail&taskId=${taskId}`
    : `file://${path.join(__dirname, '../dist/index.html')}?view=detail&taskId=${taskId}`

  detailWin.loadURL(url)

  detailWindows.set(taskId, detailWin)
  detailWin.on('closed', () => {
    detailWindows.delete(taskId)
  })
}

function setupIPC() {
  ipcMain.handle('widget:expand', () => {
    windowManager?.expand()
  })

  ipcMain.handle('widget:collapse', () => {
    windowManager?.collapse()
  })

  ipcMain.handle('widget:toggle', () => {
    windowManager?.toggle()
  })

  ipcMain.handle('widget:get-state', () => {
    return windowManager?.isExpanded ?? false
  })

  ipcMain.handle('widget:get-corner', () => {
    return windowManager?.corner ?? 'bottom-right'
  })

  ipcMain.handle('widget:resize', (_event, width: number, height: number) => {
    windowManager?.resizeExpanded(width, height, MAX_EXPANDED_HEIGHT)
  })

  ipcMain.handle('widget:set-badge', (_event, count: number) => {
    updateTrayBadge(count)
  })

  ipcMain.handle('widget:open-detail', (_event, taskId: string) => {
    openDetailWindow(taskId)
  })

  ipcMain.handle('widget:open-create', () => {
    openDetailWindow('__create__')
  })

  ipcMain.handle('window:minimize', () => {
    mainWindow?.hide()
  })

  ipcMain.handle('window:close-detail', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.hide()
  })
}

app.whenReady().then(() => {
  createWindow()
  setupIPC()
  createTray(mainWindow!)

  globalShortcut.register('Ctrl+Shift+W', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
