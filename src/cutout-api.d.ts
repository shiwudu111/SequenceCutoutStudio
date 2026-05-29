export { }

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

    type CutoutPreset = 'C' | 'F' | 'I' | 'Custom'

    type RunBatchCutoutArgs = {
        inputDir: string
        preset: CutoutPreset
        alphaLow: number
        shrink: number
        skipRembg?: boolean
    }
    type RunSingleCutoutArgs = {
        inputDir: string
        frameName: string
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

    type ResolveDroppedPathResult = {
        ok: boolean
        message?: string
        inputPath: string
        kind?: 'video' | 'frameFolder' | 'pngFile'
        videoPath?: string
        frameFolder?: string
        fileName?: string
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


    type SingleCutoutResult = {
        ok: boolean
        message?: string
        inputDir: string
        frameName: string
        originalFile: string
        rawFile: string
        outputFile: string
        rawDir: string
        outputDir: string
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
    type SelectBackgroundImageResult = string | null
    type ProcessConfig = {
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
        preset: CutoutPreset
        alphaLow: number
        shrink: number
        videoFps: number
        videoDuration: number
        videoOutputPrefix: string
        playbackFps: number
        previewBackground: 'checker' | 'black' | 'white' | 'gray' | 'custom'
        customPreviewBackgroundPath: string
        lastFrameName: string
        activePreviewTab: 'original' | 'raw' | 'soft'
    }

    type SaveProcessConfigArgs = {
        folderPath: string
        config: ProcessConfig
    }

    type ProcessConfigResult = {
        ok: boolean
        message?: string
        configPath: string
        config?: ProcessConfig
    }

    type ProjectFile = {
        version: 1
        name: string
        createdAt: string
        updatedAt: string
        source: {
            inputPath: string
            selectedFolder: string
            selectedVideo: string
            assetType: string
        }
        config: ProcessConfig
    }

    type ProjectResult = {
        ok: boolean
        canceled?: boolean
        message?: string
        projectDir: string
        projectPath: string
        project?: ProjectFile
    }

    type RecentProject = {
        name: string
        projectDir: string
        projectPath: string
        updatedAt: string
    }

    type SelfCheckStatus = 'ok' | 'missing' | 'error'

    type SelfCheckItem = {
        key: string
        label: string
        path: string
        status: SelfCheckStatus
        message: string
    }

    type SelfCheckResult = {
        ok: boolean
        checkedAt: string
        rootDir: string
        items: SelfCheckItem[]
    }

    type AppInfo = {
        name: string
        version: string
        isPackaged: boolean
    }

    interface Window {
        cutoutAPI: {
            getAppInfo: () => Promise<AppInfo>
            selectFrameFolder: () => Promise<string | null>
            selectVideoFile: () => Promise<string | null>
            createProject: (args: { config: ProcessConfig }) => Promise<ProjectResult>
            saveProject: (args: { projectDir: string; config: ProcessConfig }) => Promise<ProjectResult>
            openProject: () => Promise<ProjectResult>
            openRecentProject: (projectDir: string) => Promise<ProjectResult>
            listRecentProjects: () => Promise<RecentProject[]>
            getDroppedPath: (file: File) => string
            resolveDroppedPath: (filePath: string) => Promise<ResolveDroppedPathResult>
            scanFrameFolder: (folderPath: string) => Promise<FrameFolderScanResult>
            extractVideoFrames: (args: ExtractVideoFramesArgs) => Promise<ExtractVideoFramesResult>
            runSingleCutout: (args: RunSingleCutoutArgs) => Promise<SingleCutoutResult>
            runBatchCutout: (args: RunBatchCutoutArgs) => Promise<BatchCutoutResult>
            readImageAsDataUrl: (filePath: string) => Promise<ImageDataUrlResult>
            runSelfCheck: () => Promise<SelfCheckResult>
            selectBackgroundImageFile: () => Promise<string | null>
            selectBackgroundImage: () => Promise<SelectBackgroundImageResult>
            saveProcessConfig: (args: SaveProcessConfigArgs) => Promise<ProcessConfigResult>
            loadProcessConfig: (folderPath: string) => Promise<ProcessConfigResult>
            openFolder: (folderPath: string) => Promise<void>
        }
    }
}
