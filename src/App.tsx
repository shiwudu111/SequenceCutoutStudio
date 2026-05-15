import { useState } from 'react'
import './App.css'

type Preset = 'H' | 'I' | 'Custom'
type PreviewBackground = 'checker' | 'black' | 'white' | 'gray'
type PreviewTab = 'original' | 'raw' | 'soft'

function App(): JSX.Element {
  const [inputPath, setInputPath] = useState('尚未选择素材')
  const [selectedFolder, setSelectedFolder] = useState('')
  const [selectedVideo, setSelectedVideo] = useState('')
  const [outputFolder, setOutputFolder] = useState('')
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
  const [logs, setLogs] = useState<string[]>([
    'Sequence Cutout Studio 已启动。',
    '当前阶段：Phase 1D - 单帧预览 + 黑底 / 棋盘格 / 白底 / 灰底检查。'
  ])

  const appendLog = (line: string): void => {
    setLogs((prev) => [...prev, line])
  }

  const joinWindowsPath = (folderPath: string, fileName: string): string => {
    return `${folderPath.replace(/[\\/]+$/, '')}\\${fileName}`
  }

  const loadPreviewImage = async (kind: PreviewTab, filePath: string): Promise<void> => {
    const result = await window.cutoutAPI.readImageAsDataUrl(filePath)

    if (!result.ok) {
      appendLog(`预览读取失败：${result.message ?? filePath}`)
      return
    }

    setPreviewImages((prev) => ({
      ...prev,
      [kind]: result.dataUrl
    }))

    appendLog(`预览已加载：${kind} → ${filePath}`)
  }

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
    setPreviewFrameName(result.firstFileName ?? '')
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

    if (result.firstFile) {
      await loadPreviewImage('original', result.firstFile)
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

  const handleSelectVideoFile = async (): Promise<void> => {
    appendLog('正在选择视频文件...')

    const videoPath = await window.cutoutAPI.selectVideoFile()

    if (!videoPath) {
      appendLog('已取消选择视频。')
      return
    }

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
    setPreviewFrameName('')
    setActivePreviewTab('original')
    setPreviewImages({
      original: '',
      raw: '',
      soft: ''
    })

    appendLog(`已选择视频：${videoPath}`)
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

    setOutputFolder(result.outputDir)
    appendLog(`Raw 目录：${result.rawDir}`)
    appendLog(`输出目录：${result.outputDir}`)

    if (previewFrameName) {
      const rawPreviewPath = joinWindowsPath(result.rawDir, previewFrameName)
      const softPreviewPath = joinWindowsPath(result.outputDir, previewFrameName)

      await loadPreviewImage('raw', rawPreviewPath)
      await loadPreviewImage('soft', softPreviewPath)
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
          <strong>Phase 1D</strong>
          <p>实现单帧预览，并支持多背景检查边缘。</p>
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

            <div className="drop-zone">
              <strong>拖入视频或 PNG 序列帧文件夹</strong>
              <p>当前支持选择视频文件并切成 PNG 序列帧，也支持直接选择 PNG 序列帧文件夹。</p>
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