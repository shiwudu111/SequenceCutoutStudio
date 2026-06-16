import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const WINDOWS_SAFE_EXPORT_PATH_LIMIT = 240
const EXPORT_FREE_SPACE_BUFFER_BYTES = 50 * 1024 * 1024
const EXPORT_FREE_SPACE_MULTIPLIER = 1.1

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function assertWritableDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
  const testFile = path.join(
    dirPath,
    `.scs-write-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`
  )
  await fs.writeFile(testFile, 'ok', 'utf8')
  await fs.unlink(testFile)
}

async function getAvailableExportDir(targetRootDir, baseName) {
  const baseDir = path.join(targetRootDir, baseName)

  if (!(await pathExists(baseDir))) {
    return baseDir
  }

  for (let index = 2; index <= 99; index += 1) {
    const candidate = `${baseDir}_${String(index).padStart(2, '0')}`

    if (!(await pathExists(candidate))) {
      return candidate
    }
  }

  throw new Error('导出目录已存在较多同名结果，请清理旧导出目录后再试。')
}

function assertSafeExportPathLength(pathsToCheck) {
  if (process.platform !== 'win32') {
    return
  }

  const longestPath = pathsToCheck.reduce((currentLongest, currentPath) =>
    currentPath.length > currentLongest.length ? currentPath : currentLongest
  )

  if (longestPath.length <= WINDOWS_SAFE_EXPORT_PATH_LIMIT) {
    return
  }

  throw new Error(
    `导出路径过长，请选择更短的导出位置或缩短命名前缀。当前最长路径约 ${longestPath.length} 个字符。`
  )
}

async function assertEnoughFreeSpace(dirPath, requiredBytes) {
  const requiredWithBuffer = Math.ceil(requiredBytes * EXPORT_FREE_SPACE_MULTIPLIER) + EXPORT_FREE_SPACE_BUFFER_BYTES
  const stats = await fs.statfs(dirPath)
  const availableBytes = Number(stats.bavail) * Number(stats.bsize)

  if (availableBytes < requiredWithBuffer) {
    throw new Error(`not enough free space: required=${requiredWithBuffer} available=${availableBytes}`)
  }

  return {
    requiredWithBuffer,
    availableBytes
  }
}

async function main() {
  const root = path.join(os.tmpdir(), `scs-phase-6f-${Date.now()}`)
  const normalRoot = path.join(root, '中文 路径 export target')
  const baseName = '角色 序列_transparent_png_20260615_120000'

  await assertWritableDirectory(normalRoot)
  const firstDir = await getAvailableExportDir(normalRoot, baseName)
  await fs.mkdir(firstDir, { recursive: true })
  const secondDir = await getAvailableExportDir(normalRoot, baseName)

  assert(secondDir.endsWith('_02'), 'existing output directory should receive _02 suffix')
  assert(secondDir.includes('中文 路径'), 'unicode and space path should be preserved')

  const okFile = path.join(secondDir, 'frame_0001.png')
  assertSafeExportPathLength([secondDir, okFile])
  const spaceCheck = await assertEnoughFreeSpace(normalRoot, 1024)
  assert(spaceCheck.availableBytes >= spaceCheck.requiredWithBuffer, 'space check should pass for small export')

  const longRoot = path.join(root, 'long', 'x'.repeat(220))
  const longFile = path.join(longRoot, 'frame_0001.png')
  let longPathRejected = false

  try {
    assertSafeExportPathLength([longFile])
  } catch {
    longPathRejected = true
  }

  assert(longPathRejected || process.platform !== 'win32', 'long Windows export path should be rejected')

  const fileAsTarget = path.join(root, 'not-a-dir.txt')
  await fs.mkdir(root, { recursive: true })
  await fs.writeFile(fileAsTarget, 'not a directory', 'utf8')

  let fileTargetRejected = false

  try {
    await assertWritableDirectory(fileAsTarget)
  } catch {
    fileTargetRejected = true
  }

  assert(fileTargetRejected, 'file path must not be accepted as export directory')

  await fs.rm(root, { recursive: true, force: true })

  console.log('phase-6f export path checks passed')
  console.log(`checked unicode/space dir, existing dir suffix, long path guard, invalid target rejection, disk space check`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exitCode = 1
})
