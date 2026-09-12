import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react'
import './App.css'

type Preset = 'C' | 'F' | 'I' | 'Custom'
type PreviewBackground = 'checker' | 'black' | 'white' | 'gray' | 'custom'
type PreviewTab = 'original' | 'raw' | 'soft' | 'compare'
type ImageKind = 'original' | 'raw' | 'soft'
type EdgePresetParams = {
  label: string
  alphaLow: number
  shrink: number
}

type CompareStatus = 'idle' | 'running' | 'done' | 'error'

type CompareItem = {
  preset: Preset
  label: string
  alphaLow: number
  shrink: number
  status: CompareStatus
  message?: string
  rawFile?: string
  outputFile?: string
  dataUrl?: string
}

type BatchTaskStatus = 'running' | 'done' | 'error'

type BatchTask = {
  id: string
  status: BatchTaskStatus
  mode: 'batch' | 'edge'
  inputDir: string
  preset: Preset
  alphaLow: number
  shrink: number
  totalCount: number
  rawCount: number
  outputCount: number
  failedCount: number
  currentStage: string
  message: string
  debugMessage?: string
  outputDir: string
  startedAt: number
  endedAt?: number
}

type BatchProgressStage = 'prepare' | 'rembg' | 'postprocess' | 'done' | 'error'
type WorkflowStepId = 'input' | 'frames' | 'cutout' | 'edge' | 'export'

type WorkflowStep = {
  id: WorkflowStepId
  label: string
  target: 'input' | 'videoTools' | 'process' | 'edgeControls' | 'preview'
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 'input', label: '1. 导入素材', target: 'input' },
  { id: 'frames', label: '2. 视频切帧', target: 'videoTools' },
  { id: 'cutout', label: '3. AI 抠图', target: 'process' },
  { id: 'edge', label: '4. 边缘处理', target: 'edgeControls' },
  { id: 'export', label: '5. 预览导出', target: 'preview' }
]

const EDGE_PRESET_PARAMS: Record<Exclude<Preset, 'Custom'>, EdgePresetParams> = {
  C: {
    label: '柔和边缘',
    alphaLow: 24,
    shrink: 0.35
  },
  F: {
    label: '标准边缘',
    alphaLow: 36,
    shrink: 0.58
  },
  I: {
    label: '干净收边',
    alphaLow: 48,
    shrink: 0.78
  }
}

const COMPARE_PRESETS: Preset[] = ['C', 'F', 'I', 'Custom']

const PREVIEW_BACKGROUND_OPTIONS: Array<{ value: PreviewBackground; label: string }> = [
  { value: 'checker', label: '棋盘' },
  { value: 'black', label: '黑' },
  { value: 'white', label: '白' },
  { value: 'gray', label: '灰' },
  { value: 'custom', label: '图' }
]

const getPresetName = (targetPreset: Preset): string =>
  targetPreset === 'Custom' ? '自定义' : EDGE_PRESET_PARAMS[targetPreset].label

const getPresetDisplayLabel = (targetPreset: Preset): string =>
  targetPreset === 'Custom' ? '自定义' : `${EDGE_PRESET_PARAMS[targetPreset].label} (${targetPreset})`

const formatPresetParams = (targetPreset: Preset, nextAlphaLow: number, nextShrink: number): string =>
  `${getPresetDisplayLabel(targetPreset)} / 边缘阈值=${nextAlphaLow} / 收边力度=${nextShrink}`

function App(): JSX.Element {
  const [appVersion, setAppVersion] = useState('')
  const [inputPath, setInputPath] = useState('尚未选择素材')
  const [selectedFolder, setSelectedFolder] = useState('')
  const [selectedVideo, setSelectedVideo] = useState('')
  const isAnimationInput = /\.(gif|webp)$/i.test(selectedVideo)
  const [isExtracting, setIsExtracting] = useState(false)
  const [outputFolder, setOutputFolder] = useState('')
  const [rawFolder, setRawFolder] = useState('')
  const [softFolder, setSoftFolder] = useState('')
  const [frameFiles, setFrameFiles] = useState<string[]>([])
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const [keyFrameIndexes, setKeyFrameIndexes] = useState<number[]>([])
  const [assetType, setAssetType] = useState('未识别')
  const [frameCount, setFrameCount] = useState('-')
  const [frameSize, setFrameSize] = useState('-')
  const [firstFrame, setFirstFrame] = useState('-')
  const [lastFrame, setLastFrame] = useState('-')
  const [sameSize, setSameSize] = useState('-')
  const [alphaInfo, setAlphaInfo] = useState('-')
  const [preset, setPreset] = useState<Preset>('I')
  const [alphaLow, setAlphaLow] = useState(48)
  const [shrink, setShrink] = useState(0.78)
  const [videoFps, setVideoFps] = useState(12)
  const [videoDuration, setVideoDuration] = useState(4)
  const [videoOutputPrefix, setVideoOutputPrefix] = useState('sample')
  const [exportFilePrefix, setExportFilePrefix] = useState('frame')
  const [exportStartIndex, setExportStartIndex] = useState(1)
  const [exportPadding, setExportPadding] = useState(4)
  const [previewBackground, setPreviewBackground] = useState<PreviewBackground>('black')
  const [customPreviewBackgroundPath, setCustomPreviewBackgroundPath] = useState('')
  const [customPreviewBackgroundDataUrl, setCustomPreviewBackgroundDataUrl] = useState('')
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>('original')
  const [previewFrameName, setPreviewFrameName] = useState('')
  const [previewImages, setPreviewImages] = useState<{
    original: string
    raw: string
    soft: string
  }>({
    original: '',
    raw: '',
    soft: ''
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [batchTask, setBatchTask] = useState<BatchTask | null>(null)
  const [qualityReport, setQualityReport] = useState<QualityReportResult | null>(null)
  const [isTestingSingle, setIsTestingSingle] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [compareItems, setCompareItems] = useState<CompareItem[]>([])
  const [configPath, setConfigPath] = useState('')
  const [configMessage, setConfigMessage] = useState('尚未保存参数')
  const [selfCheckResult, setSelfCheckResult] = useState<SelfCheckResult | null>(null)
  const [isSelfChecking, setIsSelfChecking] = useState(false)
  const [activeComparePreset, setActiveComparePreset] = useState<Preset | null>(null)
  const [isDraggingInput, setIsDraggingInput] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackFps, setPlaybackFps] = useState(12)
  const [frameDurationsMs, setFrameDurationsMs] = useState<number[]>([])
  const [useAnimationTiming, setUseAnimationTiming] = useState(true)
  const [usePlaybackRange, setUsePlaybackRange] = useState(false)
  const [rangeStart, setRangeStart] = useState(1)
  const [rangeEnd, setRangeEnd] = useState(1)
  const [rangeStartDraft, setRangeStartDraft] = useState('1')
  const [rangeEndDraft, setRangeEndDraft] = useState('1')
  useEffect(() => {
    setRangeStartDraft(String(rangeStart))
    setRangeEndDraft(String(rangeEnd))
  }, [rangeStart, rangeEnd, frameFiles])

  const commitPlaybackRange = (field: 'start' | 'end'): void => {
    const draft = field === 'start' ? rangeStartDraft : rangeEndDraft
    const previous = field === 'start' ? rangeStart : rangeEnd
    const parsed = draft.trim() === '' ? previous : Number(draft)
    const value = Number.isFinite(parsed) ? Math.trunc(parsed) : previous
    if (field === 'start') {
      const next = Math.max(1, Math.min(rangeEnd, value))
      setRangeStart(next)
      setRangeStartDraft(String(next))
    } else {
      const next = Math.max(rangeStart, Math.min(Math.max(1, frameFiles.length), value))
      setRangeEnd(next)
      setRangeEndDraft(String(next))
    }
  }
  const playbackStart = usePlaybackRange ? Math.max(0, Math.min(frameFiles.length - 1, rangeStart - 1)) : 0
  const playbackEnd = usePlaybackRange ? Math.max(playbackStart, Math.min(frameFiles.length - 1, rangeEnd - 1)) : frameFiles.length - 1
  const [compareSplit, setCompareSplit] = useState(50)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [useMainPreviewBackground, setUseMainPreviewBackground] = useState(false)
  const [lightboxScale, setLightboxScale] = useState(1)
  const [lightboxOffset, setLightboxOffset] = useState({ x: 0, y: 0 })
  const [isDraggingLightbox, setIsDraggingLightbox] = useState(false)
  const [lightboxDragStart, setLightboxDragStart] = useState({ x: 0, y: 0 })
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<WorkflowStepId>('input')
  const previewCacheRef = useRef<Map<string, string>>(new Map())
  const lightboxImageRef = useRef<HTMLImageElement | null>(null)
  const lightboxRef = useRef<HTMLDivElement | null>(null)
  const frameIndexRef = useRef(0)
  const frameRequestRef = useRef(0)
  const logsRef = useRef<HTMLDivElement | null>(null)
  const inputPanelRef = useRef<HTMLElement | null>(null)
  const videoToolsRef = useRef<HTMLDivElement | null>(null)
  const processPanelRef = useRef<HTMLElement | null>(null)
  const edgeControlsRef = useRef<HTMLDivElement | null>(null)
  const previewPanelRef = useRef<HTMLElement | null>(null)
  const [logs, setLogs] = useState<string[]>([
    'Sequence Cutout Studio 已启动。',
    '当前阶段：序列预览优化。'
  ])

  const appendLog = (line: string): void => {
    setLogs((prev) => [...prev, line])
  }

  const refreshQualityReport = async (nextRawFolder = rawFolder, nextSoftFolder = softFolder): Promise<void> => {
    if (!selectedFolder || !nextSoftFolder) {
      setQualityReport(null)
      return
    }

    const report = await window.cutoutAPI.analyzeQualityReport({
      inputDir: selectedFolder,
      rawDir: nextRawFolder,
      softDir: nextSoftFolder
    })

    setQualityReport(report)
    appendLog(`质量验收：${report.message}`)
  }

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  const handleWorkflowStepClick = (step: WorkflowStep): void => {
    setActiveWorkflowStep(step.id)

    const targetMap: Record<WorkflowStep['target'], HTMLElement | null> = {
      input: inputPanelRef.current,
      videoTools: videoToolsRef.current,
      process: processPanelRef.current,
      edgeControls: edgeControlsRef.current,
      preview: previewPanelRef.current
    }

    targetMap[step.target]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    })
  }

  const focusPreviewPanel = (): void => {
    setActiveWorkflowStep('export')

    window.setTimeout(() => {
      previewPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      })
    }, 0)
  }

  const handleQualityIssueClick = (issue: QualityIssue): void => {
    if (!issue.fileName) {
      return
    }

    const targetIndex = frameFiles.findIndex((fileName) => fileName === issue.fileName)
    if (targetIndex < 0) {
      return
    }

    handleReviewFrameIndex(targetIndex)
  }

  const getBatchTaskTitle = (task: BatchTask): string => {
    if (task.mode === 'edge') {
      return '只重跑边缘'
    }

    return '批量处理'
  }

  const getBatchTaskProgressWidth = (task: BatchTask): string => {
    if (task.status === 'running' && task.outputCount <= 0) {
      return '30%'
    }

    if (task.totalCount <= 0) {
      return task.status === 'done' ? '100%' : '0%'
    }

    return `${Math.min(100, Math.round((task.outputCount / task.totalCount) * 100))}%`
  }

  const getBatchStageLabel = (stage: BatchProgressStage): string => {
    if (stage === 'prepare') {
      return '准备处理'
    }
    if (stage === 'rembg') {
      return '自动去背景'
    }
    if (stage === 'postprocess') {
      return '修边处理中'
    }
    if (stage === 'done') {
      return '已完成'
    }

    return '处理失败'
  }

  const inspectCacheStatus = async (
    folderPath: string,
    nextPreset = preset,
    shouldLog = false
  ): Promise<void> => {
    const result = await window.cutoutAPI.inspectCacheStatus({
      inputDir: folderPath,
      preset: nextPreset,
      alphaLow: nextPreset === 'Custom' ? alphaLow : EDGE_PRESET_PARAMS[nextPreset].alphaLow,
      shrink: nextPreset === 'Custom' ? shrink : EDGE_PRESET_PARAMS[nextPreset].shrink
    })

    if (!shouldLog) {
      return
    }

    if (!result.ok) {
      appendLog(`缓存状态读取失败：${result.message ?? '未知错误'}`)
      return
    }

    appendLog(`缓存状态：${result.rawMessage}`)
    appendLog(`输出状态：${result.softMessage}`)
    appendLog(`缓存占用：Raw ${result.rawSizeText} / Soft ${result.softSizeText} / 合计 ${result.totalSizeText}`)
    appendLog(`复用建议：${result.cacheHitMessage}`)
  }

  useEffect(() => {
    void window.cutoutAPI.getAppInfo().then((info) => {
      setAppVersion(info.version)
      appendLog(`当前版本：v${info.version}`)
    })
  }, [])

  useEffect(() => {
    return window.cutoutAPI.onBatchProgress((event) => {
      setBatchTask((current) => {
        if (!current || current.id !== event.taskId) {
          return current
        }

        const totalCount = event.inputCount ?? current.totalCount
        const rawCount = event.rawCount ?? current.rawCount
        const outputCount = event.outputCount ?? current.outputCount
        const failedCount =
          event.stage === 'error'
            ? Math.max(0, totalCount - outputCount)
            : current.failedCount

        return {
          ...current,
          status: event.stage === 'done' ? 'done' : event.stage === 'error' ? 'error' : 'running',
          totalCount,
          rawCount,
          outputCount,
          failedCount,
          currentStage: getBatchStageLabel(event.stage),
          message: event.message,
          debugMessage: event.debugMessage ?? current.debugMessage,
          outputDir: event.outputDir ?? current.outputDir,
          endedAt: event.stage === 'done' || event.stage === 'error' ? Date.now() : current.endedAt
        }
      })
    })
  }, [])

  const joinWindowsPath = (folderPath: string, fileName: string): string => {
    return `${folderPath.replace(/[\\/]+$/, '')}\\${fileName}`
  }

  const loadPreviewImage = async (
    kind: ImageKind,
    filePath: string,
    silent = false
  ): Promise<void> => {
    const cacheKey = `${kind}:${filePath}`
    const cachedDataUrl = previewCacheRef.current.get(cacheKey)

    if (cachedDataUrl) {
      setPreviewImages((prev) => ({
        ...prev,
        [kind]: cachedDataUrl
      }))
      return
    }

    const result = await window.cutoutAPI.readImageAsDataUrl(filePath)

    if (!result.ok) {
      if (!silent) {
        appendLog(`预览读取失败：${result.message ?? filePath}`)
      }
      return
    }

    previewCacheRef.current.set(cacheKey, result.dataUrl)

    setPreviewImages((prev) => ({
      ...prev,
      [kind]: result.dataUrl
    }))

    if (!silent) {
      appendLog(`预览已加载：${kind} → ${filePath}`)
    }
  }

  const getKeyFrameIndexes = (files: string[]): number[] => {
    if (files.length === 0) {
      return []
    }

    const firstIndex = 0
    const middleIndex = Math.floor((files.length - 1) / 2)
    const lastIndex = files.length - 1

    return Array.from(new Set([firstIndex, middleIndex, lastIndex]))
  }

  const loadFrameByIndex = async (
    targetIndex: number,
    filesOverride = frameFiles,
    folderOverride = selectedFolder,
    rawFolderOverride = rawFolder,
    softFolderOverride = softFolder
  ): Promise<void> => {
    if (filesOverride.length === 0 || !folderOverride) {
      appendLog('没有可预览的序列帧。')
      return
    }

    const safeIndex =
      ((targetIndex % filesOverride.length) + filesOverride.length) % filesOverride.length

    const frameName = filesOverride[safeIndex]

    const request = ++frameRequestRef.current
    const readFrame = async (folder: string): Promise<string> => {
      if (!folder) return ''
      const filePath = joinWindowsPath(folder, frameName)
      const cached = previewCacheRef.current.get(filePath)
      if (cached) return cached
      const result = await window.cutoutAPI.readImageAsDataUrl(filePath)
      if (!result.ok) return ''
      if (request === frameRequestRef.current) previewCacheRef.current.set(filePath, result.dataUrl)
      return result.dataUrl
    }
    const [original, raw, soft] = await Promise.all([
      readFrame(folderOverride), readFrame(rawFolderOverride), readFrame(softFolderOverride)
    ])
    if (request !== frameRequestRef.current) return
    frameIndexRef.current = safeIndex
    setCurrentFrameIndex(safeIndex)
    setPreviewFrameName(frameName)
    setActiveComparePreset(null)
    setCompareItems([])
    setPreviewImages({ original, raw, soft })
  }

  const resolvePresetParams = (targetPreset: Preset): EdgePresetParams => {
    if (targetPreset === 'Custom') {
      return {
        label: '自定义',
        alphaLow,
        shrink
      }
    }

    return EDGE_PRESET_PARAMS[targetPreset]
  }

  const createCompareItem = (targetPreset: Preset): CompareItem => {
    const params = resolvePresetParams(targetPreset)

    return {
      preset: targetPreset,
      label: params.label,
      alphaLow: params.alphaLow,
      shrink: params.shrink,
      status: 'idle'
    }
  }

  const updateCompareItem = (targetPreset: Preset, patch: Partial<CompareItem>): void => {
    setCompareItems((prev) =>
      prev.map((item) => (item.preset === targetPreset ? { ...item, ...patch } : item))
    )
  }

  const handlePreviousFrame = async (): Promise<void> => {
    await loadFrameByIndex(currentFrameIndex - 1)
  }

  const handleNextFrame = async (): Promise<void> => {
    await loadFrameByIndex(currentFrameIndex + 1)
  }

  const handleGoToFirstFrame = async (): Promise<void> => {
    await loadFrameByIndex(0)
  }

  const handleGoToMiddleFrame = async (): Promise<void> => {
    if (frameFiles.length === 0) {
      return
    }

    await loadFrameByIndex(Math.floor((frameFiles.length - 1) / 2))
  }

  const handleGoToLastFrame = async (): Promise<void> => {
    if (frameFiles.length === 0) {
      return
    }

    await loadFrameByIndex(frameFiles.length - 1)
  }

  const handleReviewFrameIndex = (targetIndex: number): void => {
    setIsPlaying(false)

    if (softFolder) {
      setActivePreviewTab('soft')
    } else if (rawFolder) {
      setActivePreviewTab('raw')
    } else {
      setActivePreviewTab('original')
    }

    setActiveComparePreset(null)
    void loadFrameByIndex(targetIndex)
    focusPreviewPanel()
  }

  const handleTogglePlayback = (): void => {
    if (frameFiles.length === 0) {
      appendLog('没有可播放的序列帧。')
      return
    }

    setIsPlaying((prev) => !prev)
  }

  const handlePlaybackFpsChange = (value: number): void => {
    const safeValue = Number.isFinite(value) ? value : 12
    const clampedValue = Math.max(1, Math.min(60, safeValue))
    setPlaybackFps(clampedValue)
  }

  useEffect(() => {
    if (!isPlaying || frameFiles.length === 0) {
      return
    }

    let cancelled = false
    let timer: number
    const advance = async (): Promise<void> => {
      const index = frameIndexRef.current
      const next = index < playbackStart || index >= playbackEnd ? playbackStart : index + 1
      await loadFrameByIndex(next)
      if (!cancelled) schedule()
    }
    const schedule = (): void => {
      const index = frameIndexRef.current
      const duration = useAnimationTiming && frameDurationsMs.length === frameFiles.length
        ? frameDurationsMs[index] || 100
        : 1000 / Math.max(1, Math.min(60, playbackFps))
      timer = window.setTimeout(() => { void advance() }, duration)
    }
    if (frameIndexRef.current < playbackStart || frameIndexRef.current > playbackEnd) {
      void loadFrameByIndex(playbackStart).then(() => { if (!cancelled) schedule() })
    } else schedule()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      frameRequestRef.current += 1
    }
  }, [
    isPlaying,
    frameFiles.length,
    playbackFps,
    playbackStart,
    playbackEnd,
    frameDurationsMs,
    useAnimationTiming,
    selectedFolder,
    rawFolder,
    softFolder
  ])
  const applyFrameFolderScanResult = async (
    folderPath: string,
    result: FrameFolderScanResult
  ): Promise<void> => {
    if (!result.ok) {
      setAssetType('扫描失败')
      setFrameCount('0')
      setFrameSize('-')
      setFirstFrame('-')
      setLastFrame('-')
      setSameSize('-')
      setAlphaInfo('-')
      appendLog(`扫描失败：${result.message ?? '未知错误'}`)
      return
    }

    const files = result.files ?? []
    const keyIndexes = getKeyFrameIndexes(files)

    setSelectedFolder(folderPath)
    setInputPath(folderPath)
    setConfigPath('')
    setConfigMessage('尚未保存参数')
    setAssetType('PNG 序列帧')
    setFrameCount(String(result.pngCount))
    setFrameSize(`${result.width} × ${result.height}`)
    setFirstFrame(result.firstFileName ?? '-')
    setLastFrame(result.lastFileName ?? '-')
    setSameSize(result.sameSize ? '是' : '否')
    setAlphaInfo(
      result.hasAlpha ? `有 alpha（${result.hasAlphaCount}/${result.pngCount}）` : '无 alpha'
    )

    setIsPlaying(false)
    frameRequestRef.current += 1
    frameIndexRef.current = 0
    setUsePlaybackRange(false)
    setRangeStart(1)
    setRangeEnd(Math.max(1, files.length))
    setFrameDurationsMs(result.frameDurationsMs ?? [])
    setUseAnimationTiming(true)
    previewCacheRef.current.clear()

    setFrameFiles(files)
    setCurrentFrameIndex(0)
    setKeyFrameIndexes(keyIndexes)
    setRawFolder('')
    setSoftFolder('')
    setActiveComparePreset(null)
    setCompareItems([])
    setPreviewFrameName(files[0] ?? result.firstFileName ?? '')
    setActivePreviewTab('original')
    setPreviewImages({
      original: '',
      raw: '',
      soft: ''
    })

    appendLog(`扫描完成：${result.pngCount} 张 PNG`)
    appendLog(`尺寸：${result.width} × ${result.height}`)
    appendLog(`尺寸一致：${result.sameSize ? '是' : '否'}`)
    appendLog(
      `Alpha：${result.hasAlpha ? `有 alpha（${result.hasAlphaCount}/${result.pngCount}）` : '无 alpha'}`
    )
    appendLog(`关键帧索引：${keyIndexes.map((index) => index + 1).join(' / ')}`)
    await inspectCacheStatus(folderPath, preset, true)

    if (files.length > 0) {
      await loadFrameByIndex(0, files, folderPath, '', '')
    }
  }

  const handleRunSelfCheck = async (): Promise<void> => {
    setIsSelfChecking(true)

    const result = await window.cutoutAPI.runSelfCheck()

    setSelfCheckResult(result)
    setIsSelfChecking(false)

    if (result.ok) {
      appendLog('启动自检通过。')
      return
    }

    const failedItems = result.items.filter((item: SelfCheckItem) => item.status !== 'ok')
    appendLog(`启动自检发现 ${failedItems.length} 个问题。`)

    failedItems.forEach((item: SelfCheckItem) => {
      appendLog(`自检失败：${item.label} → ${item.message} → ${item.path}`)
    })
  }

  useEffect(() => {
    void handleRunSelfCheck()
  }, [])

  const handleSelectFrameFolder = async (): Promise<void> => {
    appendLog('正在选择序列帧文件夹...')

    const folderPath = await window.cutoutAPI.selectFrameFolder()

    if (!folderPath) {
      appendLog('已取消选择。')
      return
    }

    setSelectedVideo('')
    setOutputFolder('')
    appendLog(`已选择：${folderPath}`)
    appendLog('开始扫描 PNG 序列帧...')

    const result = await window.cutoutAPI.scanFrameFolder(folderPath)
    await applyFrameFolderScanResult(folderPath, result)
  }

  const applySelectedVideo = (videoPath: string): void => {
    setSelectedVideo(videoPath)
    setInputPath(videoPath)
    setAssetType(/\.webp$/i.test(videoPath) ? 'WebP 图片 / 动图' : /\.gif$/i.test(videoPath) ? 'GIF 动图' : '视频文件')
    setFrameCount('-')
    setFrameSize('-')
    setFirstFrame('-')
    setLastFrame('-')
    setSameSize('-')
    setAlphaInfo('-')
    setSelectedFolder('')
    setOutputFolder('')

    setRawFolder('')
    setSoftFolder('')
    setFrameFiles([])
    frameRequestRef.current += 1
    frameIndexRef.current = 0
    setFrameDurationsMs([])
    setUsePlaybackRange(false)
    setCurrentFrameIndex(0)
    setKeyFrameIndexes([])
    setIsPlaying(false)
    previewCacheRef.current.clear()
    setActiveComparePreset(null)
    setCompareItems([])

    setPreviewFrameName('')
    setActivePreviewTab('original')
    setConfigPath('')
    setConfigMessage('尚未保存参数')
    setPreviewImages({
      original: '',
      raw: '',
      soft: ''
    })

    appendLog(`已选择视频：${videoPath}`)
  }

  const handleSelectVideoFile = async (): Promise<void> => {
    appendLog('正在选择视频文件...')

    const videoPath = await window.cutoutAPI.selectVideoFile()

    if (!videoPath) {
      appendLog('已取消选择视频。')
      return
    }

    applySelectedVideo(videoPath)
  }

  const handleInputDragEnter = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingInput(true)
  }

  const handleInputDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingInput(true)
  }

  const handleInputDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingInput(false)
  }

  const handleInputDrop = async (event: DragEvent<HTMLDivElement>): Promise<void> => {
    if (isExtracting) { event.preventDefault(); return }
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingInput(false)

    const droppedFile = event.dataTransfer.files?.[0]

    if (!droppedFile) {
      appendLog('没有识别到拖入文件。')
      return
    }

    const droppedPath = window.cutoutAPI.getDroppedPath(droppedFile)

    if (!droppedPath) {
      appendLog('拖入文件路径读取失败。')
      return
    }

    appendLog(`拖入素材：${droppedPath}`)

    const resolved = await window.cutoutAPI.resolveDroppedPath(droppedPath)

    if (!resolved.ok) {
      appendLog(`拖入失败：${resolved.message ?? '不支持的素材类型'}`)
      return
    }

    if (resolved.kind === 'video' && resolved.videoPath) {
      applySelectedVideo(resolved.videoPath)
      return
    }

    if ((resolved.kind === 'frameFolder' || resolved.kind === 'pngFile') && resolved.frameFolder) {
      setSelectedVideo('')
      setOutputFolder('')
      appendLog(`开始扫描拖入序列帧目录：${resolved.frameFolder}`)

      const scanResult = await window.cutoutAPI.scanFrameFolder(resolved.frameFolder)
      await applyFrameFolderScanResult(resolved.frameFolder, scanResult)
      return
    }

    appendLog('拖入失败：无法识别素材类型。')
  }

  const handleExtractFrames = async (): Promise<void> => {
    if (isExtracting) return
    if (!selectedVideo) {
      appendLog('请先选择视频文件。')
      return
    }

    appendLog('开始视频切帧。')
    appendLog(`视频：${selectedVideo}`)
    if (isAnimationInput) appendLog('按动图原始帧拆分，保留透明度与每帧时长。')
    else {
      appendLog(`FPS：${videoFps}`)
      appendLog(`时长：${videoDuration > 0 ? `${videoDuration} 秒` : '全长'}`)
    }
    appendLog(`输出前缀：${videoOutputPrefix}`)

    setIsExtracting(true)
    try {
      const result = await window.cutoutAPI.extractVideoFrames({
        videoPath: selectedVideo,
        fps: videoFps,
        durationSeconds: videoDuration,
        outputPrefix: videoOutputPrefix
      })

      appendLog(result.message ?? (result.ok ? '视频切帧完成。' : '视频切帧失败。'))
      appendLog(`输出目录：${result.outputDir}`)
      appendLog(`输出 PNG 数量：${result.outputCount}`)

      if (!result.ok) {
        if (result.ffmpegLog.trim()) {
          appendLog(result.ffmpegLog.trim())
        }
        return
      }

      setOutputFolder(result.outputDir)

      appendLog('开始扫描切帧输出目录...')
      const scanResult = await window.cutoutAPI.scanFrameFolder(result.outputDir)
      await applyFrameFolderScanResult(result.outputDir, scanResult)
    } catch (error) {
      appendLog(`切帧失败：${String(error)}`)
    } finally {
      setIsExtracting(false)
    }
  }

  const buildProcessConfig = (): ProcessConfig => {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      inputPath,
      selectedFolder,
      selectedVideo,
      outputFolder,
      rawFolder,
      softFolder,
      assetType,
      frameCount,
      frameSize,
      preset,
      alphaLow,
      shrink,
      videoFps,
      videoDuration,
      videoOutputPrefix,
      playbackFps,
      previewBackground,
      customPreviewBackgroundPath,
      lastFrameName: previewFrameName,
      activePreviewTab
    }
  }

  const applyProcessConfig = async (
    config: ProcessConfig,
    filesOverride = frameFiles,
    folderOverride = selectedFolder,
    rawFolderOverride = rawFolder,
    softFolderOverride = softFolder
  ): Promise<void> => {
    const nextPreset = config.preset ?? preset
    const nextAlphaLow = Number.isFinite(config.alphaLow) ? config.alphaLow : alphaLow
    const nextShrink = Number.isFinite(config.shrink) ? config.shrink : shrink
    const nextVideoFps = Number.isFinite(config.videoFps) ? config.videoFps : videoFps
    const nextVideoDuration = Number.isFinite(config.videoDuration)
      ? config.videoDuration
      : videoDuration
    const nextPlaybackFps = Number.isFinite(config.playbackFps) ? config.playbackFps : playbackFps
    const nextPreviewBackground = config.previewBackground ?? previewBackground
    const nextActivePreviewTab = config.activePreviewTab ?? activePreviewTab

    setPreset(nextPreset)
    setAlphaLow(nextAlphaLow)
    setShrink(nextShrink)
    setVideoFps(nextVideoFps)
    setVideoDuration(nextVideoDuration)
    setVideoOutputPrefix(config.videoOutputPrefix || videoOutputPrefix)
    setPlaybackFps(nextPlaybackFps)
    setPreviewBackground(nextPreviewBackground)
    setOutputFolder(config.outputFolder || '')
    setRawFolder(config.rawFolder || '')
    setSoftFolder(config.softFolder || '')

    if (config.customPreviewBackgroundPath) {
      setCustomPreviewBackgroundPath(config.customPreviewBackgroundPath)

      const bgResult = await window.cutoutAPI.readImageAsDataUrl(config.customPreviewBackgroundPath)

      if (bgResult.ok) {
        setCustomPreviewBackgroundDataUrl(bgResult.dataUrl)
      } else {
        appendLog(`背景图读取失败：${bgResult.message ?? config.customPreviewBackgroundPath}`)
      }
    } else {
      setCustomPreviewBackgroundPath('')
      setCustomPreviewBackgroundDataUrl('')
    }

    setActivePreviewTab(nextActivePreviewTab)

    if (config.lastFrameName && filesOverride.length > 0) {
      const frameIndex = filesOverride.findIndex((fileName) => fileName === config.lastFrameName)

      if (frameIndex >= 0) {
        await loadFrameByIndex(
          frameIndex,
          filesOverride,
          folderOverride,
          rawFolderOverride,
          softFolderOverride
        )
      }
    }

    appendLog(
      `已应用参数：${formatPresetParams(nextPreset, nextAlphaLow, nextShrink)} / 播放 FPS=${nextPlaybackFps} / 背景=${nextPreviewBackground}`
    )
  }

  const getRulerTickIndexes = (): number[] => {
    if (frameFiles.length === 0) {
      return []
    }

    const tickCount = Math.min(9, frameFiles.length)
    const lastIndex = frameFiles.length - 1

    return Array.from({ length: tickCount }, (_value, tickIndex) =>
      Math.round((lastIndex * tickIndex) / Math.max(1, tickCount - 1))
    ).filter((index, position, indexes) => indexes.indexOf(index) === position)
  }

  const handleOpenLightbox = (): void => {
    if (!displayPreviewImage) {
      return
    }

    setLightboxOpen(true)
    setUseMainPreviewBackground(false)
    setLightboxScale(1)
    setLightboxOffset({ x: 0, y: 0 })
  }

  const handleCloseLightbox = (): void => {
    setLightboxOpen(false)
    setIsDraggingLightbox(false)
  }

  useEffect(() => {
    const element = lightboxRef.current
    if (!lightboxOpen || !element) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      if ((event.target as HTMLElement).closest('.preview-lightbox-toolbar') || event.deltaY === 0) return
      const direction = event.deltaY < 0 ? 1 : -1
      setLightboxScale((prev) => Math.max(0.35, Math.min(8, prev + direction * 0.15)))
    }
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') handleCloseLightbox()
    }
    element.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      element.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKey)
    }
  }, [lightboxOpen])

  const handleLightboxPointerDown = (event: PointerEvent<HTMLImageElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDraggingLightbox(true)
    setLightboxDragStart({
      x: event.clientX - lightboxOffset.x,
      y: event.clientY - lightboxOffset.y
    })
  }

  const handleLightboxPointerMove = (event: PointerEvent<HTMLImageElement>): void => {
    if (!isDraggingLightbox) {
      return
    }

    setLightboxOffset({
      x: event.clientX - lightboxDragStart.x,
      y: event.clientY - lightboxDragStart.y
    })
  }

  const handleLightboxPointerUp = (event: PointerEvent<HTMLImageElement>): void => {
    event.currentTarget.releasePointerCapture(event.pointerId)
    setIsDraggingLightbox(false)
  }

  const handleResetLightbox = (): void => {
    setLightboxScale(1)
    setLightboxOffset({ x: 0, y: 0 })
  }

  const handleSaveProcessConfig = async (): Promise<void> => {
    if (!selectedFolder) {
      appendLog('请先选择序列帧文件夹，或先从视频切成序列帧。')
      return
    }

    const result = await window.cutoutAPI.saveProcessConfig({
      folderPath: selectedFolder,
      config: buildProcessConfig()
    })

    if (!result.ok) {
      appendLog(`参数保存失败：${result.message ?? '未知错误'}`)
      setConfigMessage(result.message ?? '参数保存失败')
      return
    }

    setConfigPath(result.configPath)
    setConfigMessage('参数已保存')
    appendLog(`参数已保存：${result.configPath}`)
  }

  const handleLoadProcessConfig = async (): Promise<void> => {
    if (!selectedFolder) {
      appendLog('请先选择序列帧文件夹，或先从视频切成序列帧。')
      return
    }

    const result = await window.cutoutAPI.loadProcessConfig(selectedFolder)

    if (!result.ok || !result.config) {
      appendLog(`参数读取失败：${result.message ?? '未知错误'}`)
      setConfigPath(result.configPath)
      setConfigMessage(result.message ?? '参数读取失败')
      return
    }

    setConfigPath(result.configPath)
    setConfigMessage('参数已读取')
    await applyProcessConfig(result.config)

    appendLog(`参数已读取：${result.configPath}`)
  }

  const handleSelectCustomPreviewBackground = async (): Promise<void> => {
    const imagePath = await window.cutoutAPI.selectBackgroundImageFile()

    if (!imagePath) {
      appendLog('已取消选择背景图。')
      return
    }

    const result = await window.cutoutAPI.readImageAsDataUrl(imagePath)

    if (!result.ok) {
      appendLog(`背景图读取失败：${result.message ?? imagePath}`)
      return
    }

    setCustomPreviewBackgroundPath(imagePath)
    setCustomPreviewBackgroundDataUrl(result.dataUrl)
    setPreviewBackground('custom')

    appendLog(`已选择预览背景图：${imagePath}`)
  }

  const handlePresetChange = (nextPreset: Preset): void => {
    setPreset(nextPreset)

    if (nextPreset === 'Custom') {
      if (selectedFolder) {
        void inspectCacheStatus(selectedFolder, nextPreset, true)
      }
      return
    }

    const params = EDGE_PRESET_PARAMS[nextPreset]
    setAlphaLow(params.alphaLow)
    setShrink(params.shrink)

    if (selectedFolder) {
      void inspectCacheStatus(selectedFolder, nextPreset, true)
    }
  }
  const handleRunSingleCutout = async (): Promise<void> => {
    if (!selectedFolder) {
      appendLog('请先选择序列帧文件夹，或先从视频切成序列帧。')
      return
    }

    if (!previewFrameName) {
      appendLog('没有可测试的预览帧。')
      return
    }

    setIsTestingSingle(true)
    setOutputFolder('')

    appendLog('开始测试单帧。')
    appendLog(`输入目录：${selectedFolder}`)
    appendLog(`测试帧：${previewFrameName}`)
    appendLog(`修边预设：${formatPresetParams(preset, alphaLow, shrink)}`)

    const result = await window.cutoutAPI.runSingleCutout({
      inputDir: selectedFolder,
      frameName: previewFrameName,
      preset,
      alphaLow,
      shrink
    })

    appendLog(result.message ?? (result.ok ? '单帧测试完成。' : '单帧测试失败。'))

    if (!result.ok) {
      appendLog('单帧测试失败日志：')

      if (result.rembgLog.trim()) {
        appendLog(result.rembgLog.trim())
      }

      if (result.postprocessLog.trim()) {
        appendLog(result.postprocessLog.trim())
      }

      setIsTestingSingle(false)
      return
    }

    setOutputFolder(result.outputDir)
    appendLog(`Raw 文件：${result.rawFile}`)
    appendLog(`Soft 文件：${result.outputFile}`)

    await loadPreviewImage('raw', result.rawFile)
    await loadPreviewImage('soft', result.outputFile)
    setActivePreviewTab('soft')

    appendLog('单帧测试完成，可查看 Raw / Soft 预览。')
    setIsTestingSingle(false)
  }
  const handleRunCompareCutout = async (): Promise<void> => {
    if (!selectedFolder) {
      appendLog('请先选择序列帧文件夹，或先从视频切成序列帧。')
      return
    }

    if (!previewFrameName) {
      appendLog('没有可对比的当前帧。')
      return
    }

    setIsPlaying(false)
    setIsComparing(true)
    previewCacheRef.current.clear()
    setActiveComparePreset(null)

    const initialItems = COMPARE_PRESETS.map(createCompareItem)
    setCompareItems(initialItems)

    appendLog('开始生成柔和边缘 / 标准边缘 / 干净收边 / 自定义参数对比。')
    appendLog(`对比帧：${previewFrameName}`)

    for (const item of initialItems) {
      updateCompareItem(item.preset, {
        status: 'running',
        message: '处理中...'
      })

      appendLog(`开始对比 ${formatPresetParams(item.preset, item.alphaLow, item.shrink)}`)

      const result = await window.cutoutAPI.runSingleCutout({
        inputDir: selectedFolder,
        frameName: previewFrameName,
        preset: item.preset,
        alphaLow: item.alphaLow,
        shrink: item.shrink
      })

      if (!result.ok) {
        updateCompareItem(item.preset, {
          status: 'error',
          message: result.message ?? '生成失败'
        })
        appendLog(`${item.label} 对比失败：${result.message ?? '未知错误'}`)
        continue
      }

      const imageResult = await window.cutoutAPI.readImageAsDataUrl(result.outputFile)

      if (!imageResult.ok) {
        updateCompareItem(item.preset, {
          status: 'error',
          message: imageResult.message ?? '读取预览失败'
        })
        appendLog(`${item.label} 预览读取失败：${imageResult.message ?? result.outputFile}`)
        continue
      }

      updateCompareItem(item.preset, {
        status: 'done',
        message: '完成',
        rawFile: result.rawFile,
        outputFile: result.outputFile,
        dataUrl: imageResult.dataUrl
      })

      if (item.preset === 'I') {
        setActiveComparePreset('I')
      }

      appendLog(`${item.label} 对比完成：${result.outputFile}`)
    }

    setIsComparing(false)
    appendLog('柔和边缘 / 标准边缘 / 干净收边 / 自定义参数对比完成。')
  }

  const handleApplyComparePreset = (item: CompareItem): void => {
    if (item.status !== 'done') {
      appendLog(`${item.label} 尚未生成完成，不能应用。`)
      return
    }

    setPreset(item.preset)
    setAlphaLow(item.alphaLow)
    setShrink(item.shrink)
    setActiveComparePreset(item.preset)

    appendLog(`已应用对比参数：${formatPresetParams(item.preset, item.alphaLow, item.shrink)}`)
  }

  const handleRunBatchCutout = async (options?: { skipRembg?: boolean }): Promise<void> => {
    const skipRembg = options?.skipRembg === true
    if (!selectedFolder) {
      appendLog('请先选择序列帧文件夹。')
      return
    }

    const taskId = `${Date.now()}`
    const nextTask: BatchTask = {
      id: taskId,
      status: 'running',
      mode: skipRembg ? 'edge' : 'batch',
      inputDir: selectedFolder,
      preset,
      alphaLow,
      shrink,
      totalCount: frameFiles.length,
      rawCount: 0,
      outputCount: 0,
      failedCount: 0,
      currentStage: skipRembg ? '校验 Raw 缓存并准备修边' : '自动去背景处理中',
      message: skipRembg ? '正在只重跑边缘...' : '正在批量处理...',
      outputDir: '',
      startedAt: Date.now()
    }

    setIsProcessing(true)
    setBatchTask(nextTask)
    setOutputFolder('')
    setIsPlaying(false)
    previewCacheRef.current.clear()

    appendLog(skipRembg ? '开始只重跑边缘。' : '开始批量处理。')
    appendLog(`输入目录：${selectedFolder}`)
    appendLog(`修边预设：${formatPresetParams(preset, alphaLow, shrink)}`)
    appendLog(skipRembg ? '跳过 rembg，校验并复用 general_raw。' : '开始 rembg 批量抠图...')

    try {
      const result = await window.cutoutAPI.runBatchCutout({
        taskId,
        inputDir: selectedFolder,
        preset,
        alphaLow,
        shrink,
        skipRembg
      })

      const failedCount = Math.max(0, result.inputCount - result.outputCount)
      setBatchTask((current) =>
        current?.id === taskId
          ? {
            ...current,
            status: result.ok ? 'done' : 'error',
            totalCount: result.inputCount,
            rawCount: result.rawCount,
            outputCount: result.outputCount,
            failedCount,
            currentStage: result.ok ? '已完成' : '处理失败',
            message: result.message ?? (result.ok ? '处理完成。' : '处理失败。'),
            debugMessage: result.debugMessage,
            outputDir: result.outputDir,
            endedAt: Date.now()
          }
          : current
      )

      appendLog(result.message ?? (result.ok ? '处理完成。' : '处理失败。'))
      appendLog(`输入数量：${result.inputCount}`)
      appendLog(`Raw 数量：${result.rawCount}`)
      appendLog(`输出数量：${result.outputCount}`)

      if (!result.ok) {
        appendLog('处理失败详情：')
        if (result.debugMessage?.trim()) {
          appendLog(result.debugMessage.trim())
        }
        if (result.rembgLog.trim()) {
          appendLog(result.rembgLog.trim())
        }
        if (result.postprocessLog.trim()) {
          appendLog(result.postprocessLog.trim())
        }
        return
      }
      setRawFolder(result.rawDir)
      setSoftFolder(result.outputDir)
      setOutputFolder(result.outputDir)
      appendLog(`Raw 目录：${result.rawDir}`)
      appendLog(`输出目录：${result.outputDir}`)
      await inspectCacheStatus(selectedFolder, preset, true)
      await refreshQualityReport(result.rawDir, result.outputDir)

      if (frameFiles.length > 0) {
        await loadFrameByIndex(currentFrameIndex, frameFiles, selectedFolder, result.rawDir, result.outputDir)
        setActivePreviewTab('soft')
      }

      appendLog('批量处理完成。')
    } catch (error) {
      const message = '批处理遇到未知错误。详情里保留了技术信息。'
      const debugMessage = error instanceof Error ? error.stack ?? error.message : String(error)
      setBatchTask((current) =>
        current?.id === taskId
          ? {
            ...current,
            status: 'error',
            failedCount: current.totalCount,
            currentStage: '处理失败',
            message,
            debugMessage,
            endedAt: Date.now()
          }
          : current
      )
      appendLog(`处理失败：${message}`)
      appendLog('处理失败详情：')
      appendLog(debugMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOpenOutputFolder = async (): Promise<void> => {
    if (!outputFolder) {
      appendLog('还没有可打开的输出目录。')
      return
    }

    await window.cutoutAPI.openFolder(outputFolder)
  }

  const handleExportTransparentPngSequence = async (): Promise<void> => {
    if (!softFolder) {
      appendLog('还没有可导出的 Soft 结果。请先完成批量处理。')
      return
    }

    setIsExporting(true)
    appendLog('开始导出透明 PNG 序列。')
    appendLog(`Soft 目录：${softFolder}`)
    appendLog('导出位置：自动创建在 Soft 目录旁的 exports 文件夹。')
    appendLog(
      `命名规则：${exportFilePrefix || 'frame'} / 起始 ${exportStartIndex} / 补零 ${exportPadding} 位`
    )

    try {
      const result = await window.cutoutAPI.exportTransparentPngSequence({
        sourceDir: softFolder,
        targetRootDir: '',
        inputDir: selectedFolder,
        naming: {
          prefix: exportFilePrefix,
          startIndex: exportStartIndex,
          padding: exportPadding
        }
      })

      appendLog(result.message ?? (result.ok ? '导出完成。' : '导出失败。'))

      if (!result.ok) {
        return
      }

      appendLog(`导出目录：${result.exportDir}`)
      appendLog(`导出清单：${result.manifestPath}`)
      appendLog(`导出 PNG 数量：${result.outputCount}`)
      appendLog('导出完成，请从日志中的导出目录检查文件。')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      appendLog(`导出失败：${message}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleOpenCurrentFrameFolder = async (): Promise<void> => {
    if (!selectedFolder) {
      appendLog('还没有可打开的序列帧目录。')
      return
    }

    await window.cutoutAPI.openFolder(selectedFolder)
  }

  const previewTitle =
    activePreviewTab === 'original'
      ? '原图'
      : activePreviewTab === 'raw'
        ? 'Raw 抠图'
        : activePreviewTab === 'soft'
          ? 'Soft 后处理'
          : 'Raw / Soft 对比'

  const activeCompareItem = activeComparePreset
    ? compareItems.find((item) => item.preset === activeComparePreset)
    : null

  const displayPreviewTitle = activeCompareItem ? `${activeCompareItem.label} 对比` : previewTitle
  const displayPreviewImage =
    activeCompareItem?.dataUrl ??
    (activePreviewTab === 'compare'
      ? previewImages.soft || previewImages.raw
      : previewImages[activePreviewTab])
  const rulerTickIndexes = getRulerTickIndexes()
  const hasOriginalPreview = Boolean(previewImages.original)
  const hasRawPreview = Boolean(previewImages.raw)
  const hasSoftPreview = Boolean(previewImages.soft)
  const hasCompareImages = Boolean(previewImages.raw && previewImages.soft)
  const previewBackgroundLabel =
    previewBackground === 'checker'
      ? '棋盘格'
      : previewBackground === 'black'
        ? '黑底'
        : previewBackground === 'white'
          ? '白底'
          : previewBackground === 'gray'
            ? '灰底'
            : '背景图'
  const previewReadyText =
    frameFiles.length === 0
      ? '等待序列帧'
      : `${hasRawPreview ? 'Raw 已就绪' : 'Raw 未生成'} / ${hasSoftPreview ? 'Soft 已就绪' : 'Soft 未生成'}`
  const qualityIssueFrameIndexes = qualityReport
    ? Array.from(
      new Set(
        qualityReport.issues
          .map((issue) => (issue.fileName ? frameFiles.indexOf(issue.fileName) : -1))
          .filter((frameIndex) => frameIndex >= 0)
      )
    ).sort((a, b) => a - b)
    : []
  const currentFrameHasQualityIssue = qualityIssueFrameIndexes.includes(currentFrameIndex)

  const selfCheckPassedCount =
    selfCheckResult?.items.filter((item: SelfCheckItem) => item.status === 'ok').length ?? 0

  const selfCheckTotalCount = selfCheckResult?.items.length ?? 0
  const selfCheckFailedCount = selfCheckTotalCount - selfCheckPassedCount

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SC</div>
          <div>
            <h1>Sequence Cutout Studio</h1>
            <p>序列帧透明化工作台</p>
          </div>
        </div>

        <nav className="steps" aria-label="主流程导航">
          {WORKFLOW_STEPS.map((step) => (
            <button
              key={step.id}
              className={activeWorkflowStep === step.id ? 'step active' : 'step'}
              onClick={() => handleWorkflowStepClick(step)}
            >
              {step.label}
            </button>
          ))}
        </nav>

        <div className="phase-card">
          <span>当前阶段</span>
          <strong>序列预览优化</strong>
          <p>GIF / WebP 拆帧、放大查看与区间循环。</p>
          <small>{appVersion ? `v${appVersion}` : '读取版本中...'}</small>
        </div>

        <div className="self-check-card">
          <div className="self-check-header">
            <div className="self-check-title-block">
              <span>环境自检</span>
              <p>检查 FFmpeg、Python、rembg、模型、脚本和目录权限</p>
            </div>

            <strong className={selfCheckResult?.ok ? 'ok' : 'warn'}>
              {isSelfChecking
                ? '检查中...'
                : selfCheckResult
                  ? selfCheckResult.ok
                    ? `${selfCheckPassedCount} / ${selfCheckTotalCount} 项通过`
                    : `${selfCheckPassedCount} / ${selfCheckTotalCount} 项通过，${selfCheckFailedCount} 项异常`
                  : '未检查'}
            </strong>
          </div>

          <button className="self-check-button" onClick={handleRunSelfCheck} disabled={isSelfChecking}>
            {isSelfChecking ? '检查中...' : '重新自检'}
          </button>

          {selfCheckResult ? (
            <div className="self-check-list">
              {selfCheckResult.items.map((item: SelfCheckItem) => (
                <div key={item.key} className={`self-check-item ${item.status}`}>
                  <span>{item.status === 'ok' ? '✓' : '×'}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.message}</p>
                    <small>{item.path}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {batchTask ? (
          <div className={`sidebar-batch-status ${batchTask.status}`}>
            <div className="sidebar-batch-header">
              <span>批处理状态</span>
              <strong>
                {batchTask.status === 'running'
                  ? '处理中'
                  : batchTask.status === 'done'
                    ? '完成'
                    : '失败'}
              </strong>
            </div>
            <div className="sidebar-batch-title">
              <strong>{getBatchTaskTitle(batchTask)}</strong>
              <span>{batchTask.currentStage}</span>
            </div>
            <div className="sidebar-batch-message" title={batchTask.message}>
              {batchTask.message}
            </div>
            <div className="sidebar-batch-progress">
              <span style={{ width: getBatchTaskProgressWidth(batchTask) }} />
            </div>
            <div className="sidebar-batch-meta">
              <span>
                输出 {batchTask.outputCount} / {batchTask.totalCount}
              </span>
              <span>Raw {batchTask.rawCount}</span>
              <span>失败 {batchTask.failedCount}</span>
            </div>
            <button
              className="sidebar-batch-open"
              onClick={() => {
                void window.cutoutAPI.openFolder(batchTask.outputDir)
              }}
              disabled={!batchTask.outputDir}
            >
              打开输出
            </button>
          </div>
        ) : null}
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h2>序列帧透明化处理</h2>
            <p>视频 / PNG 序列帧 → AI 抠图 → 边缘后处理 → 游戏可用透明 PNG</p>
          </div>
          <div className="status-pill">{appVersion ? `v${appVersion}` : '读取版本中...'}</div>
        </header>

        <div className="content-grid">
          <section
            ref={inputPanelRef}
            className={
              activeWorkflowStep === 'input'
                ? 'panel controls-panel input-panel workflow-target'
                : 'panel controls-panel input-panel'
            }
          >
            <div className="panel-header">
              <h3>输入素材</h3>
              <span>Input</span>
            </div>

            <div className="button-row">
              <button className="primary-button" onClick={handleSelectVideoFile} disabled={isExtracting}>
                选择视频
              </button>
              <button className="secondary-button" onClick={handleSelectFrameFolder} disabled={isExtracting}>
                选择序列帧文件夹
              </button>
            </div>

            <div
              className={isDraggingInput ? 'drop-zone drag-active' : 'drop-zone'}
              onDragEnter={handleInputDragEnter}
              onDragOver={handleInputDragOver}
              onDragLeave={handleInputDragLeave}
              onDrop={handleInputDrop}
            >
              <strong>拖入视频、序列帧文件夹，或序列帧 PNG</strong>
              <p>支持 MP4 / MOV / WEBM / MKV / GIF / WebP，也支持直接拖入 PNG 序列帧目录或其中一张 PNG。</p>
            </div>

            <div
              ref={videoToolsRef}
              className={activeWorkflowStep === 'frames' ? 'video-tools workflow-target' : 'video-tools'}
            >
              <div className="video-tool-title">视频切帧</div>

              <div className="video-field-grid">
                <label className="field">
                  <span>FPS</span>
                  <input
                    type="number"
                    min="1"
                    value={videoFps}
                    disabled={isAnimationInput || isExtracting}
                    onChange={(event) => setVideoFps(Number(event.target.value))}
                  />
                </label>

                <label className="field">
                  <span>时长秒数，0 表示全长</span>
                  <input
                    type="number"
                    min="0"
                    value={videoDuration}
                    disabled={isAnimationInput || isExtracting}
                    onChange={(event) => setVideoDuration(Number(event.target.value))}
                  />
                </label>

                <label className="field">
                  <span>输出前缀</span>
                  <input
                    type="text"
                    value={videoOutputPrefix}
                    onChange={(event) => setVideoOutputPrefix(event.target.value)}
                  />
                </label>
              </div>

              <button className="secondary-button" onClick={handleExtractFrames} disabled={!selectedVideo || isExtracting}>
                {isExtracting ? '正在切帧...' : '切成序列帧'}
              </button>

              <button
                className="secondary-button folder-button"
                onClick={handleOpenCurrentFrameFolder}
                disabled={!selectedFolder}
                title="打开序列帧目录"
              >
                打开序列帧目录
              </button>
            </div>

            <input className="input-info-toggle" id="input-info-toggle" type="checkbox" />
            <label className="input-info-more" htmlFor="input-info-toggle">...</label>
            <div className="info-list">
              <div>
                <span>路径</span>
                <strong>{inputPath}</strong>
              </div>
              <div>
                <span>类型</span>
                <strong>{assetType}</strong>
              </div>
              <div>
                <span>帧数</span>
                <strong>{frameCount}</strong>
              </div>
              <div>
                <span>尺寸</span>
                <strong>{frameSize}</strong>
              </div>
              <div>
                <span>首帧</span>
                <strong>{firstFrame}</strong>
              </div>
              <div>
                <span>末帧</span>
                <strong>{lastFrame}</strong>
              </div>
              <div>
                <span>尺寸一致</span>
                <strong>{sameSize}</strong>
              </div>
              <div>
                <span>Alpha</span>
                <strong>{alphaInfo}</strong>
              </div>
            </div>
          </section>

          <section
            ref={processPanelRef}
            className={
              activeWorkflowStep === 'cutout'
                ? 'panel controls-panel process-panel workflow-target'
                : 'panel controls-panel process-panel'
            }
          >
            <div className="panel-header">
              <h3>处理参数</h3>
              <span>Process</span>
            </div>

            <div className="preset-row">
              {(['C', 'F', 'I', 'Custom'] as Preset[]).map((item) => (
                <button
                  key={item}
                  className={preset === item ? 'preset active' : 'preset'}
                  onClick={() => handlePresetChange(item)}
                >
                  <strong>{item}</strong>
                  <span>{getPresetName(item)}</span>
                </button>
              ))}
            </div>

            <div
              ref={edgeControlsRef}
              className={activeWorkflowStep === 'edge' ? 'edge-control-grid workflow-target' : 'edge-control-grid'}
            >
              <label className="field">
                <span>边缘阈值</span>
                <input
                  type="number"
                  value={alphaLow}
                  disabled={preset !== 'Custom'}
                  onChange={(event) => setAlphaLow(Number(event.target.value))}
                />
              </label>

              <label className="field">
                <span>收边力度</span>
                <input
                  type="number"
                  step="0.01"
                  value={shrink}
                  disabled={preset !== 'Custom'}
                  onChange={(event) => setShrink(Number(event.target.value))}
                />
              </label>
            </div>

            <div className="button-row">
              <button
                className="primary-button"
                onClick={handleRunSingleCutout}
                disabled={isTestingSingle || !selectedFolder || !previewFrameName}
              >
                {isTestingSingle ? '测试中...' : '测试单帧'}
              </button>

              <button
                className="secondary-button"
                onClick={handleRunCompareCutout}
                disabled={isComparing || !selectedFolder || !previewFrameName}
              >
                {isComparing ? '对比中...' : '生成对比'}
              </button>

              <button
                className="primary-button"
                onClick={() => {
                  void handleRunBatchCutout()
                }}
                disabled={isProcessing}
              >
                {isProcessing ? '处理中...' : '批量处理'}
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  void handleRunBatchCutout({ skipRembg: true })
                }}
                disabled={isProcessing || !selectedFolder}
              >
                只重跑边缘
              </button>
              <button className="secondary-button" onClick={handleSaveProcessConfig} disabled={!selectedFolder}>
                保存参数
              </button>

              <button className="secondary-button" onClick={handleLoadProcessConfig} disabled={!selectedFolder}>
                读取参数
              </button>
            </div>

            <div className="config-status">
              <span>{configMessage}</span>
              {configPath ? <strong>{configPath}</strong> : null}
            </div>
          </section>

          <section className="panel export-panel">
            <div className="panel-header">
              <h3>导出设置</h3>
              <span>Export</span>
            </div>

            <div className="export-naming-row">
              <label className="field">
                <span>导出命名</span>
                <input
                  type="text"
                  value={exportFilePrefix}
                  onChange={(event) => setExportFilePrefix(event.target.value)}
                  placeholder="frame"
                />
              </label>

              <label className="field">
                <span>起始编号</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={exportStartIndex}
                  onChange={(event) => setExportStartIndex(Number(event.target.value))}
                />
              </label>

              <label className="field">
                <span>补零位数</span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  step="1"
                  value={exportPadding}
                  onChange={(event) => setExportPadding(Number(event.target.value))}
                />
              </label>
            </div>

            <div className="button-row">
              <button className="secondary-button" onClick={handleOpenOutputFolder} disabled={!outputFolder}>
                打开输出目录
              </button>
              <button
                className="primary-button"
                onClick={handleExportTransparentPngSequence}
                disabled={isExporting || isProcessing || !softFolder}
              >
                {isExporting ? '导出中...' : '导出 PNG 序列'}
              </button>
            </div>

            <div className="panel-note">
              后续 Sprite Sheet、TexturePacker JSON、Cocos plist 只在本面板高级区扩展。
            </div>
          </section>

          <section className="panel quality-panel">
            <div className="panel-header">
              <h3>质量验收</h3>
              <span>Quality</span>
            </div>

            <div className="quality-summary">
              <div>
                <span>当前状态</span>
                <strong>{qualityReport ? qualityReport.message : batchTask ? batchTask.currentStage : '等待批处理结果'}</strong>
              </div>
              <div>
                <span>输出帧数</span>
                <strong>{qualityReport ? `${qualityReport.softCount} / ${qualityReport.inputCount}` : batchTask ? `${batchTask.outputCount} / ${batchTask.totalCount}` : '-'}</strong>
              </div>
              <div>
                <span>问题帧检测</span>
                <strong>{qualityReport ? `${qualityReport.issueCount} 个疑似问题` : 'Phase 6C 接入'}</strong>
              </div>
            </div>

            {qualityReport?.issues.length ? (
              <div className="quality-issues">
                {qualityReport.issues.slice(0, 3).map((issue, index) => (
                  <button
                    key={`${issue.fileName ?? issue.reason}-${index}`}
                    className={`quality-issue ${issue.severity}`}
                    onClick={() => handleQualityIssueClick(issue)}
                  >
                    <strong>{issue.fileName ?? issue.reason}</strong>
                    <span>{issue.fileName ? issue.reason : issue.detail ?? issue.reason}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="panel-note">
              后续数量一致性、alpha 波动、疑似闪烁帧和问题帧跳转统一进入本面板。
            </div>
          </section>

          <section
            ref={previewPanelRef}
            className={
              activeWorkflowStep === 'export'
                ? 'panel preview-panel workflow-target'
                : 'panel preview-panel'
            }
          >
            <div className="panel-header">
              <h3>预览检查：{displayPreviewTitle}</h3>
              <div className="preview-background-controls" aria-label="预览背景">
                {PREVIEW_BACKGROUND_OPTIONS.map((option) => {
                  const isCustom = option.value === 'custom'
                  const isDisabled = isCustom && !customPreviewBackgroundDataUrl

                  return (
                    <button
                      key={option.value}
                      className={previewBackground === option.value ? 'active' : ''}
                      onClick={() => setPreviewBackground(option.value)}
                      disabled={isDisabled}
                      title={isCustom ? '使用已选择的背景图' : `${option.label}底预览`}
                    >
                      <span className={`background-swatch ${option.value}`} />
                      <span>{option.label}</span>
                    </button>
                  )
                })}

                <button className="background-select-button" onClick={handleSelectCustomPreviewBackground}>
                  选择背景
                </button>
              </div>
            </div>

            <div
              className={`preview-stage ${previewBackground}`}
              style={
                previewBackground === 'custom' && customPreviewBackgroundDataUrl
                  ? {
                    backgroundImage: `url("${customPreviewBackgroundDataUrl}")`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }
                  : undefined
              }
            >
              {activePreviewTab === 'compare' && hasCompareImages ? (
                <div className="compare-slider-stage">
                  <img
                    className="compare-slider-image"
                    src={previewImages.raw}
                    alt="Raw preview"
                    onDoubleClick={handleOpenLightbox}
                  />
                  <div
                    className="compare-slider-soft"
                    style={{ clipPath: `inset(0 0 0 ${compareSplit}%)` }}
                  >
                    <img className="compare-slider-image" src={previewImages.soft} alt="Soft preview" />
                  </div>
                  <div className="compare-slider-line" style={{ left: `${compareSplit}%` }}>
                    <span />
                  </div>
                  <div className="compare-slider-status">
                    <span>左 Raw</span>
                    <strong>{compareSplit}%</strong>
                    <span>右 Soft</span>
                  </div>
                  <input
                    className="compare-slider-input"
                    type="range"
                    min="0"
                    max="100"
                    value={compareSplit}
                    onChange={(event) => setCompareSplit(Number(event.target.value))}
                    aria-label="Raw Soft 对比滑块"
                  />
                  <div className="compare-slider-labels">
                    <span>Raw</span>
                    <span>Soft</span>
                  </div>
                </div>
              ) : displayPreviewImage ? (
                <img
                  className="preview-image"
                  src={displayPreviewImage}
                  alt={`${displayPreviewTitle} preview`}
                  onDoubleClick={handleOpenLightbox}
                />
              ) : (
                <div className="preview-empty">
                  <strong>等待预览</strong>
                  <p>当前标签：{displayPreviewTitle}</p>
                </div>
              )}
            </div>
            <div className="preview-status-strip">
              <span>{frameFiles.length > 0 ? `${currentFrameIndex + 1} / ${frameFiles.length}` : '0 / 0'}</span>
              <span>{displayPreviewTitle}</span>
              <span>{previewBackgroundLabel}</span>
              {currentFrameHasQualityIssue ? <span className="warning">疑似问题帧</span> : null}
              <strong>{previewReadyText}</strong>
            </div>
            <div className="frame-controls">
              <button onClick={handleGoToFirstFrame} disabled={frameFiles.length === 0}>
                首帧
              </button>
              <button onClick={handlePreviousFrame} disabled={frameFiles.length === 0}>
                上一帧
              </button>

              <div className="frame-indicator">
                {frameFiles.length > 0 ? `${currentFrameIndex + 1} / ${frameFiles.length}` : '0 / 0'}
                {previewFrameName ? ` · ${previewFrameName}` : ''}
              </div>

              <button onClick={handleNextFrame} disabled={frameFiles.length === 0}>
                下一帧
              </button>
              <button onClick={handleGoToLastFrame} disabled={frameFiles.length === 0}>
                末帧
              </button>
            </div>

            <div className="frame-ruler">
              <div className="frame-ruler-header">
                <strong>帧标尺</strong>
                <span>
                  {frameFiles.length > 0
                    ? `${currentFrameIndex + 1} / ${frameFiles.length} · ${previewFrameName}`
                    : '等待序列帧'}
                </span>
              </div>
              <input
                className="frame-ruler-input"
                type="range"
                min="0"
                max={Math.max(0, frameFiles.length - 1)}
                value={currentFrameIndex}
                disabled={frameFiles.length === 0}
                onChange={(event) => {
                  void loadFrameByIndex(Number(event.target.value))
                }}
                aria-label="序列帧标尺"
              />
              <div className="frame-ruler-ticks">
                {rulerTickIndexes.length > 0 ? (
                  rulerTickIndexes.map((frameIndex) => (
                    <button
                      key={frameIndex}
                      className={[
                        frameIndex === currentFrameIndex ? 'active' : '',
                        qualityIssueFrameIndexes.includes(frameIndex) ? 'issue' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        void loadFrameByIndex(frameIndex)
                      }}
                    >
                      {frameIndex + 1}
                    </button>
                  ))
                ) : null}
              </div>
            </div>

            <div className="key-frame-row">
              <span>关键帧：</span>

              <button onClick={handleGoToFirstFrame} disabled={frameFiles.length === 0}>
                首帧
              </button>

              <button onClick={handleGoToMiddleFrame} disabled={frameFiles.length === 0}>
                中间帧
              </button>

              <button onClick={handleGoToLastFrame} disabled={frameFiles.length === 0}>
                末帧
              </button>

              <span className="key-frame-indexes">
                {keyFrameIndexes.length > 0
                  ? keyFrameIndexes.map((index) => index + 1).join(' / ')
                  : '-'}
              </span>
            </div>
            {qualityIssueFrameIndexes.length > 0 ? (
              <div className="issue-frame-row">
                <span>疑似问题帧：</span>
                {qualityIssueFrameIndexes.slice(0, 12).map((frameIndex) => (
                  <button
                    key={frameIndex}
                    className={frameIndex === currentFrameIndex ? 'active' : ''}
                    onClick={() => handleReviewFrameIndex(frameIndex)}
                  >
                    {frameIndex + 1}
                  </button>
                ))}
                {qualityIssueFrameIndexes.length > 12 ? (
                  <span className="issue-frame-more">+{qualityIssueFrameIndexes.length - 12}</span>
                ) : null}
              </div>
            ) : null}
            <div className="playback-controls">
              <button onClick={handleTogglePlayback} disabled={frameFiles.length === 0}>
                {isPlaying ? '暂停' : '播放'}
              </button>

              <label className="playback-fps">
                <span>播放 FPS</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={playbackFps}
                  disabled={useAnimationTiming && frameDurationsMs.length > 0}
                  onChange={(event) => handlePlaybackFpsChange(Number(event.target.value))}
                />
              </label>

              {frameDurationsMs.length > 0 && (
                <label className="preview-check"><input type="checkbox" checked={useAnimationTiming}
                  onChange={(event) => setUseAnimationTiming(event.target.checked)} />原始节奏</label>
              )}
              <label className="preview-check"><input type="checkbox" checked={usePlaybackRange}
                disabled={frameFiles.length === 0}
                onChange={(event) => setUsePlaybackRange(event.target.checked)} />区间循环</label>
              <label className="playback-fps"><span>起始帧</span><input type="number" min={1} max={rangeEnd}
                disabled={!usePlaybackRange || frameFiles.length === 0} value={rangeStartDraft}
                onChange={(event) => setRangeStartDraft(event.target.value)}
                onBlur={() => commitPlaybackRange('start')}
                onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
              <label className="playback-fps"><span>结束帧</span><input type="number" min={rangeStart} max={frameFiles.length}
                disabled={!usePlaybackRange || frameFiles.length === 0} value={rangeEndDraft}
                onChange={(event) => setRangeEndDraft(event.target.value)}
                onBlur={() => commitPlaybackRange('end')}
                onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
              <div className="playback-status">
                {frameFiles.length > 0
                  ? `${isPlaying ? '播放中' : '已暂停'} · ${displayPreviewTitle} · ${currentFrameIndex + 1} / ${frameFiles.length} · ${playbackStart + 1}-${playbackEnd + 1} 循环`
                  : '等待序列帧'}
              </div>
            </div>
            <div className="preview-tabs">
              <button
                className={!activeComparePreset && activePreviewTab === 'original' ? 'active' : ''}
                disabled={!hasOriginalPreview}
                onClick={() => {
                  setActiveComparePreset(null)
                  setActivePreviewTab('original')
                }}
              >
                原图
              </button>

              <button
                className={!activeComparePreset && activePreviewTab === 'raw' ? 'active' : ''}
                disabled={!hasRawPreview}
                onClick={() => {
                  setActiveComparePreset(null)
                  setActivePreviewTab('raw')
                }}
              >
                Raw{hasRawPreview ? '' : ' 未就绪'}
              </button>

              <button
                className={!activeComparePreset && activePreviewTab === 'soft' ? 'active' : ''}
                disabled={!hasSoftPreview}
                onClick={() => {
                  setActiveComparePreset(null)
                  setActivePreviewTab('soft')
                }}
              >
                Soft{hasSoftPreview ? '' : ' 未就绪'}
              </button>

              <button
                className={!activeComparePreset && activePreviewTab === 'compare' ? 'active' : ''}
                disabled={!hasCompareImages}
                onClick={() => {
                  setActiveComparePreset(null)
                  setActivePreviewTab('compare')
                }}
              >
                对比{hasCompareImages ? '' : ' 未就绪'}
              </button>

              {COMPARE_PRESETS.map((comparePreset) => {
                const item = compareItems.find((candidate) => candidate.preset === comparePreset)
                const isReady = item?.status === 'done' && Boolean(item.dataUrl)

                return (
                  <button
                    key={comparePreset}
                    className={activeComparePreset === comparePreset ? 'active compare-tab' : 'compare-tab'}
                    disabled={!isReady}
                    onClick={() => {
                      if (item) {
                        handleApplyComparePreset(item)
                      }
                    }}
                  >
                    {getPresetName(comparePreset)}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="panel log-panel">
            <div className="panel-header">
              <h3>处理日志</h3>
              <span>Logs</span>
            </div>

            <div className="logs" ref={logsRef}>
              {logs.map((line, index) => (
                <div key={`${line}-${index}`} className="log-line">
                  {line}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
      {lightboxOpen ? (
        <div
          ref={lightboxRef}
          className={`preview-lightbox${useMainPreviewBackground ? ` ${previewBackground}` : ''}`}
          style={useMainPreviewBackground && previewBackground === 'custom' && customPreviewBackgroundDataUrl
            ? { backgroundImage: `url("${customPreviewBackgroundDataUrl}")`, backgroundSize: 'auto', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
            : undefined}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseLightbox()
            }
          }}
        >
          <div className="preview-lightbox-toolbar">
            <strong>{displayPreviewTitle}</strong>
            <span>{Math.round(lightboxScale * 100)}%</span>
            <label className="preview-check"><input type="checkbox" checked={useMainPreviewBackground}
              onChange={(event) => setUseMainPreviewBackground(event.target.checked)} />使用主预览背景</label>
            <select className="lightbox-background-select" aria-label="放大预览背景"
              title="切换放大预览背景" value={previewBackground} disabled={!useMainPreviewBackground}
              onChange={(event) => {
                if (event.target.value === 'choose-image') {
                  void handleSelectCustomPreviewBackground()
                } else {
                  setPreviewBackground(event.target.value as PreviewBackground)
                }
              }}>
              {PREVIEW_BACKGROUND_OPTIONS.map((option) => <option key={option.value} value={option.value}
                disabled={option.value === 'custom' && !customPreviewBackgroundDataUrl}>
                {option.value === 'custom' ? '图片背景' : `${option.label}背景`}
              </option>)}
              <option value="choose-image">选择背景图片...</option>
            </select>
            <button onClick={handleResetLightbox}>还原</button>
            <button onClick={handleCloseLightbox}>关闭</button>
          </div>
          <img
            ref={lightboxImageRef}
            className={isDraggingLightbox ? 'dragging' : ''}
            src={displayPreviewImage}
            alt={`${displayPreviewTitle} enlarged preview`}
            style={{
              transform: `translate(${lightboxOffset.x}px, ${lightboxOffset.y}px) scale(${lightboxScale})`
            }}
            onPointerDown={handleLightboxPointerDown}
            onPointerMove={handleLightboxPointerMove}
            onPointerUp={handleLightboxPointerUp}
            onDoubleClick={handleResetLightbox}
            draggable={false}
          />
        </div>
      ) : null}
    </main>
  )
}

export default App
