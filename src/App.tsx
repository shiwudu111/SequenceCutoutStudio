import { useEffect, useRef, useState, type DragEvent } from 'react'
import './App.css'

type Preset = 'H' | 'I' | 'Custom'
type PreviewBackground = 'checker' | 'black' | 'white' | 'gray'
type PreviewTab = 'original' | 'raw' | 'soft'

function App(): JSX.Element {
  const [inputPath, setInputPath] = useState('尚未选择素材')
  const [selectedFolder, setSelectedFolder] = useState('')
  const [selectedVideo, setSelectedVideo] = useState('')
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
  const [previewBackground, setPreviewBackground] = useState<PreviewBackground>('black')
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
  const [isTestingSingle, setIsTestingSingle] = useState(false)
  const [isDraggingInput, setIsDraggingInput] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackFps, setPlaybackFps] = useState(12)
  const previewCacheRef = useRef<Map<string, string>>(new Map())
  const [logs, setLogs] = useState<string[]>([
    'Sequence Cutout Studio 已启动。',
    '当前阶段：Phase 2B - 动画播放预览 + FPS 控制。'
  ])

  const appendLog = (line: string): void => {
    setLogs((prev) => [...prev, line])
  }

  const joinWindowsPath = (folderPath: string, fileName: string): string => {
    return `${folderPath.replace(/[\\/]+$/, '')}\\${fileName}`
  }

  const loadPreviewImage = async (
    kind: PreviewTab,
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

    setCurrentFrameIndex(safeIndex)
    setPreviewFrameName(frameName)

    await loadPreviewImage('original', joinWindowsPath(folderOverride, frameName), true)

    if (rawFolderOverride) {
      await loadPreviewImage('raw', joinWindowsPath(rawFolderOverride, frameName), true)
    }

    if (softFolderOverride) {
      await loadPreviewImage('soft', joinWindowsPath(softFolderOverride, frameName), true)
    }
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

    const safeFps = Math.max(1, Math.min(60, playbackFps))

    const timer = window.setTimeout(() => {
      void loadFrameByIndex(currentFrameIndex + 1)
    }, 1000 / safeFps)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    isPlaying,
    currentFrameIndex,
    frameFiles.length,
    playbackFps,
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
    previewCacheRef.current.clear()

    setFrameFiles(files)
    setCurrentFrameIndex(0)
    setKeyFrameIndexes(keyIndexes)
    setRawFolder('')
    setSoftFolder('')
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

    if (files.length > 0) {
      await loadFrameByIndex(0, files, folderPath, '', '')
    }
  }

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
    setAssetType('视频文件')
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
    setCurrentFrameIndex(0)
    setKeyFrameIndexes([])
    setIsPlaying(false)
    previewCacheRef.current.clear()

    setPreviewFrameName('')
    setActivePreviewTab('original')
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
    if (!selectedVideo) {
      appendLog('请先选择视频文件。')
      return
    }

    appendLog('开始视频切帧。')
    appendLog(`视频：${selectedVideo}`)
    appendLog(`FPS：${videoFps}`)
    appendLog(`时长：${videoDuration > 0 ? `${videoDuration} 秒` : '全长'}`)
    appendLog(`输出前缀：${videoOutputPrefix}`)

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
  }

  const handlePresetChange = (nextPreset: Preset): void => {
    setPreset(nextPreset)

    if (nextPreset === 'H') {
      setAlphaLow(44)
      setShrink(0.72)
    }

    if (nextPreset === 'I') {
      setAlphaLow(48)
      setShrink(0.78)
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
    appendLog(`Preset：${preset} / AlphaLow=${alphaLow} / Shrink=${shrink}`)

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
  const handleRunBatchCutout = async (): Promise<void> => {
    if (!selectedFolder) {
      appendLog('请先选择序列帧文件夹。')
      return
    }

    setIsProcessing(true)
    setOutputFolder('')
    setIsPlaying(false)
    previewCacheRef.current.clear()

    appendLog('开始批量处理。')
    appendLog(`输入目录：${selectedFolder}`)
    appendLog(`Preset：${preset} / AlphaLow=${alphaLow} / Shrink=${shrink}`)
    appendLog('开始 rembg 批量抠图...')

    const result = await window.cutoutAPI.runBatchCutout({
      inputDir: selectedFolder,
      preset,
      alphaLow,
      shrink
    })

    appendLog(result.message ?? (result.ok ? '处理完成。' : '处理失败。'))
    appendLog(`输入数量：${result.inputCount}`)
    appendLog(`Raw 数量：${result.rawCount}`)
    appendLog(`输出数量：${result.outputCount}`)

    if (!result.ok) {
      appendLog('处理失败日志：')
      if (result.rembgLog.trim()) {
        appendLog(result.rembgLog.trim())
      }
      if (result.postprocessLog.trim()) {
        appendLog(result.postprocessLog.trim())
      }
      setIsProcessing(false)
      return
    }
    setRawFolder(result.rawDir)
    setSoftFolder(result.outputDir)
    setOutputFolder(result.outputDir)
    appendLog(`Raw 目录：${result.rawDir}`)
    appendLog(`输出目录：${result.outputDir}`)

    if (frameFiles.length > 0) {
      await loadFrameByIndex(currentFrameIndex, frameFiles, selectedFolder, result.rawDir, result.outputDir)
      setActivePreviewTab('soft')
    }

    appendLog('批量处理完成。')
    setIsProcessing(false)
  }

  const handleOpenOutputFolder = async (): Promise<void> => {
    if (!outputFolder) {
      appendLog('还没有可打开的输出目录。')
      return
    }

    await window.cutoutAPI.openFolder(outputFolder)
  }

  const handleOpenCurrentFrameFolder = async (): Promise<void> => {
    if (!selectedFolder) {
      appendLog('还没有可打开的序列帧目录。')
      return
    }

    await window.cutoutAPI.openFolder(selectedFolder)
  }

  const previewTitle =
    activePreviewTab === 'original' ? '原图' : activePreviewTab === 'raw' ? 'Raw 抠图' : 'Soft 后处理'

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

        <nav className="steps">
          <button className="step active">1. 导入素材</button>
          <button className="step">2. 视频切帧</button>
          <button className="step">3. AI 抠图</button>
          <button className="step">4. 边缘处理</button>
          <button className="step">5. 预览导出</button>
        </nav>

        <div className="phase-card">
          <span>当前阶段</span>
          <strong>Phase 2B</strong>
          <p>实现动画播放预览、FPS 控制和循环播放。</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h2>序列帧透明化处理</h2>
            <p>视频 / PNG 序列帧 → AI 抠图 → 边缘后处理 → 游戏可用透明 PNG</p>
          </div>
          <div className="status-pill">Core: E:\\cuts</div>
        </header>

        <div className="content-grid">
          <section className="panel controls-panel">
            <div className="panel-header">
              <h3>输入素材</h3>
              <span>Input</span>
            </div>

            <div className="button-row">
              <button className="primary-button" onClick={handleSelectVideoFile}>
                选择视频
              </button>
              <button className="secondary-button" onClick={handleSelectFrameFolder}>
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
              <p>支持 MP4 / MOV / WEBM / MKV，也支持直接拖入 PNG 序列帧目录或其中一张 PNG。</p>
            </div>

            <div className="video-tools">
              <div className="video-tool-title">视频切帧</div>

              <label className="field">
                <span>FPS</span>
                <input
                  type="number"
                  min="1"
                  value={videoFps}
                  onChange={(event) => setVideoFps(Number(event.target.value))}
                />
              </label>

              <label className="field">
                <span>时长秒数，0 表示全长</span>
                <input
                  type="number"
                  min="0"
                  value={videoDuration}
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

              <button className="secondary-button" onClick={handleExtractFrames} disabled={!selectedVideo}>
                切成序列帧
              </button>

              <button className="secondary-button" onClick={handleOpenCurrentFrameFolder} disabled={!selectedFolder}>
                打开序列帧目录
              </button>
            </div>

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

          <section className="panel controls-panel">
            <div className="panel-header">
              <h3>处理参数</h3>
              <span>Preset</span>
            </div>

            <div className="preset-row">
              {(['H', 'I', 'Custom'] as Preset[]).map((item) => (
                <button
                  key={item}
                  className={preset === item ? 'preset active' : 'preset'}
                  onClick={() => handlePresetChange(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <label className="field">
              <span>AlphaLow</span>
              <input
                type="number"
                value={alphaLow}
                disabled={preset !== 'Custom'}
                onChange={(event) => setAlphaLow(Number(event.target.value))}
              />
            </label>

            <label className="field">
              <span>Shrink</span>
              <input
                type="number"
                step="0.01"
                value={shrink}
                disabled={preset !== 'Custom'}
                onChange={(event) => setShrink(Number(event.target.value))}
              />
            </label>

            <div className="button-row">
              <button
                className="primary-button"
                onClick={handleRunSingleCutout}
                disabled={isTestingSingle || !selectedFolder || !previewFrameName}
              >
                {isTestingSingle ? '测试中...' : '测试单帧'}
              </button>
              <button className="primary-button" onClick={handleRunBatchCutout} disabled={isProcessing}>
                {isProcessing ? '处理中...' : '批量处理'}
              </button>
              <button className="secondary-button" onClick={handleOpenOutputFolder} disabled={!outputFolder}>
                打开输出目录
              </button>
            </div>
          </section>

          <section className="panel preview-panel">
            <div className="panel-header">
              <h3>预览检查：{previewTitle}</h3>
              <div className="segmented">
                <button
                  className={previewBackground === 'checker' ? 'active' : ''}
                  onClick={() => setPreviewBackground('checker')}
                >
                  棋盘格
                </button>
                <button
                  className={previewBackground === 'black' ? 'active' : ''}
                  onClick={() => setPreviewBackground('black')}
                >
                  黑底
                </button>
                <button
                  className={previewBackground === 'white' ? 'active' : ''}
                  onClick={() => setPreviewBackground('white')}
                >
                  白底
                </button>
                <button
                  className={previewBackground === 'gray' ? 'active' : ''}
                  onClick={() => setPreviewBackground('gray')}
                >
                  灰底
                </button>
              </div>
            </div>

            <div className={`preview-stage ${previewBackground}`}>
              {previewImages[activePreviewTab] ? (
                <img
                  className="preview-image"
                  src={previewImages[activePreviewTab]}
                  alt={`${activePreviewTab} preview`}
                />
              ) : (
                <div className="preview-empty">
                  <strong>等待预览</strong>
                  <p>当前标签：{previewTitle}</p>
                </div>
              )}
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
                  onChange={(event) => handlePlaybackFpsChange(Number(event.target.value))}
                />
              </label>

              <div className="playback-status">
                {frameFiles.length > 0
                  ? `${isPlaying ? '播放中' : '已暂停'} · ${previewTitle} · ${currentFrameIndex + 1} / ${frameFiles.length} · 循环`
                  : '等待序列帧'}
              </div>
            </div>
            <div className="preview-tabs">
              <button
                className={activePreviewTab === 'original' ? 'active' : ''}
                onClick={() => setActivePreviewTab('original')}
              >
                原图
              </button>
              <button
                className={activePreviewTab === 'raw' ? 'active' : ''}
                onClick={() => setActivePreviewTab('raw')}
              >
                Raw
              </button>
              <button
                className={activePreviewTab === 'soft' ? 'active' : ''}
                onClick={() => setActivePreviewTab('soft')}
              >
                Soft
              </button>
            </div>
          </section>

          <section className="panel log-panel">
            <div className="panel-header">
              <h3>处理日志</h3>
              <span>Logs</span>
            </div>

            <div className="logs">
              {logs.map((line, index) => (
                <div key={`${line}-${index}`} className="log-line">
                  {line}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

export default App