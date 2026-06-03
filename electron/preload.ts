import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('cutoutAPI', {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),

  selectFrameFolder: () => ipcRenderer.invoke('dialog:select-frame-folder'),

  selectVideoFile: () => ipcRenderer.invoke('dialog:select-video-file'),

  selectExportFolder: () => ipcRenderer.invoke('dialog:select-export-folder'),

  getDroppedPath: (file: File) => webUtils.getPathForFile(file),

  resolveDroppedPath: (filePath: string) =>
    ipcRenderer.invoke('input:resolve-dropped-path', filePath),

  scanFrameFolder: (folderPath: string) =>
    ipcRenderer.invoke('frames:scan-folder', folderPath),

  inspectCacheStatus: (args: {
    inputDir: string
    preset: 'C' | 'F' | 'I' | 'Custom'
    alphaLow?: number
    shrink?: number
  }) => ipcRenderer.invoke('cache:inspect-status', args),

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
    taskId?: string
    inputDir: string
    preset: 'C' | 'F' | 'I' | 'Custom'
    alphaLow: number
    shrink: number
    skipRembg?: boolean
  }) => ipcRenderer.invoke('process:run-batch-cutout', args),

  onBatchProgress: (callback: (event: {
    taskId: string
    stage: 'prepare' | 'rembg' | 'postprocess' | 'done' | 'error'
    message: string
    inputCount?: number
    rawCount?: number
    outputCount?: number
    outputDir?: string
    debugMessage?: string
  }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: {
      taskId: string
      stage: 'prepare' | 'rembg' | 'postprocess' | 'done' | 'error'
      message: string
      inputCount?: number
      rawCount?: number
      outputCount?: number
      outputDir?: string
      debugMessage?: string
    }) => {
      callback(payload)
    }

    ipcRenderer.on('process:batch-progress', listener)
    return () => {
      ipcRenderer.removeListener('process:batch-progress', listener)
    }
  },

  readImageAsDataUrl: (filePath: string) =>
    ipcRenderer.invoke('preview:read-image-data-url', filePath),

  exportTransparentPngSequence: (args: {
    sourceDir: string
    targetRootDir: string
    inputDir?: string
    naming?: {
      prefix?: string
      startIndex?: number
      padding?: number
    }
  }) => ipcRenderer.invoke('export:transparent-png-sequence', args),
  
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
      outputFolder: string
      rawFolder: string
      softFolder: string
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
      activePreviewTab: 'original' | 'raw' | 'soft' | 'compare'
    }
  }) => ipcRenderer.invoke('config:save-process-config', args),

  loadProcessConfig: (folderPath: string) =>
    ipcRenderer.invoke('config:load-process-config', folderPath),

  openFolder: (folderPath: string) =>
    ipcRenderer.invoke('shell:open-folder', folderPath)
})
