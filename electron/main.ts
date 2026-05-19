import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

const CORE_DIR = 'E:\\cuts'
const FFMPEG_EXE = 'D:\\Program Files\\FFmpeg\\bin\\ffmpeg.exe'
const REMBG_EXE = 'D:\\Program Files\\rembg\\.venv\\Scripts\\rembg.exe'
const PYTHON_EXE = 'D:\\Program Files\\rembg\\.venv\\Scripts\\python.exe'
const POSTPROCESS_SCRIPT = 'E:\\cuts\\postprocess\\batch_clean_cutout_soft.py'
const MODEL_DIR = 'D:\\Program Files\\rembg\\models'
const PROCESS_CONFIG_FILE_NAME = 'process-config.json'
const RAW_MANIFEST_FILE_NAME = '.raw-manifest.json'

type PngInfo = {
  width: number
  height: number
  hasAlpha: boolean
}

type RunCommandResult = {
  code: number | null
  stdout: string
  stderr: string
}

type CommandEnv = Record<string, string | undefined>

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 720,
    title: 'Sequence Cutout Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function safeName(input: string): string {
  return input
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function isSupportedVideoFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return ['.mp4', '.mov', '.webm', '.mkv'].includes(ext)
}

function isPngFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.png'
}

async function resolveDroppedPath(inputPath: string) {
  const resolvedPath = path.resolve(inputPath)
  const stat = await fs.stat(resolvedPath)

  if (stat.isDirectory()) {
    return {
      ok: true,
      inputPath: resolvedPath,
      kind: 'frameFolder',
      frameFolder: resolvedPath
    }
  }

  if (stat.isFile() && isSupportedVideoFile(resolvedPath)) {
    return {
      ok: true,
      inputPath: resolvedPath,
      kind: 'video',
      videoPath: resolvedPath
    }
  }

  if (stat.isFile() && isPngFile(resolvedPath)) {
    return {
      ok: true,
      inputPath: resolvedPath,
      kind: 'pngFile',
      frameFolder: path.dirname(resolvedPath),
      fileName: path.basename(resolvedPath)
    }
  }

  return {
    ok: false,
    inputPath: resolvedPath,
    message: '暂不支持该拖入文件。请拖入视频文件、PNG 序列帧文件夹，或序列帧中的某一张 PNG。'
  }
}

async function countPngFiles(folderPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    return entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png')).length
  } catch {
    return 0
  }
}

async function listPngFileNames(folderPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true })

    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  } catch {
    return []
  }
}

async function writeRawManifest(args: {
  inputDir: string
  rawDir: string
  inputFiles: string[]
  rawFiles: string[]
}) {
  const manifestPath = path.join(args.rawDir, RAW_MANIFEST_FILE_NAME)

  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    inputDir: args.inputDir,
    rawDir: args.rawDir,
    model: 'isnet-general-use',
    inputCount: args.inputFiles.length,
    rawCount: args.rawFiles.length,
    files: args.inputFiles
  }

  await fs.writeFile(manifestPath, JSON.stringify(payload, null, 2), 'utf8')

  return manifestPath
}

async function validateRawManifest(args: {
  inputDir: string
  rawDir: string
}) {
  const manifestPath = path.join(args.rawDir, RAW_MANIFEST_FILE_NAME)

  try {
    const raw = await fs.readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(raw)

    const inputFiles = await listPngFileNames(args.inputDir)
    const rawFiles = await listPngFileNames(args.rawDir)

    if (manifest.inputDir !== args.inputDir) {
      return {
        ok: false,
        message: '无法跳过 rembg：Raw 缓存来源不是当前输入目录。请先完整批量处理一次。'
      }
    }

    if (inputFiles.length === 0) {
      return {
        ok: false,
        message: '无法跳过 rembg：输入目录没有 PNG 文件。'
      }
    }

    if (rawFiles.length !== inputFiles.length) {
      return {
        ok: false,
        message: `无法跳过 rembg：Raw 数量不一致。原图 ${inputFiles.length} 张，Raw ${rawFiles.length} 张。请先完整批量处理一次。`
      }
    }

    const missingFiles = inputFiles.filter((fileName) => !rawFiles.includes(fileName))

    if (missingFiles.length > 0) {
      return {
        ok: false,
        message: `无法跳过 rembg：Raw 缺少 ${missingFiles.length} 张对应文件。请先完整批量处理一次。`
      }
    }

    return {
      ok: true,
      message: 'Raw 缓存有效。'
    }
  } catch {
    return {
      ok: false,
      message: '无法跳过 rembg：没有找到有效 Raw 缓存记录。请先完整批量处理一次。'
    }
  }
}

function readPngInfo(buffer: Buffer): PngInfo {
  const pngSignature = buffer.subarray(0, 8).toString('hex')
  const expectedSignature = '89504e470d0a1a0a'

  if (pngSignature !== expectedSignature) {
    throw new Error('不是有效 PNG 文件')
  }

  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  const colorType = buffer.readUInt8(25)

  const hasAlpha = colorType === 4 || colorType === 6

  return {
    width,
    height,
    hasAlpha
  }
}

async function scanFrameFolder(folderPath: string) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true })

  const pngFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  if (pngFiles.length === 0) {
    return {
      ok: false,
      message: '该文件夹下没有 PNG 序列帧。',
      folderPath,
      pngCount: 0,
      files: []
    }
  }

  const firstFile = path.join(folderPath, pngFiles[0])
  const firstBuffer = await fs.readFile(firstFile)
  const firstInfo = readPngInfo(firstBuffer)

  let sameSize = true
  let hasAlphaCount = 0
  let checkedCount = 0

  for (const fileName of pngFiles) {
    const filePath = path.join(folderPath, fileName)

    try {
      const buffer = await fs.readFile(filePath)
      const info = readPngInfo(buffer)

      if (info.width !== firstInfo.width || info.height !== firstInfo.height) {
        sameSize = false
      }

      if (info.hasAlpha) {
        hasAlphaCount += 1
      }

      checkedCount += 1
    } catch {
      sameSize = false
    }
  }

  const lastFile = path.join(folderPath, pngFiles[pngFiles.length - 1])

  return {
    ok: true,
    folderPath,
    type: 'frames',
    pngCount: pngFiles.length,
    checkedCount,
    width: firstInfo.width,
    height: firstInfo.height,
    sameSize,
    hasAlphaCount,
    hasAlpha: hasAlphaCount > 0,
    firstFile,
    lastFile,
    firstFileName: pngFiles[0],
    lastFileName: pngFiles[pngFiles.length - 1],
    files: pngFiles
  }
}

async function readImageAsDataUrl(filePath: string) {
  const resolvedPath = path.resolve(filePath)
  const buffer = await fs.readFile(resolvedPath)

  const ext = path.extname(resolvedPath).toLowerCase()
  const mimeType = ext === '.png' ? 'image/png' : 'application/octet-stream'

  return {
    ok: true,
    filePath: resolvedPath,
    dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`
  }
}

async function saveProcessConfig(args: {
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
    customPreviewBackgroundPath: string
    lastFrameName: string
    activePreviewTab: 'original' | 'raw' | 'soft'
  }
}) {
  const folderPath = path.resolve(args.folderPath)
  const configPath = path.join(folderPath, PROCESS_CONFIG_FILE_NAME)

  await fs.mkdir(folderPath, { recursive: true })

  const payload = {
    ...args.config,
    version: 1 as const,
    updatedAt: new Date().toISOString(),
    selectedFolder: folderPath
  }

  await fs.writeFile(configPath, JSON.stringify(payload, null, 2), 'utf8')

  return {
    ok: true,
    message: '配置已保存。',
    configPath,
    config: payload
  }
}

async function loadProcessConfig(folderPath: string) {
  const resolvedFolderPath = path.resolve(folderPath)
  const configPath = path.join(resolvedFolderPath, PROCESS_CONFIG_FILE_NAME)

  try {
    const raw = await fs.readFile(configPath, 'utf8')
    const config = JSON.parse(raw)

    return {
      ok: true,
      message: '配置已读取。',
      configPath,
      config
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error && 'code' in error && error.code === 'ENOENT'
          ? '没有找到 process-config.json。'
          : error instanceof Error
            ? error.message
            : String(error),
      configPath
    }
  }
}

function runCommand(command: string, args: string[], options?: { env?: CommandEnv }): Promise<RunCommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      env: {
        ...process.env,
        ...(options?.env ?? {})
      }
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr
      })
    })

    child.on('error', (error) => {
      resolve({
        code: 1,
        stdout,
        stderr: `${stderr}\n${error.message}`
      })
    })
  })
}

async function extractVideoFrames(args: {
  videoPath: string
  fps: number
  durationSeconds: number
  outputPrefix: string
}) {
  const videoPath = path.resolve(args.videoPath)
  const videoDir = path.dirname(videoPath)
  const videoBaseName = safeName(path.basename(videoPath, path.extname(videoPath))) || 'video'

  const fps = Number.isFinite(args.fps) && args.fps > 0 ? args.fps : 12
  const durationSeconds =
    Number.isFinite(args.durationSeconds) && args.durationSeconds > 0
      ? args.durationSeconds
      : 0

  const outputPrefix = safeName(args.outputPrefix || videoBaseName || 'frame') || 'frame'
  const durationLabel = durationSeconds > 0 ? `${durationSeconds}s` : 'full'
  const outputDir = path.join(videoDir, `${videoBaseName}_${fps}fps_${durationLabel}`)
  const outputPattern = path.join(outputDir, `${outputPrefix}_%04d.png`)

  await fs.mkdir(outputDir, { recursive: true })

  const ffmpegArgs = ['-y', '-i', videoPath]

  if (durationSeconds > 0) {
    ffmpegArgs.push('-t', String(durationSeconds))
  }

  ffmpegArgs.push('-vf', `fps=${fps}`, outputPattern)

  const ffmpegResult = await runCommand(FFMPEG_EXE, ffmpegArgs)

  const outputCount = await countPngFiles(outputDir)

  if (ffmpegResult.code !== 0) {
    return {
      ok: false,
      message: 'FFmpeg 切帧失败。',
      videoPath,
      outputDir,
      outputPattern,
      fps,
      durationSeconds,
      outputCount,
      ffmpegLog: `${ffmpegResult.stdout}\n${ffmpegResult.stderr}`
    }
  }

  return {
    ok: outputCount > 0,
    message: outputCount > 0 ? '视频切帧完成。' : 'FFmpeg 执行完成，但没有输出 PNG。',
    videoPath,
    outputDir,
    outputPattern,
    fps,
    durationSeconds,
    outputCount,
    ffmpegLog: `${ffmpegResult.stdout}\n${ffmpegResult.stderr}`
  }
}

async function runSingleCutout(args: {
  inputDir: string
  frameName: string
  preset: 'C' | 'F' | 'I' | 'Custom'
  alphaLow: number
  shrink: number
}) {
  const inputDir = path.resolve(args.inputDir)
  const parentDir = path.dirname(inputDir)
  const inputName = path.basename(inputDir)

  const rawDir = path.join(parentDir, `${inputName}_general_raw`)
  const outputDir = path.join(parentDir, `${inputName}_soft_${args.preset}`)

  const originalFile = path.join(inputDir, args.frameName)
  const rawFile = path.join(rawDir, args.frameName)
  const outputFile = path.join(outputDir, args.frameName)

  await fs.mkdir(rawDir, { recursive: true })
  await fs.mkdir(outputDir, { recursive: true })

  try {
    await fs.access(originalFile)
  } catch {
    return {
      ok: false,
      message: `找不到原始帧：${originalFile}`,
      inputDir,
      frameName: args.frameName,
      originalFile,
      rawFile,
      outputFile,
      rawDir,
      outputDir,
      preset: args.preset,
      alphaLow: args.alphaLow,
      shrink: args.shrink,
      rembgLog: '',
      postprocessLog: ''
    }
  }

  const rembgResult = await runCommand(
    REMBG_EXE,
    ['i', '-m', 'isnet-general-use', originalFile, rawFile],
    {
      env: {
        U2NET_HOME: MODEL_DIR
      }
    }
  )

  if (rembgResult.code !== 0) {
    return {
      ok: false,
      message: 'rembg 单帧抠图失败。',
      inputDir,
      frameName: args.frameName,
      originalFile,
      rawFile,
      outputFile,
      rawDir,
      outputDir,
      preset: args.preset,
      alphaLow: args.alphaLow,
      shrink: args.shrink,
      rembgLog: `${rembgResult.stdout}\n${rembgResult.stderr}`,
      postprocessLog: ''
    }
  }

  const postprocessResult = await runCommand(PYTHON_EXE, [
    POSTPROCESS_SCRIPT,
    '--original',
    originalFile,
    '--raw',
    rawFile,
    '--output',
    outputFile,
    '--alpha-low',
    String(args.alphaLow),
    '--shrink',
    String(args.shrink)
  ])

  if (postprocessResult.code !== 0) {
    return {
      ok: false,
      message: 'postprocess 单帧后处理失败。',
      inputDir,
      frameName: args.frameName,
      originalFile,
      rawFile,
      outputFile,
      rawDir,
      outputDir,
      preset: args.preset,
      alphaLow: args.alphaLow,
      shrink: args.shrink,
      rembgLog: `${rembgResult.stdout}\n${rembgResult.stderr}`,
      postprocessLog: `${postprocessResult.stdout}\n${postprocessResult.stderr}`
    }
  }

  return {
    ok: true,
    message: '单帧测试完成。',
    inputDir,
    frameName: args.frameName,
    originalFile,
    rawFile,
    outputFile,
    rawDir,
    outputDir,
    preset: args.preset,
    alphaLow: args.alphaLow,
    shrink: args.shrink,
    rembgLog: `${rembgResult.stdout}\n${rembgResult.stderr}`,
    postprocessLog: `${postprocessResult.stdout}\n${postprocessResult.stderr}`
  }
}

async function runBatchCutout(args: {
  inputDir: string
  preset: 'C' | 'F' | 'I' | 'Custom'
  alphaLow: number
  shrink: number
  skipRembg?: boolean
}) {
  const inputDir = path.resolve(args.inputDir)
  const parentDir = path.dirname(inputDir)
  const inputName = path.basename(inputDir)

  const rawDir = path.join(parentDir, `${inputName}_general_raw`)
  const outputDir = path.join(parentDir, `${inputName}_soft_${args.preset}`)
  const logPath = path.join(CORE_DIR, 'logs', `${inputName}_soft_${args.preset}.json`)

  await fs.mkdir(rawDir, { recursive: true })
  await fs.mkdir(outputDir, { recursive: true })
  await fs.mkdir(path.dirname(logPath), { recursive: true })

  const inputCount = await countPngFiles(inputDir)

  if (inputCount <= 0) {
    return {
      ok: false,
      message: '输入目录中没有 PNG 文件。',
      inputDir,
      rawDir,
      outputDir,
      inputCount,
      rawCount: 0,
      outputCount: 0,
      preset: args.preset,
      alphaLow: args.alphaLow,
      shrink: args.shrink,
      rembgLog: '',
      postprocessLog: ''
    }
  }

  const skipRembg = args.skipRembg === true

  let rembgResult: RunCommandResult = {
    code: 0,
    stdout: skipRembg ? '已跳过 rembg，复用现有 general_raw。' : '',
    stderr: ''
  }

  if (skipRembg) {
    const validation = await validateRawManifest({
      inputDir,
      rawDir
    })

    if (!validation.ok) {
      return {
        ok: false,
        message: validation.message,
        inputDir,
        rawDir,
        outputDir,
        inputCount,
        rawCount: await countPngFiles(rawDir),
        outputCount: 0,
        preset: args.preset,
        alphaLow: args.alphaLow,
        shrink: args.shrink,
        rembgLog: '',
        postprocessLog: ''
      }
    }
  } else {
    rembgResult = await runCommand(
      REMBG_EXE,
      ['p', '-m', 'isnet-general-use', inputDir, rawDir],
      {
        env: {
          U2NET_HOME: MODEL_DIR
        }
      }
    )

    if (rembgResult.code !== 0) {
      return {
        ok: false,
        message: 'rembg 批量抠图失败。',
        inputDir,
        rawDir,
        outputDir,
        inputCount,
        rawCount: await countPngFiles(rawDir),
        outputCount: 0,
        preset: args.preset,
        alphaLow: args.alphaLow,
        shrink: args.shrink,
        rembgLog: `${rembgResult.stdout}\n${rembgResult.stderr}`,
        postprocessLog: ''
      }
    }

    const inputFiles = await listPngFileNames(inputDir)
    const rawFiles = await listPngFileNames(rawDir)

    await writeRawManifest({
      inputDir,
      rawDir,
      inputFiles,
      rawFiles
    })
  }

  const postprocessResult = await runCommand(PYTHON_EXE, [
    POSTPROCESS_SCRIPT,
    '--original',
    inputDir,
    '--raw',
    rawDir,
    '--output',
    outputDir,
    '--alpha-low',
    String(args.alphaLow),
    '--shrink',
    String(args.shrink),
    '--log',
    logPath
  ])

  const rawCount = await countPngFiles(rawDir)
  const outputCount = await countPngFiles(outputDir)

  if (postprocessResult.code !== 0) {
    return {
      ok: false,
      message: 'postprocess 后处理失败。',
      inputDir,
      rawDir,
      outputDir,
      inputCount,
      rawCount,
      outputCount,
      preset: args.preset,
      alphaLow: args.alphaLow,
      shrink: args.shrink,
      rembgLog: `${rembgResult.stdout}\n${rembgResult.stderr}`,
      postprocessLog: `${postprocessResult.stdout}\n${postprocessResult.stderr}`
    }
  }

  return {
    ok: inputCount === outputCount,
    message:
      inputCount === outputCount
        ? skipRembg
          ? '只重跑边缘完成，输入输出数量一致。'
          : '处理完成，输入输出数量一致。'
        : '处理完成，但输入输出数量不一致。',
    inputDir,
    rawDir,
    outputDir,
    inputCount,
    rawCount,
    outputCount,
    preset: args.preset,
    alphaLow: args.alphaLow,
    shrink: args.shrink,
    rembgLog: `${rembgResult.stdout}\n${rembgResult.stderr}`,
    postprocessLog: `${postprocessResult.stdout}\n${postprocessResult.stderr}`
  }
}

ipcMain.handle('input:resolve-dropped-path', async (_event, inputPath: string) => {
  try {
    return await resolveDroppedPath(inputPath)
  } catch (error) {
    return {
      ok: false,
      inputPath,
      message: error instanceof Error ? error.message : String(error)
    }
  }
})



ipcMain.handle('dialog:select-video-file', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择视频文件',
    properties: ['openFile'],
    filters: [
      {
        name: 'Video',
        extensions: ['mp4', 'mov', 'webm', 'mkv']
      }
    ]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('dialog:select-background-image-file', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择预览背景图片',
    properties: ['openFile'],
    filters: [
      {
        name: 'Image',
        extensions: ['png', 'jpg', 'jpeg', 'webp']
      }
    ]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('dialog:select-frame-folder', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择 PNG 序列帧文件夹',
    properties: ['openDirectory']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
})

ipcMain.handle('frames:scan-folder', async (_event, folderPath: string) => {
  try {
    return await scanFrameFolder(folderPath)
  } catch (error) {
    return {
      ok: false,
      folderPath,
      message: error instanceof Error ? error.message : String(error),
      pngCount: 0,
      files: []
    }
  }
})

ipcMain.handle('video:extract-frames', async (_event, args) => {
  try {
    return await extractVideoFrames(args)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      videoPath: args?.videoPath ?? '',
      outputDir: '',
      outputPattern: '',
      fps: args?.fps ?? 12,
      durationSeconds: args?.durationSeconds ?? 4,
      outputCount: 0,
      ffmpegLog: ''
    }
  }
})

ipcMain.handle('process:run-single-cutout', async (_event, args) => {
  try {
    return await runSingleCutout(args)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      inputDir: args?.inputDir ?? '',
      frameName: args?.frameName ?? '',
      originalFile: '',
      rawFile: '',
      outputFile: '',
      rawDir: '',
      outputDir: '',
      preset: args?.preset ?? 'I',
      alphaLow: args?.alphaLow ?? 48,
      shrink: args?.shrink ?? 0.78,
      rembgLog: '',
      postprocessLog: ''
    }
  }
})

ipcMain.handle('process:run-batch-cutout', async (_event, args) => {
  try {
    return await runBatchCutout(args)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      inputDir: args?.inputDir ?? '',
      rawDir: '',
      outputDir: '',
      inputCount: 0,
      rawCount: 0,
      outputCount: 0,
      preset: args?.preset ?? 'I',
      alphaLow: args?.alphaLow ?? 48,
      shrink: args?.shrink ?? 0.78,
      rembgLog: '',
      postprocessLog: ''
    }
  }
})
ipcMain.handle('config:save-process-config', async (_event, args) => {
  try {
    return await saveProcessConfig(args)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      configPath: ''
    }
  }
})

ipcMain.handle('config:load-process-config', async (_event, folderPath: string) => {
  try {
    return await loadProcessConfig(folderPath)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      configPath: ''
    }
  }
})

ipcMain.handle('preview:read-image-data-url', async (_event, filePath: string) => {
  try {
    return await readImageAsDataUrl(filePath)
  } catch (error) {
    return {
      ok: false,
      filePath,
      dataUrl: '',
      message: error instanceof Error ? error.message : String(error)
    }
  }
})

ipcMain.handle('shell:open-folder', async (_event, folderPath: string) => {
  await shell.openPath(folderPath)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)