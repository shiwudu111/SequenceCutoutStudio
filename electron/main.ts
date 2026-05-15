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

async function countPngFiles(folderPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    return entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png')).length
  } catch {
    return 0
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

async function runBatchCutout(args: {
  inputDir: string
  preset: 'H' | 'I' | 'Custom'
  alphaLow: number
  shrink: number
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

  const rembgResult = await runCommand(
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
    message: inputCount === outputCount ? '处理完成，输入输出数量一致。' : '处理完成，但输入输出数量不一致。',
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