export {}

declare global {
  type FrameFolderScanResult = {
    ok: boolean
    message?: string
    folderPath: string
    type?: 'frames'
    pngCount: number
    checkedCount?: number
    width?: number
    height?: number
    sameSize?: boolean
    hasAlpha?: boolean
    hasAlphaCount?: number
    firstFile?: string
    lastFile?: string
    firstFileName?: string
    lastFileName?: string
    files: string[]
  }

  type CutoutPreset = 'H' | 'I' | 'Custom'

  type RunBatchCutoutArgs = {
    inputDir: string
    preset: CutoutPreset
    alphaLow: number
    shrink: number
  }

  type ExtractVideoFramesArgs = {
  videoPath: string
  fps: number
  durationSeconds: number
  outputPrefix: string
}

  type ExtractVideoFramesResult = {
  ok: boolean
  message?: string
  videoPath: string
  outputDir: string
  outputPattern: string
  fps: number
  durationSeconds: number
  outputCount: number
  ffmpegLog: string
}

  type BatchCutoutResult = {
    ok: boolean
    message?: string
    inputDir: string
    rawDir: string
    outputDir: string
    inputCount: number
    rawCount: number
    outputCount: number
    preset: CutoutPreset
    alphaLow: number
    shrink: number
    rembgLog: string
    postprocessLog: string
  }

    type ImageDataUrlResult = {
    ok: boolean
    filePath: string
    dataUrl: string
    message?: string
  }

    interface Window {
      cutoutAPI: {
        selectFrameFolder: () => Promise<string | null>
        selectVideoFile: () => Promise<string | null>
        scanFrameFolder: (folderPath: string) => Promise<FrameFolderScanResult>
        extractVideoFrames: (args: ExtractVideoFramesArgs) => Promise<ExtractVideoFramesResult>
        runBatchCutout: (args: RunBatchCutoutArgs) => Promise<BatchCutoutResult>
        readImageAsDataUrl: (filePath: string) => Promise<ImageDataUrlResult>
        openFolder: (folderPath: string) => Promise<void>
  }
}
}