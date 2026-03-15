import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  expandWidget: () => ipcRenderer.invoke('widget:expand'),
  collapseWidget: () => ipcRenderer.invoke('widget:collapse'),
  toggleWidget: () => ipcRenderer.invoke('widget:toggle'),
  getWidgetState: () => ipcRenderer.invoke('widget:get-state'),
  getWidgetCorner: () => ipcRenderer.invoke('widget:get-corner'),
  resizeWidget: (width: number, height: number) => ipcRenderer.invoke('widget:resize', width, height),
  setBadge: (count: number) => ipcRenderer.invoke('widget:set-badge', count),
  openDetail: (taskId: string) => ipcRenderer.invoke('widget:open-detail', taskId),
  openCreate: () => ipcRenderer.invoke('widget:open-create'),
  closeDetail: () => ipcRenderer.invoke('window:close-detail'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  platform: process.platform,
})
