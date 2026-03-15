import { BrowserWindow, screen } from 'electron'

interface Size {
  width: number
  height: number
}

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const MARGIN = 20

export class WindowManager {
  private window: BrowserWindow
  private collapsedSize: Size
  private expandedSize: Size
  private _isExpanded = false
  private _corner: Corner = 'bottom-right'

  constructor(window: BrowserWindow, collapsedSize: Size, expandedSize: Size) {
    this.window = window
    this.collapsedSize = collapsedSize
    this.expandedSize = expandedSize
  }

  get isExpanded() {
    return this._isExpanded
  }

  get corner() {
    return this._corner
  }

  /** Snap collapsed widget to nearest corner preset */
  snapToNearestCorner() {
    if (this._isExpanded) return

    const [currentX, currentY] = this.window.getPosition()
    const { workArea } = screen.getPrimaryDisplay()

    const centerX = currentX + this.collapsedSize.width / 2
    const centerY = currentY + this.collapsedSize.height / 2
    const midX = workArea.x + workArea.width / 2
    const midY = workArea.y + workArea.height / 2

    // Determine nearest corner
    const isRight = centerX > midX
    const isBottom = centerY > midY

    if (isRight && isBottom) this._corner = 'bottom-right'
    else if (!isRight && isBottom) this._corner = 'bottom-left'
    else if (isRight && !isBottom) this._corner = 'top-right'
    else this._corner = 'top-left'

    // Snap position
    const pos = this.getCornerPosition(this._corner, this.collapsedSize)
    this.window.setBounds({
      x: pos.x,
      y: pos.y,
      width: this.collapsedSize.width,
      height: this.collapsedSize.height,
    })

    this.window.webContents.send('widget:corner-changed', this._corner)
  }

  /** Get x,y for a given corner and size */
  private getCornerPosition(corner: Corner, size: Size): { x: number; y: number } {
    const { workArea } = screen.getPrimaryDisplay()

    switch (corner) {
      case 'top-left':
        return { x: workArea.x + MARGIN, y: workArea.y + MARGIN }
      case 'top-right':
        return { x: workArea.x + workArea.width - size.width - MARGIN, y: workArea.y + MARGIN }
      case 'bottom-left':
        return { x: workArea.x + MARGIN, y: workArea.y + workArea.height - size.height - MARGIN }
      case 'bottom-right':
        return { x: workArea.x + workArea.width - size.width - MARGIN, y: workArea.y + workArea.height - size.height - MARGIN }
    }
  }

  expand() {
    if (this._isExpanded) return

    const pos = this.getCornerPosition(this._corner, this.expandedSize)

    this.window.setBounds({
      x: pos.x,
      y: pos.y,
      width: this.expandedSize.width,
      height: this.expandedSize.height,
    })

    this._isExpanded = true
    this.window.webContents.send('widget:state-changed', true)
  }

  collapse() {
    if (!this._isExpanded) return

    const pos = this.getCornerPosition(this._corner, this.collapsedSize)

    this.window.setBounds({
      x: pos.x,
      y: pos.y,
      width: this.collapsedSize.width,
      height: this.collapsedSize.height,
    })

    this._isExpanded = false
    this.window.webContents.send('widget:state-changed', false)
  }

  /** Resize expanded panel, keeping anchor at current corner */
  resizeExpanded(width: number, height: number, maxHeight: number) {
    if (!this._isExpanded) return

    const clampedH = Math.min(height, maxHeight)
    const pos = this.getCornerPosition(this._corner, { width, height: clampedH })

    this.window.setBounds({
      x: pos.x,
      y: pos.y,
      width,
      height: clampedH,
    })
  }

  toggle() {
    if (this._isExpanded) {
      this.collapse()
    } else {
      this.expand()
    }
  }
}
