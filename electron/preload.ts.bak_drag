import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('cutoutAPI', {
  selectFrameFolder: () => ipcRenderer.invoke('dialog:select-frame-folder'),

  selectVideoFile: () => ipcRenderer.invoke('dialog:select-video-file'),

  scanFrameFolder: (folderPath: string) =>
    ipcRenderer.invoke('frames:scan-folder', folderPath),

  extractVideoFrames: (args: {
    videoPath: string
    fps: number
    durationSeconds: number
    outputPrefix: string
  }) => ipcRenderer.invoke('video:extract-frames', args),

  runSingleCutout: (args: {
    inputDir: string
    frameName: string
    preset: 'H' | 'I' | 'Custom'
    alphaLow: number
    shrink: number
  }) => ipcRenderer.invoke('process:run-single-cutout', args),

  runBatchCutout: (args: {
    inputDir: string
    preset: 'H' | 'I' | 'Custom'
    alphaLow: number
    shrink: number
  }) => ipcRenderer.invoke('process:run-batch-cutout', args),

  readImageAsDataUrl: (filePath: string) =>
    ipcRenderer.invoke('preview:read-image-data-url', filePath),

  openFolder: (folderPath: string) =>
    ipcRenderer.invoke('shell:open-folder', folderPath)
})