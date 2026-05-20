import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('cutoutAPI', {
  selectFrameFolder: () => ipcRenderer.invoke('dialog:select-frame-folder'),

  selectVideoFile: () => ipcRenderer.invoke('dialog:select-video-file'),

  getDroppedPath: (file: File) => webUtils.getPathForFile(file),

  resolveDroppedPath: (filePath: string) =>
    ipcRenderer.invoke('input:resolve-dropped-path', filePath),

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
    preset: 'C' | 'F' | 'I' | 'Custom'
    alphaLow: number
    shrink: number
  }) => ipcRenderer.invoke('process:run-single-cutout', args),

  runBatchCutout: (args: {
    inputDir: string
    preset: 'C' | 'F' | 'I' | 'Custom'
    alphaLow: number
    shrink: number
    skipRembg?: boolean
  }) => ipcRenderer.invoke('process:run-batch-cutout', args),

  readImageAsDataUrl: (filePath: string) =>
    ipcRenderer.invoke('preview:read-image-data-url', filePath),
  
  runSelfCheck: () =>
  ipcRenderer.invoke('system:run-self-check'),
  
  selectBackgroundImageFile: () =>
  ipcRenderer.invoke('dialog:select-background-image-file'),

  saveProcessConfig: (args: {
    folderPath: string
    config: {
      version: 1
      updatedAt: string
      inputPath: string
      selectedFolder: string
      selectedVideo: string
      assetType: string
      frameCount: string
      frameSize: string
      preset: 'C' | 'F' | 'I' | 'Custom'
      alphaLow: number
      shrink: number
      videoFps: number
      videoDuration: number
      videoOutputPrefix: string
      playbackFps: number
      previewBackground: 'checker' | 'black' | 'white' | 'gray' | 'custom'
      customPreviewBackground: string
      lastFrameName: string
      activePreviewTab: 'original' | 'raw' | 'soft'
    }
  }) => ipcRenderer.invoke('config:save-process-config', args),

  loadProcessConfig: (folderPath: string) =>
    ipcRenderer.invoke('config:load-process-config', folderPath),

  openFolder: (folderPath: string) =>
    ipcRenderer.invoke('shell:open-folder', folderPath)
})