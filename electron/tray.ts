import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import path from 'path'

let tray: Tray | null = null
let mainWindowRef: BrowserWindow | null = null

export function createTray(mainWindow: BrowserWindow) {
  mainWindowRef = mainWindow

  // Create a simple 16x16 tray icon programmatically
  const icon = nativeImage.createEmpty()
  const size = 16
  const buffer = Buffer.alloc(size * size * 4)

  // Draw a blue circle
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2
      const dy = y - size / 2
      const dist = Math.sqrt(dx * dx + dy * dy)
      const i = (y * size + x) * 4
      if (dist < size / 2 - 1) {
        buffer[i] = 59      // B
        buffer[i + 1] = 130  // G
        buffer[i + 2] = 246  // R (blue)
        buffer[i + 3] = 255  // A
      } else {
        buffer[i + 3] = 0    // transparent
      }
    }
  }

  const trayIcon = nativeImage.createFromBuffer(buffer, { width: size, height: size })

  tray = new Tray(trayIcon)
  tray.setToolTip('WJM - 업무처리 요청')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '열기',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      },
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

export function updateTrayBadge(count: number) {
  if (!tray) return
  if (count > 0) {
    tray.setToolTip(`WJM - ${count}개의 새 알림`)
  } else {
    tray.setToolTip('WJM - 업무처리 요청')
  }
}
