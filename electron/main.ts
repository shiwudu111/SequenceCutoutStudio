import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

const DEV_CORE_DIR = process.env.SCS_DEV_CORE_DIR ?? 'E:\\cuts'
const DEV_FFMPEG_EXE =
  process.env.SCS_DEV_FFMPEG_EXE ?? 'D:\\Program Files\\FFmpeg\\bin\\ffmpeg.exe'
const DEV_PYTHON_EXE =
  process.env.SCS_DEV_PYTHON_EXE ?? path.join(DEV_CORE_DIR, 'tools', 'python', 'python.exe')
const DEV_POSTPROCESS_SCRIPT =
  process.env.SCS_DEV_POSTPROCESS_SCRIPT ??
  path.join(DEV_CORE_DIR, 'tools', 'postprocess', 'batch_clean_cutout_soft.py')
const DEV_REMBG_RUNNER_SCRIPT =
  process.env.SCS_DEV_REMBG_RUNNER_SCRIPT ?? path.join(DEV_CORE_DIR, 'tools', 'rembg_runner.py')

const DEV_MODEL_DIR = process.env.SCS_DEV_MODEL_DIR ?? path.join(DEV_CORE_DIR, 'tools', 'models')

const PROCESS_CONFIG_FILE_NAME = 'process-config.json'
const PROJECT_FILE_NAME = 'project.json'
const RECENT_PROJECTS_FILE_NAME = 'recent-projects.json'
const RAW_MANIFEST_FILE_NAME = '.raw-manifest.json'

process.on('uncaughtException', (error) => {
  void appendExportLog(`uncaughtException ${error.stack ?? error.message}`)
})

process.on('unhandledRejection', (reason) => {
  void appendExportLog(
    `unhandledRejection ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`
  )
})

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
  activePreviewTab: 'original' | 'raw' | 'soft' | 'compare'
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

type RecentProject = {
  name: string
  projectDir: string
  projectPath: string
  updatedAt: string
}

type RuntimePaths = {
  rootDir: string
  toolsDir: string
  ffmpegExe: string
  pythonExe: string
  rembgRunnerScript: string
  postprocessScript: string
  modelDir: string
  presetsDir: string
  presetFile: string
  samplesDir: string
  logsDir: string
  projectsDir: string
}

function getPortableRootDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'portable-root')
  }

  return process.env.SCS_PORTABLE_ROOT ?? DEV_CORE_DIR
}

function getRuntimePaths(): RuntimePaths {
  const rootDir = getPortableRootDir()

  if (!app.isPackaged && !process.env.SCS_PORTABLE_ROOT) {
    return {
      rootDir: DEV_CORE_DIR,
      toolsDir: path.join(DEV_CORE_DIR, 'tools'),
      ffmpegExe: DEV_FFMPEG_EXE,
      pythonExe: DEV_PYTHON_EXE,
      rembgRunnerScript: DEV_REMBG_RUNNER_SCRIPT,
      postprocessScript: DEV_POSTPROCESS_SCRIPT,
      modelDir: DEV_MODEL_DIR,
      presetsDir: path.join(DEV_CORE_DIR, 'presets'),
      presetFile: path.join(DEV_CORE_DIR, 'presets', 'default.json'),
      samplesDir: path.join(DEV_CORE_DIR, 'samples'),
      logsDir: path.join(DEV_CORE_DIR, 'logs'),
      projectsDir: path.join(DEV_CORE_DIR, 'projects')
    }
  }

  const toolsDir = path.join(rootDir, 'tools')

  return {
    rootDir,
    toolsDir,
    ffmpegExe: path.join(toolsDir, 'ffmpeg', 'ffmpeg.exe'),
    pythonExe: path.join(toolsDir, 'python', 'python.exe'),
    rembgRunnerScript: path.join(toolsDir, 'rembg_runner.py'),
    postprocessScript: path.join(toolsDir, 'postprocess', 'batch_clean_cutout_soft.py'),
    modelDir: path.join(toolsDir, 'models'),
    presetsDir: path.join(rootDir, 'presets'),
    presetFile: path.join(rootDir, 'presets', 'default.json'),
    samplesDir: path.join(rootDir, 'samples'),
    logsDir: path.join(rootDir, 'logs'),
    projectsDir: path.join(rootDir, 'projects')
  }
}

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

type BatchProgressStage = 'prepare' | 'rembg' | 'postprocess' | 'done' | 'error'

type BatchProgressEvent = {
  taskId: string
  stage: BatchProgressStage
  message: string
  inputCount?: number
  rawCount?: number
  outputCount?: number
  outputDir?: string
  debugMessage?: string
}

type CommandEnv = Record<string, string | undefined>

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

function getAppInfo(): AppInfo {
  return {
    name: app.getName(),
    version: app.getVersion(),
    isPackaged: app.isPackaged
  }
}

async function notifyLauncherStatus(message: string): Promise<void> {
  const statusFile = process.env.SCS_LAUNCHER_STATUS_FILE

  if (!statusFile) {
    return
  }

  try {
    await fs.mkdir(path.dirname(statusFile), { recursive: true })
    await fs.writeFile(statusFile, message, 'utf8')
  } catch {
    // launcher status is best-effort only
  }
}

async function notifyLauncherReady(): Promise<void> {
  const readyFile = process.env.SCS_LAUNCHER_READY_FILE

  if (!readyFile) {
    return
  }

  try {
    await fs.mkdir(path.dirname(readyFile), { recursive: true })
    await fs.writeFile(readyFile, new Date().toISOString(), 'utf8')
  } catch {
    // launcher ready signal is best-effort only
  }
}

function createWindow(): void {
  void notifyLauncherStatus('正在加载工作台界面...')

  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 640,
    show: false,
    title: 'Sequence Cutout Studio',
    backgroundColor: '#f7f9fc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => {
    void notifyLauncherStatus('正在进入工作台...')
    void notifyLauncherReady()

    if (win && !win.isDestroyed()) {
      win.show()
      win.focus()
    }
  })

  win.webContents.once('did-fail-load', () => {
    void notifyLauncherStatus('工作台加载失败，正在打开窗口...')
    void notifyLauncherReady()

    if (win && !win.isDestroyed()) {
      win.show()
    }
  })

  win.on('closed', () => {
    win = null
  })

  if (VITE_DEV_SERVER_URL) {
    void notifyLauncherStatus('正在连接开发预览服务...')
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    void notifyLauncherStatus('正在加载本地工作台...')
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

function formatCommandDebug(title: string, result: RunCommandResult): string {
  const details = [`${title} exit code: ${result.code ?? 'unknown'}`]
  const stdout = result.stdout.trim()
  const stderr = result.stderr.trim()

  if (stdout) {
    details.push(`${title} stdout:\n${stdout}`)
  }

  if (stderr) {
    details.push(`${title} stderr:\n${stderr}`)
  }

  return details.join('\n')
}

function joinDebugDetails(...details: string[]): string {
  return details.map((detail) => detail.trim()).filter(Boolean).join('\n\n')
}

function sanitizeFolderName(name: string): string {
  const sanitized = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim()
  return sanitized || 'sequence'
}

function formatExportTimestamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('')
}

function formatSequenceFileName(prefix: string, index: number, padding: number): string {
  const safePrefix = sanitizeFolderName(prefix).replace(/\s+/g, '_')
  const safePadding = Math.max(1, Math.min(8, Math.floor(padding)))
  return `${safePrefix}_${String(index).padStart(safePadding, '0')}.png`
}

function hashJson(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)
}

async function appendExportLog(line: string): Promise<void> {
  try {
    const logPath = path.join(getRuntimePaths().logsDir, 'export.log')
    await fs.mkdir(path.dirname(logPath), { recursive: true })
    await fs.appendFile(logPath, `[${new Date().toISOString()}] ${line}\n`, 'utf8')
  } catch {
    // Logging must never break export.
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
        message: '当前 Raw 缓存和输入帧不匹配，不能只重跑边缘。请先完整批量处理一次。',
        debugMessage: `Raw 缓存来源不是当前输入目录。\n输入目录：${args.inputDir}\n缓存记录：${manifest.inputDir}`
      }
    }

    if (inputFiles.length === 0) {
      return {
        ok: false,
        message: '没有找到可处理的 PNG 序列帧。请先选择包含 PNG 帧的文件夹。',
        debugMessage: `输入目录没有 PNG 文件：${args.inputDir}`
      }
    }

    if (rawFiles.length !== inputFiles.length) {
      return {
        ok: false,
        message: '当前 Raw 缓存和输入帧不匹配，不能只重跑边缘。请先完整批量处理一次。',
        debugMessage: `Raw 数量不一致。原图 ${inputFiles.length} 张，Raw ${rawFiles.length} 张。`
      }
    }

    const missingFiles = inputFiles.filter((fileName) => !rawFiles.includes(fileName))

    if (missingFiles.length > 0) {
      return {
        ok: false,
        message: '当前 Raw 缓存和输入帧不匹配，不能只重跑边缘。请先完整批量处理一次。',
        debugMessage: `Raw 缺少 ${missingFiles.length} 张对应文件：${missingFiles.slice(0, 20).join(', ')}`
      }
    }

    return {
      ok: true,
      message: 'Raw 缓存有效。'
    }
  } catch {
    return {
      ok: false,
      message: '当前 Raw 缓存和输入帧不匹配，不能只重跑边缘。请先完整批量处理一次。',
      debugMessage: `没有找到有效 Raw 缓存记录：${manifestPath}`
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

async function inspectCacheStatus(args: {
  inputDir: string
  preset: 'C' | 'F' | 'I' | 'Custom'
  alphaLow?: number
  shrink?: number
}) {
  const inputDir = path.resolve(args.inputDir)
  const parentDir = path.dirname(inputDir)
  const inputName = path.basename(inputDir)
  const rawDir = path.join(parentDir, `${inputName}_general_raw`)
  const softDir = path.join(parentDir, `${inputName}_soft_${args.preset}`)
  const inputCount = await countPngFiles(inputDir)
  const inputFiles = await listPngFileNames(inputDir)
  const sourceEntries = await Promise.all(
    inputFiles.map(async (fileName) => {
      try {
        const stat = await fs.stat(path.join(inputDir, fileName))
        return {
          fileName,
          size: stat.size,
          mtimeMs: Math.round(stat.mtimeMs)
        }
      } catch {
        return {
          fileName,
          size: 0,
          mtimeMs: 0
        }
      }
    })
  )
  const rawCount = await countPngFiles(rawDir)
  const softCount = await countPngFiles(softDir)
  const sourceHash = hashJson({
    inputDir,
    inputCount,
    files: sourceEntries
  })
  const paramsHash = hashJson({
    preset: args.preset,
    alphaLow: args.alphaLow ?? null,
    shrink: args.shrink ?? null,
    model: 'isnet-general-use'
  })
  const rawValidation = await validateRawManifest({
    inputDir,
    rawDir
  })
  const rawStatus = rawValidation.ok ? 'ready' : rawCount > 0 ? 'mismatch' : 'missing'
  const softStatus =
    inputCount > 0 && softCount === inputCount
      ? 'ready'
      : softCount > 0
        ? 'incomplete'
        : 'missing'

  return {
    ok: true,
    inputDir,
    preset: args.preset,
    rawDir,
    softDir,
    inputCount,
    rawCount,
    softCount,
    sourceHash,
    paramsHash,
    cacheKey: `${sourceHash}-${paramsHash}`,
    rawStatus,
    softStatus,
    rawMessage: rawValidation.ok
      ? `Raw 缓存可用，共 ${rawCount} 张。`
      : rawCount > 0
        ? 'Raw 缓存和当前输入不匹配。'
        : '没有发现 Raw 缓存。',
    softMessage:
      softStatus === 'ready'
        ? `Soft 输出完整，共 ${softCount} 张。`
        : softStatus === 'incomplete'
          ? `Soft 输出不完整，输入 ${inputCount} 张，Soft ${softCount} 张。`
          : '没有发现 Soft 输出。'
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

async function exportTransparentPngSequence(args: {
  sourceDir: string
  targetRootDir: string
  inputDir?: string
  naming?: {
    prefix?: string
    startIndex?: number
    padding?: number
  }
}) {
  const sourceDir = path.resolve(args.sourceDir)
  const targetRootDir = args.targetRootDir
    ? path.resolve(args.targetRootDir)
    : path.join(path.dirname(sourceDir), 'exports')
  await appendExportLog(`start source="${sourceDir}" targetRoot="${targetRootDir}"`)

  const pngFiles = await listPngFileNames(sourceDir)
  await appendExportLog(`source png count=${pngFiles.length}`)

  if (pngFiles.length === 0) {
    await appendExportLog('stop no png files')
    return {
      ok: false,
      message: '当前 Soft 目录没有可导出的透明 PNG。请先完成批量处理。',
      sourceDir,
      targetRootDir,
      exportDir: '',
      manifestPath: '',
      outputCount: 0
    }
  }

  const sourceName = args.inputDir ? path.basename(path.resolve(args.inputDir)) : path.basename(sourceDir)
  const exportDir = path.join(
    targetRootDir,
    `${sanitizeFolderName(sourceName)}_transparent_png_${formatExportTimestamp(new Date())}`
  )
  const exportedAt = new Date().toISOString()
  const manifestPath = path.join(exportDir, 'manifest.json')
  const namingPrefix = args.naming?.prefix?.trim() || sourceName || 'frame'
  const namingStartIndex = Number.isFinite(args.naming?.startIndex)
    ? Math.max(0, Math.floor(args.naming?.startIndex ?? 1))
    : 1
  const namingPadding = Number.isFinite(args.naming?.padding)
    ? Math.max(1, Math.min(8, Math.floor(args.naming?.padding ?? 4)))
    : 4
  const exportedFiles = pngFiles.map((sourceFileName, index) => ({
    index,
    sourceFileName,
    fileName: formatSequenceFileName(namingPrefix, namingStartIndex + index, namingPadding)
  }))
  await appendExportLog(
    `prepared exportDir="${exportDir}" prefix="${namingPrefix}" start=${namingStartIndex} padding=${namingPadding}`
  )

  await fs.mkdir(exportDir, { recursive: true })
  await appendExportLog('created export directory')

  for (const file of exportedFiles) {
    await fs.copyFile(path.join(sourceDir, file.sourceFileName), path.join(exportDir, file.fileName))
  }
  await appendExportLog(`copied files=${exportedFiles.length}`)

  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        version: 1,
        type: 'transparent-png-sequence',
        exportedAt,
        sourceDir,
        inputDir: args.inputDir ? path.resolve(args.inputDir) : '',
        exportDir,
        naming: {
          prefix: sanitizeFolderName(namingPrefix).replace(/\s+/g, '_'),
          startIndex: namingStartIndex,
          padding: namingPadding,
          pattern: `${sanitizeFolderName(namingPrefix).replace(/\s+/g, '_')}_${'0'.repeat(namingPadding)}.png`
        },
        frameCount: pngFiles.length,
        firstFrame: exportedFiles[0]?.fileName ?? '',
        lastFrame: exportedFiles[exportedFiles.length - 1]?.fileName ?? '',
        files: exportedFiles
      },
      null,
      2
    ),
    'utf8'
  )
  await appendExportLog(`wrote manifest="${manifestPath}"`)

  return {
    ok: true,
    message: `透明 PNG 序列已导出，共 ${pngFiles.length} 张。`,
    sourceDir,
    targetRootDir,
    exportDir,
    manifestPath,
    outputCount: pngFiles.length
  }
}

async function saveProcessConfig(args: {
  folderPath: string
  config: ProcessConfig
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
async function checkFileExists(key: string, label: string, filePath: string): Promise<SelfCheckItem> {
  try {
    await fs.access(filePath)

    return {
      key,
      label,
      path: filePath,
      status: 'ok',
      message: '已找到'
    }
  } catch {
    return {
      key,
      label,
      path: filePath,
      status: 'missing',
      message: '未找到'
    }
  }
}

async function checkWritableDir(key: string, label: string, dirPath: string): Promise<SelfCheckItem> {
  try {
    await fs.mkdir(dirPath, { recursive: true })

    const testFile = path.join(
      dirPath,
      `.scs-write-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`
    )
    await fs.writeFile(testFile, 'ok', 'utf8')
    await fs.unlink(testFile)

    return {
      key,
      label,
      path: dirPath,
      status: 'ok',
      message: '可写'
    }
  } catch (error) {
    return {
      key,
      label,
      path: dirPath,
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

async function ensureProjectDirs(projectDir: string): Promise<void> {
  const dirs = ['source', 'cache', 'output', 'temp', 'thumbnails', 'masks']
  await fs.mkdir(projectDir, { recursive: true })

  await Promise.all(
    dirs.map((dirName) => fs.mkdir(path.join(projectDir, dirName), { recursive: true }))
  )
}

function getProjectPath(projectDir: string): string {
  return path.join(projectDir, PROJECT_FILE_NAME)
}

function buildProjectFile(projectDir: string, config: ProcessConfig, existing?: ProjectFile): ProjectFile {
  const now = new Date().toISOString()

  return {
    version: 1,
    name: existing?.name || path.basename(projectDir),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    source: {
      inputPath: config.inputPath,
      selectedFolder: config.selectedFolder,
      selectedVideo: config.selectedVideo,
      assetType: config.assetType
    },
    config: {
      ...config,
      updatedAt: now
    }
  }
}

async function readRecentProjects(runtimePaths = getRuntimePaths()): Promise<RecentProject[]> {
  const recentPath = path.join(runtimePaths.projectsDir, RECENT_PROJECTS_FILE_NAME)

  try {
    const raw = await fs.readFile(recentPath, 'utf8')
    const parsed = JSON.parse(raw)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeRecentProjects(projectDir: string, project: ProjectFile): Promise<void> {
  const runtimePaths = getRuntimePaths()
  const projectPath = getProjectPath(projectDir)
  const recentPath = path.join(runtimePaths.projectsDir, RECENT_PROJECTS_FILE_NAME)
  const recent = await readRecentProjects(runtimePaths)
  const nextItem: RecentProject = {
    name: project.name,
    projectDir,
    projectPath,
    updatedAt: project.updatedAt
  }

  const next = [
    nextItem,
    ...recent.filter((item) => path.resolve(item.projectDir) !== path.resolve(projectDir))
  ].slice(0, 8)

  await fs.mkdir(runtimePaths.projectsDir, { recursive: true })
  await fs.writeFile(recentPath, JSON.stringify(next, null, 2), 'utf8')
}

async function saveProject(projectDir: string, config: ProcessConfig) {
  const resolvedProjectDir = path.resolve(projectDir)
  const projectPath = getProjectPath(resolvedProjectDir)
  let existing: ProjectFile | undefined

  try {
    existing = JSON.parse(await fs.readFile(projectPath, 'utf8'))
  } catch {
    existing = undefined
  }

  await ensureProjectDirs(resolvedProjectDir)

  const project = buildProjectFile(resolvedProjectDir, config, existing)
  await fs.writeFile(projectPath, JSON.stringify(project, null, 2), 'utf8')
  await writeRecentProjects(resolvedProjectDir, project)

  return {
    ok: true,
    message: '工程已保存。',
    projectDir: resolvedProjectDir,
    projectPath,
    project
  }
}

async function openProject(projectDir: string) {
  const resolvedProjectDir = path.resolve(projectDir)
  const projectPath = getProjectPath(resolvedProjectDir)
  const raw = await fs.readFile(projectPath, 'utf8')
  const project = JSON.parse(raw) as ProjectFile

  await ensureProjectDirs(resolvedProjectDir)
  await writeRecentProjects(resolvedProjectDir, project)

  return {
    ok: true,
    message: '工程已打开。',
    projectDir: resolvedProjectDir,
    projectPath,
    project
  }
}

async function checkCommandRuns(
  key: string,
  label: string,
  command: string,
  args: string[],
  runtimePaths: RuntimePaths
): Promise<SelfCheckItem> {
  const result = await runCommand(command, args, {
    env: createPythonToolEnv(runtimePaths)
  })

  const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n')

  if (result.code === 0) {
    return {
      key,
      label,
      path: command,
      status: 'ok',
      message: output || 'ok'
    }
  }

  return {
    key,
    label,
    path: command,
    status: 'error',
    message: [`exit code: ${result.code ?? 'unknown'}`, output].filter(Boolean).join('\n')
  }
}

async function runSelfCheck(): Promise<SelfCheckResult> {
  const runtimePaths = getRuntimePaths()
  const modelFile = path.join(runtimePaths.modelDir, 'isnet-general-use.onnx')

  const items: SelfCheckItem[] = [
    await checkFileExists('ffmpeg', '视频处理工具', runtimePaths.ffmpegExe),
    await checkFileExists('python', '本地运行环境', runtimePaths.pythonExe),
    await checkFileExists('rembg-runner', '自动去背景工具', runtimePaths.rembgRunnerScript),
    await checkFileExists('model', '自动去背景模型', modelFile),
    await checkFileExists('postprocess', '修边工具', runtimePaths.postprocessScript),
    await checkFileExists('preset', '默认处理参数', runtimePaths.presetFile),
    await checkWritableDir('logs', 'logs 目录', runtimePaths.logsDir),
    await checkWritableDir('projects', 'projects 目录', runtimePaths.projectsDir)
  ]

  items.push(
    await checkCommandRuns('python-version', '运行环境启动', runtimePaths.pythonExe, ['--version'], runtimePaths),
    await checkCommandRuns(
      'python-rembg-import',
      '自动去背景加载',
      runtimePaths.pythonExe,
      ['-c', "import rembg; print('rembg ok')"],
      runtimePaths
    ),
    await checkCommandRuns(
      'python-onnxruntime-import',
      '处理引擎加载',
      runtimePaths.pythonExe,
      ['-c', "import onnxruntime; print('onnxruntime ok')"],
      runtimePaths
    ),
    await checkCommandRuns(
      'python-postprocess-deps-import',
      '修边依赖加载',
      runtimePaths.pythonExe,
      ['-c', "import PIL, numpy; print('postprocess deps ok')"],
      runtimePaths
    )
  )

  return {
    ok: items.every((item) => item.status === 'ok'),
    checkedAt: new Date().toISOString(),
    rootDir: runtimePaths.rootDir,
    items
  }
}

function createPythonToolEnv(runtimePaths: RuntimePaths): CommandEnv {
  return {
    U2NET_HOME: runtimePaths.modelDir,
    PYTHONUTF8: '1',
    PYTHONNOUSERSITE: '1',
     PYTHONPATH: path.join(runtimePaths.toolsDir, 'Lib', 'site-packages')
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

  const runtimePaths = getRuntimePaths()
  const ffmpegResult = await runCommand(runtimePaths.ffmpegExe, ffmpegArgs)

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
  const runtimePaths = getRuntimePaths()
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
    runtimePaths.pythonExe,
    [
      runtimePaths.rembgRunnerScript,
      'i',
      '--model',
      'isnet-general-use',
      originalFile,
      rawFile
    ],
    {
      env: createPythonToolEnv(runtimePaths)
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

  const postprocessResult = await runCommand(
    runtimePaths.pythonExe,
    [
      runtimePaths.postprocessScript,
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
    ],
    {
      env: createPythonToolEnv(runtimePaths)
    }
  )

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
  taskId?: string
  inputDir: string
  preset: 'C' | 'F' | 'I' | 'Custom'
  alphaLow: number
  shrink: number
  skipRembg?: boolean
  onProgress?: (event: BatchProgressEvent) => void
}) {
  const runtimePaths = getRuntimePaths()
  const taskId = args.taskId ?? ''
  const reportProgress = (event: Parameters<NonNullable<typeof args.onProgress>>[0]): void => {
    if (taskId && args.onProgress) {
      args.onProgress({
        ...event,
        taskId
      })
    }
  }
  const inputDir = path.resolve(args.inputDir)
  const parentDir = path.dirname(inputDir)
  const inputName = path.basename(inputDir)

  const rawDir = path.join(parentDir, `${inputName}_general_raw`)
  const outputDir = path.join(parentDir, `${inputName}_soft_${args.preset}`)
  const logPath = path.join(runtimePaths.logsDir, `${inputName}_soft_${args.preset}.json`)

  await fs.mkdir(rawDir, { recursive: true })
  await fs.mkdir(outputDir, { recursive: true })
  await fs.mkdir(path.dirname(logPath), { recursive: true })

  const inputCount = await countPngFiles(inputDir)
  reportProgress({
    taskId,
    stage: 'prepare',
    message: `已扫描 ${inputCount} 张 PNG，准备开始处理。`,
    inputCount,
    rawCount: 0,
    outputCount: 0,
    outputDir
  })

  if (inputCount <= 0) {
    const message = '没有找到可处理的 PNG 序列帧。请先选择包含 PNG 帧的文件夹。'
    const debugMessage = `输入目录没有 PNG 文件：${inputDir}`
    reportProgress({
      taskId,
      stage: 'error',
      message,
      inputCount,
      rawCount: 0,
      outputCount: 0,
      outputDir,
      debugMessage
    })
    return {
      ok: false,
      message,
      debugMessage,
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
    reportProgress({
      taskId,
      stage: 'prepare',
      message: '正在校验 Raw 缓存。',
      inputCount,
      rawCount: await countPngFiles(rawDir),
      outputCount: 0,
      outputDir
    })
    const validation = await validateRawManifest({
      inputDir,
      rawDir
    })

    if (!validation.ok) {
      const rawCount = await countPngFiles(rawDir)
      reportProgress({
        taskId,
        stage: 'error',
        message: validation.message,
        inputCount,
        rawCount,
        outputCount: 0,
        outputDir,
        debugMessage: validation.debugMessage
      })
      return {
        ok: false,
        message: validation.message,
        debugMessage: validation.debugMessage,
        inputDir,
        rawDir,
        outputDir,
        inputCount,
        rawCount,
        outputCount: 0,
        preset: args.preset,
        alphaLow: args.alphaLow,
        shrink: args.shrink,
        rembgLog: '',
        postprocessLog: ''
      }
    }
  } else {
    reportProgress({
      taskId,
      stage: 'rembg',
      message: '正在自动去背景。',
      inputCount,
      rawCount: 0,
      outputCount: 0,
      outputDir
    })
    rembgResult = await runCommand(
      runtimePaths.pythonExe,
      [
        runtimePaths.rembgRunnerScript,
        'p',
        '--model',
        'isnet-general-use',
        inputDir,
        rawDir
      ],
      {
        env: createPythonToolEnv(runtimePaths)
      }
    )

    if (rembgResult.code !== 0) {
      const rawCount = await countPngFiles(rawDir)
      const debugMessage = formatCommandDebug('自动去背景', rembgResult)
      reportProgress({
        taskId,
        stage: 'error',
        message: '自动去背景没有完成。请检查输入帧是否能正常打开，或查看详情。',
        inputCount,
        rawCount,
        outputCount: 0,
        outputDir,
        debugMessage
      })
      return {
        ok: false,
        message: '自动去背景没有完成。请检查输入帧是否能正常打开，或查看详情。',
        debugMessage,
        inputDir,
        rawDir,
        outputDir,
        inputCount,
        rawCount,
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
    reportProgress({
      taskId,
      stage: 'postprocess',
      message: `自动去背景完成，Raw ${rawFiles.length} 张，开始修边。`,
      inputCount,
      rawCount: rawFiles.length,
      outputCount: 0,
      outputDir
    })

    await writeRawManifest({
      inputDir,
      rawDir,
      inputFiles,
      rawFiles
    })
  }

  if (skipRembg) {
    reportProgress({
      taskId,
      stage: 'postprocess',
      message: 'Raw 缓存校验通过，开始修边。',
      inputCount,
      rawCount: await countPngFiles(rawDir),
      outputCount: 0,
      outputDir
    })
  }

  const postprocessResult = await runCommand(
    runtimePaths.pythonExe,
    [
      runtimePaths.postprocessScript,
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
    ],
    {
      env: createPythonToolEnv(runtimePaths)
    }
  )

  const rawCount = await countPngFiles(rawDir)
  const outputCount = await countPngFiles(outputDir)

  if (postprocessResult.code !== 0) {
    const debugMessage = joinDebugDetails(
      formatCommandDebug('自动去背景', rembgResult),
      formatCommandDebug('修边', postprocessResult)
    )
    reportProgress({
      taskId,
      stage: 'error',
      message: '修边处理没有完成。请查看详情后再重试。',
      inputCount,
      rawCount,
      outputCount,
      outputDir,
      debugMessage
    })
    return {
      ok: false,
      message: '修边处理没有完成。请查看详情后再重试。',
      debugMessage,
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

  const countMismatchDebugMessage =
    inputCount === outputCount
      ? ''
      : `输入输出数量不一致。输入 ${inputCount} 张，Raw ${rawCount} 张，输出 ${outputCount} 张。`

  reportProgress({
    taskId,
    stage: inputCount === outputCount ? 'done' : 'error',
    message:
      inputCount === outputCount
        ? skipRembg
          ? '只重跑边缘完成。'
          : '批量处理完成。'
        : '处理结束，但输出数量和输入数量不一致。请检查输出目录后重试。',
    inputCount,
    rawCount,
    outputCount,
    outputDir,
    debugMessage: countMismatchDebugMessage
  })

  return {
    ok: inputCount === outputCount,
    message:
      inputCount === outputCount
        ? skipRembg
          ? '只重跑边缘完成，输入输出数量一致。'
          : '处理完成，输入输出数量一致。'
        : '处理结束，但输出数量和输入数量不一致。请检查输出目录后重试。',
    debugMessage: countMismatchDebugMessage,
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

ipcMain.handle('app:get-info', async () => getAppInfo())

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

ipcMain.handle('dialog:select-export-folder', async () => {
  await appendExportLog('select export folder dialog open')

  const result = await dialog.showOpenDialog({
    title: '选择导出保存位置',
    properties: ['openDirectory']
  })

  await appendExportLog(
    `select export folder dialog result canceled=${result.canceled} count=${result.filePaths.length}`
  )

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  await appendExportLog(`select export folder path="${result.filePaths[0]}"`)
  return result.filePaths[0]
})

ipcMain.handle('project:create', async (_event, args: { config: ProcessConfig }) => {
  let result: Electron.OpenDialogReturnValue

  try {
    result = await dialog.showOpenDialog({
      title: '选择工程保存目录',
      properties: ['openDirectory', 'createDirectory']
    })
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      projectDir: '',
      projectPath: ''
    }
  }

  if (result.canceled || result.filePaths.length === 0) {
    return {
      ok: false,
      canceled: true,
      message: '已取消新建工程。',
      projectDir: '',
      projectPath: ''
    }
  }

  try {
    const projectDir = path.resolve(result.filePaths[0])
    await fs.mkdir(projectDir, { recursive: true })
    return await saveProject(projectDir, args.config)
  } catch (error) {
    const projectDir = result.filePaths[0] ? path.resolve(result.filePaths[0]) : ''
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      projectDir,
      projectPath: projectDir ? getProjectPath(projectDir) : ''
    }
  }
})

ipcMain.handle('project:save', async (_event, args: { projectDir: string; config: ProcessConfig }) => {
  try {
    return await saveProject(args.projectDir, args.config)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      projectDir: args.projectDir,
      projectPath: args.projectDir ? getProjectPath(args.projectDir) : ''
    }
  }
})

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog({
    title: '打开工程目录',
    properties: ['openDirectory']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return {
      ok: false,
      canceled: true,
      message: '已取消打开工程。',
      projectDir: '',
      projectPath: ''
    }
  }

  try {
    return await openProject(result.filePaths[0])
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      projectDir: result.filePaths[0],
      projectPath: getProjectPath(result.filePaths[0])
    }
  }
})

ipcMain.handle('project:open-recent', async (_event, projectDir: string) => {
  try {
    return await openProject(projectDir)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      projectDir,
      projectPath: projectDir ? getProjectPath(projectDir) : ''
    }
  }
})

ipcMain.handle('project:list-recent', async () => {
  return readRecentProjects()
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

ipcMain.handle('cache:inspect-status', async (_event, args) => {
  try {
    return await inspectCacheStatus(args)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      inputDir: args?.inputDir ?? '',
      preset: args?.preset ?? 'I',
      rawDir: '',
      softDir: '',
      inputCount: 0,
      rawCount: 0,
      softCount: 0,
      sourceHash: '',
      paramsHash: '',
      cacheKey: '',
      rawStatus: 'missing',
      softStatus: 'missing',
      rawMessage: '缓存状态读取失败。',
      softMessage: '缓存状态读取失败。'
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

ipcMain.handle('process:run-batch-cutout', async (event, args) => {
  try {
    return await runBatchCutout({
      ...args,
      onProgress: (payload) => {
        event.sender.send('process:batch-progress', payload)
      }
    })
  } catch (error) {
    const message = '批处理遇到未知错误。详情里保留了技术信息。'
    const debugMessage = error instanceof Error ? error.stack ?? error.message : String(error)

    if (args?.taskId) {
      event.sender.send('process:batch-progress', {
        taskId: args.taskId,
        stage: 'error',
        message,
        inputCount: 0,
        rawCount: 0,
        outputCount: 0,
        outputDir: '',
        debugMessage
      })
    }

    return {
      ok: false,
      message,
      debugMessage,
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

ipcMain.handle('export:transparent-png-sequence', async (_event, args) => {
  try {
    return await exportTransparentPngSequence(args)
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error)
    await appendExportLog(`error ${message}`)

    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      sourceDir: args?.sourceDir ?? '',
      targetRootDir: args?.targetRootDir ?? '',
      exportDir: '',
      manifestPath: '',
      outputCount: 0
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

ipcMain.handle('system:run-self-check', async () => {
  try {
    return await runSelfCheck()
  } catch (error) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      rootDir: getPortableRootDir(),
      items: [
        {
          key: 'self-check',
          label: '启动自检',
          path: '',
          status: 'error',
          message: error instanceof Error ? error.message : String(error)
        }
      ]
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
  try {
    const resolvedPath = path.resolve(folderPath)
    const message = await shell.openPath(resolvedPath)

    return {
      ok: message.length === 0,
      message,
      folderPath: resolvedPath
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      folderPath: folderPath ?? ''
    }
  }
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

app.disableHardwareAcceleration()

app.whenReady().then(() => {
  void notifyLauncherStatus('正在准备本地处理工具...')
  createWindow()
})
