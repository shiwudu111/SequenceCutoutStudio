# Sequence Cutout Studio 内测交付说明

版本：0.4.0-internal.1

交付文件：

```text
release/SequenceCutoutStudio-Internal-v0.4.0-internal.1-win-x64.zip
```

当前 zip 大小约为 552.75 MB。

---

## 1. 启动方式

1. 解压 zip 到一个普通英文路径，例如 `D:\Tools\SequenceCutoutStudio-Internal`。
2. 打开解压后的文件夹。
3. 双击顶层的 `SequenceCutoutStudio-Internal.exe`。
4. 等待启动页结束后进入主界面。

不要直接运行 `app/SequenceCutoutStudio.exe`。

首次启动可能需要 30-60 秒，请不要重复双击。

---

## 2. 推荐验收流程

请按下面顺序测试：

```text
1. 启动软件
2. 等待启动自检通过
3. 选择 sample_video.mp4
4. 视频切序列帧
5. 单帧测试
6. 批量处理
7. 预览 Raw / Soft
8. 只重跑边缘
9. 导出 PNG 序列
10. 关闭软件后重新打开一次
```

重点观察：

```text
启动页是否正常显示
主界面是否能打开
启动自检是否通过
视频切帧是否成功
Raw / Soft 是否能预览
批量处理是否能完成
导出 PNG 序列是否生成正确文件
失败时日志是否能看懂
```

---

## 3. 已知边界

当前内测版本优先验证本地绿色包和核心处理链路。

已知边界：

```text
不包含安装器
不包含自动更新
不包含账号系统
不包含云端处理
不包含任务队列取消
不包含完整缓存清理
不包含 Sprite Sheet / plist / TexturePacker 导出
```

导出系统当前支持：

```text
透明 PNG 序列
自定义前缀
起始编号
补零位数
manifest.json 映射记录
```

---

## 4. 反馈方式

反馈问题时，请优先提供：

```text
软件版本
zip 文件名
电脑系统
是否是干净电脑
具体操作步骤
实际结果
期望结果
处理日志里的相关几行
是否可以提供测试素材
```

反馈模板见：

```text
docs/INTERNAL-FEEDBACK.md
```

不要直接发送公司敏感素材。必要时请用裁剪后、脱敏后或可公开的测试素材复现。
