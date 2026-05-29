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
  activePreviewTab: 'original' | 'raw' | 'soft'
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
    minWidth: 1100,
    minHeight: 720,
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
  inputDir: string
  preset: 'C' | 'F' | 'I' | 'Custom'
  alphaLow: number
  shrink: number
  skipRembg?: boolean
}) {
  const runtimePaths = getRuntimePaths()
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

ipcMain.handle('project:create', async (_event, args: { config: ProcessConfig }) => {
  const result = await dialog.showOpenDialog({
    title: '选择工程保存目录',
    properties: ['openDirectory', 'createDirectory']
  })

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
    return await saveProject(result.filePaths[0], args.config)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      projectDir: result.filePaths[0],
      projectPath: getProjectPath(result.filePaths[0])
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

app.disableHardwareAcceleration()

app.whenReady().then(() => {
  void notifyLauncherStatus('正在准备本地处理工具...')
  createWindow()
})
