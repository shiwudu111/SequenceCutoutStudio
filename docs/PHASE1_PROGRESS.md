# Phase 1 MVP-1 Progress

## Version

v0.1.0-phase1-mvp

## Status

Phase 1 MVP-1 completed.

## Completed Checklist

- [x] 创建 Electron + React 项目
- [x] 实现主窗口布局
- [x] 实现视频文件选择
- [x] 实现序列帧文件夹选择
- [x] 实现素材信息扫描
- [x] 封装 ffmpeg 命令
- [x] 实现视频切帧 UI
- [x] 封装 rembg 命令
- [x] 实现批量抠图
- [x] 封装 postprocess 命令
- [x] 实现 H / I / Custom 选择
- [x] 实现单帧预览
- [x] 实现黑底 / 棋盘格 / 白底 / 灰底背景切换
- [x] 实现日志窗口
- [x] 实现打开输出目录
- [x] 优化三栏工作台排版

## Remaining Items

- [ ] 实现文件拖拽导入
- [ ] 实现单帧抠图

## Main Workflow

Video file
→ FFmpeg extract PNG sequence frames
→ Scan frame folder
→ Preview original frame
→ rembg batch cutout
→ postprocess edge cleanup
→ Preview Raw / Soft result
→ Check edge on checker / black / white / gray background
→ Open frame folder / output folder

## Local Core Dependencies

Core directory:

E:\cuts

FFmpeg:

D:\Program Files\FFmpeg\bin\ffmpeg.exe

rembg:

D:\Program Files\rembg\.venv\Scripts\rembg.exe

Python:

D:\Program Files\rembg\.venv\Scripts\python.exe

Postprocess script:

E:\cuts\postprocess\batch_clean_cutout_soft.py

Model directory:

D:\Program Files\rembg\models

## Verified Sample

Input video:

E:\cuts\samples\sample_video.mp4

Extracted frames:

E:\cuts\samples\sample_video_12fps_4s

Raw cutout:

E:\cuts\samples\sample_video_12fps_4s_general_raw

Final soft output:

E:\cuts\samples\sample_video_12fps_4s_soft_I

## Notes

PowerShell scripts are kept as debug tools only.

The Electron app directly calls:

- ffmpeg.exe
- rembg.exe
- python.exe batch_clean_cutout_soft.py

This avoids PowerShell ExecutionPolicy issues in normal GUI usage.
