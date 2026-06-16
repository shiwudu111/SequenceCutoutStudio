# Phase 6E 模型与预设优化验证计划

日期：2026-06-15  
目标：基于 Phase 6A 的质量边界，验证是否存在值得进入正式版前的模型、参数或预设优化方向。

---

## 1. 本阶段边界

Phase 6E 不直接改默认处理链路。

```text
不替换默认模型。
不把新模型直接打进绿色包。
不修改 rembg_runner 调用方式。
不恢复 .venv。
不调用 rembg.exe。
不改 UI 布局。
不承诺半透明 / 毛发 / 低对比素材完全自动解决。
```

当前稳定链路仍然是：

```text
Electron main.ts
↓
tools/python/python.exe
↓
tools/rembg_runner.py
↓
tools/Lib/site-packages/rembg
↓
isnet-general-use
↓
Raw 输出
↓
postprocess
↓
Soft 输出
```

---

## 2. 当前模型状态

当前随包模型文件：

| 模型文件 | 大小 | 状态 |
| --- | ---: | --- |
| `isnet-general-use.onnx` | 170.37 MB | 当前默认模型，已随包 |

当前 rembg 包可识别的模型名：

```text
birefnet-general
birefnet-general-lite
birefnet-portrait
birefnet-dis
birefnet-hrsod
birefnet-cod
birefnet-massive
isnet-anime
dis_custom
isnet-general-use
sam
silueta
u2net_cloth_seg
u2net_custom
u2net_human_seg
u2net
u2netp
bria-rmbg
ben_custom
```

重要判断：

```text
这些模型名“可识别”不等于当前绿色包已经可用。
当前绿色包只验证了 isnet-general-use。
其他模型如果要测试，需要先准备对应模型文件，并确认离线运行、包体大小、许可证和性能成本。
```

---

## 3. Phase 6A 质量边界复用

Phase 6A 已经确认：

```text
A / A-：02 绿色背景、04 简单背景、14 遮挡旋转
B / B-：01 白底角色、03 灰色背景、05 复杂室内背景、10 发光法术、11 尖角裙摆、13 快速运动
C / C-：06 复杂室外背景、07 低明度低对比背景、08 高明度低对比背景、09 毛发测试
D / D-：12 透明布料
```

核心问题归因：

```text
Raw 已经误删主体：Soft 无法补回。
Raw 边缘脏但主体完整：Soft 有优化空间。
Raw / Soft 单帧尚可但连续播放闪：需要序列级稳定性检查。
半透明布料、玻璃、烟雾和复杂光效：当前不应作为默认能力承诺。
```

---

## 4. rembg README 对本项目的取舍建议

参考仓库：

```text
https://github.com/theranajayant/rembg
```

README 对本项目有价值的信息：

```text
1. rembg 支持通过 -m 指定模型，但模型会下载并保存在用户目录 .u2net。
2. 批量文件夹处理使用 rembg p；视频流可走 rembg b，但当前项目已经有稳定的“切帧 → 批量 PNG”链路，暂不切换。
3. README 推荐批量处理时复用 new_session，这一点当前 rembg_runner.py 已经符合。
4. SAM 需要 prompt extras，例如 point prompt；它不适合当前“全自动批量处理”默认流程。
5. u2net_cloth_seg 是衣物解析，不是通用透明素材去背景；只适合作为透明布料专项观察，不适合作为默认模型。
6. silueta 是 u2net 的小体积版本，README 标注约 43 MB，可作为轻量对照。
7. isnet-anime 面向 anime character，高度贴近游戏 / 插画角色素材，应该进入第一轮优先候选。
8. BiRefNet general / general-lite 是通用新模型候选，但需要额外确认模型体积、离线可用性和包体影响。
9. GPU 方案依赖 onnxruntime-gpu / CUDA / cuDNN；当前绿色包目标是跨电脑本地稳定，正式版前不引入 GPU 依赖。
```

对 Phase 6E 的直接影响：

```text
第一轮不全量测试所有模型。
第一轮不测试 SAM。
第一轮不把 u2net_cloth_seg 当默认候选，只作为透明布料专项可选观察。
第一轮优先测试 isnet-general-use、isnet-anime、birefnet-general-lite / birefnet-general、silueta、u2net。
第一轮必须记录模型文件大小、离线运行方式和是否会显著增加绿色包体积。
```

---

## 5. 6E-1 实验样本选择

不重新扩大测试集，先从 `E:\cuts\test` 选 5 组代表样本：

| 优先级 | 样本 | 用途 | 判断重点 |
| --- | --- | --- | --- |
| P0 | 04 简单背景 | 稳定基准 | 新方案不能明显退化 |
| P0 | 07 低明度低对比 | 低对比弱项 | 是否减少主体误删 |
| P0 | 09 毛发测试 | 细节边缘弱项 | 毛发残留和闪烁是否改善 |
| P0 | 10 发光法术 | 半透明发光边界 | 是否减少身体误删和光效污染 |
| P0 | 12 透明布料 | 当前 D- 边界 | 判断是否仍不适合短期承诺 |

保留样本：

```text
02 绿色背景：用于验证纯色背景不退化。
13 快速运动：用于后续帧间稳定策略，不作为第一轮模型结论唯一依据。
```

---

## 6. 6E-1 验证维度

每个实验输出至少记录：

```text
模型 / 参数 / 预设名称
Raw 主体完整性
Raw 背景残留
Raw 帧间闪烁
Soft 边缘清理
Soft 是否进一步误删
透明 / 发光区域是否更合理
处理耗时
模型文件大小
是否适合进入默认流程
```

评级仍沿用 Phase 6A：

```text
A：可直接用于游戏透明序列素材
B：轻微修边后可用，适合内测
C：需要手工补图或换参数，暂不适合批量交付
D：当前流程不适合，应该进入后续专项优化
```

---

## 7. 可落地优化方向

第一轮只验证三类方向：

```text
方向 A：模型候选验证
用同一输入跑不同 Raw 模型，判断是否有模型明显减少主体误删。

方向 B：预设用途重命名
把 C / F / I 从强度字母转为用途预设，而不是继续让用户猜参数含义。

方向 C：细节保留预设
在不改默认 I 的前提下，设计一个更保守的 Soft 参数候选，用于毛发、尖角、细边缘复核。
```

暂不做：

```text
不做一键万能高级模式。
不做自动判断素材类型后切模型。
不做半透明专用算法承诺。
不做跨帧遮罩修复。
```

---

## 8. 第一轮模型候选

第一轮不做全量模型测试，只保留和项目素材最相关的候选：

| 模型 | 是否进入第一轮 | 原因 |
| --- | --- | --- |
| `isnet-general-use` | 是 | 当前默认基线，必须对照 |
| `isnet-anime` | 是 | README 标注为 anime character 高精度分割，贴近游戏 / 插画角色 |
| `birefnet-general-lite` | 是，优先 | 新通用轻量候选，先看质量 / 体积平衡 |
| `birefnet-general` | 备选 | 如果 lite 明显不足，再测完整版 |
| `silueta` | 是 | 小体积 u2net 对照，适合验证轻量方案是否可接受 |
| `u2net` | 是 | 经典通用对照 |
| `u2netp` | 备选 | 更轻量，但若质量明显低于 silueta / u2net 可后置 |
| `u2net_human_seg` | 后置 | 人像模型，不适合作为游戏素材默认模型 |
| `u2net_cloth_seg` | 专项可选 | 只对 12 透明布料做观察，不作为默认候选 |
| `sam` | 暂不测 | 需要 prompt，不匹配当前全自动批量流程 |
| `*_custom` | 不测 | 需要自定义模型文件，不是现成候选 |
| `birefnet-portrait / hrsod / dis / cod / massive` | 后置 | 任务更专项或成本不明，等第一轮结论后再决定 |

第一轮推荐模型组合：

```text
isnet-general-use
isnet-anime
birefnet-general-lite
silueta
u2net
```

如果 BiRefNet 模型准备成本过高，则第一轮降级为：

```text
isnet-general-use
isnet-anime
silueta
u2net
u2netp
```

---

## 9. 预设优化初稿

当前预设：

| 预设 | 当前含义 | alphaLow | shrink |
| --- | --- | ---: | ---: |
| C | 柔和边缘 | 24 | 0.35 |
| F | 标准边缘 | 36 | 0.58 |
| I | 干净收边 | 48 | 0.78 |

下一步候选用途：

| 用途名 | 目标用户理解 | 候选参数 | 风险 |
| --- | --- | --- | --- |
| 细节保留 | 少删主体，适合毛发 / 尖角复核 | 低 alphaLow、低 shrink | 背景残留可能增加 |
| 标准修边 | 默认平衡项 | 沿用 F 或当前 I 视结果决定 | 需要避免默认结果退化 |
| 干净去脏边 | 优先去黑边 / 脏边 | 高 alphaLow、高 shrink | 可能误删细节 |

当前判断：

```text
正式版前不急着改默认预设。
先用 04 / 07 / 09 / 10 / 12 做离线对比，再决定是否调整名称或默认项。
```

---

## 10. 下一小步

Phase 6E-2：

```text
建立离线模型 / 预设对比脚本或命令清单。
输入：E:\cuts\test 中 5 组代表样本。
输出：不进入正式 app 的本地对比目录。
要求：不修改默认 UI，不修改绿色包链路，不提交大模型和输出图片。
第一轮模型候选：isnet-general-use、isnet-anime、birefnet-general-lite、silueta、u2net。
```

---

## 11. Phase 6E-2 离线预设对比脚本

脚本：

```powershell
.\scripts\phase-6e-compare-presets.ps1
```

默认输入：

```text
E:\cuts\test
```

默认样本：

```text
04 简单背景
07 低明度低对比
09 毛发测试
10 发光法术
12 透明布料
```

默认输出：

```text
release\phase-6e-2-preset-compare
```

默认对比项：

| 对比项 | 用途 | alphaLow | shrink |
| --- | --- | ---: | ---: |
| `detail_keep` | 细节保留候选 | 18 | 0.20 |
| `soft_c` | 柔和边缘 C | 24 | 0.35 |
| `balanced_f` | 标准边缘 F | 36 | 0.58 |
| `clean_i` | 干净收边 I | 48 | 0.78 |

说明：

```text
该脚本不跑 rembg。
该脚本复用 E:\cuts\test 中已有 general_raw 结果。
该脚本只调用 runtime-tools/postprocess/batch_clean_cutout_soft.py 生成多组 Soft 结果。
该脚本不会修改正式 app、默认预设、绿色包或 portable-root。
release\phase-6e-2-preset-compare 为本地验证产物，不进入 Git。
```

第一轮人工检查重点：

```text
04：确认细节保留候选不能明显比 clean_i 更脏。
07：观察低对比误删区域是否因更保守 Soft 变好或变差。
09：观察毛发周围背景残留与边缘颜色污染。
10：观察第 25-30 帧身体误删区域是否只是 Raw 问题，Soft 参数是否无法补回。
12：确认透明布料是否仍不适合默认流程承诺。
```

运行记录：

```text
执行命令：powershell.exe -ExecutionPolicy Bypass -File .\scripts\phase-6e-compare-presets.ps1
执行结果：通过。
样本数量：5 组。
预设变体：4 组。
总处理：5 x 4 x 48 = 960 帧。
输出目录：release\phase-6e-2-preset-compare
摘要文件：release\phase-6e-2-preset-compare\summary.json
```

处理结果摘要：

| 样本 | detail_keep | soft_c | balanced_f | clean_i |
| --- | ---: | ---: | ---: | ---: |
| 04 | 48 / 0 | 48 / 0 | 48 / 0 | 48 / 0 |
| 07 | 48 / 0 | 48 / 0 | 48 / 0 | 48 / 0 |
| 09 | 48 / 0 | 48 / 0 | 48 / 0 | 48 / 0 |
| 10 | 48 / 0 | 48 / 0 | 48 / 0 | 48 / 0 |
| 12 | 48 / 0 | 48 / 0 | 48 / 0 | 48 / 0 |

表格说明：

```text
格式为 处理帧 / 跳过帧。
本次只说明脚本和输出链路可用，不代表视觉质量已经优于默认 I。
下一步必须做 contact sheet 或人工视觉复核，尤其看 07 / 09 / 10 / 12。
```

Phase 6E-2 初步结论：

```text
离线预设对比流程成立。
当前可以不改 app，不改正式链路，先通过 release 下的本地产物判断预设方向。
是否调整 C / F / I 命名或新增“细节保留”预设，需要等视觉对比后决定。
```

---

## 12. Phase 6E-3 contact sheet 与预设结论

生成脚本：

```text
scripts/phase_6e_build_contact_sheets.py
```

运行命令：

```powershell
.\portable-root\tools\python\python.exe scripts\phase_6e_build_contact_sheets.py
```

输出目录：

```text
release\phase-6e-3-preset-contact-sheets
```

生成结果：

```text
5 张 contact sheet。
每张按 original / raw / detail_keep / soft_c / balanced_f / clean_i 横向对比。
10 发光法术额外纳入 sample_0025 与 sample_0030，用于检查此前确认的主体误删帧。
```

详细报告：

```text
docs/PHASE-6E-PRESET-COMPARISON-REPORT.md
```

本轮判断：

```text
clean_i 仍适合作为当前默认“干净收边”。
detail_keep 可以作为后续高级预设候选，但当前证据不足以替换默认 I。
低对比、发光半透明、透明布料的主要问题发生在 Raw 阶段，Soft 参数无法补回已经被误删的主体。
正式版前不建议为了这些边界问题临时新增复杂模型选择或改默认链路。
```

---

## 13. Phase 6E-4 正式版前决策

正式版前结论：

```text
不新增复杂模型选择。
不改默认模型链路。
不把 isnet-anime / silueta / u2net / BiRefNet 等候选模型接入正式 app。
默认继续使用 isnet-general-use + clean_i。
```

原因：

```text
Phase 6E-3 已确认多个关键问题发生在 Raw 阶段。
Soft 预设无法补回已经被 Raw 误删的主体。
临时新增模型选择会引入包体、离线可用性、处理速度、失败提示、用户理解成本和绿色包稳定性风险。
当前正式版目标是稳定上线，不是完成完整模型实验系统。
```

后续归属：

```text
高级模型选择。
细节保留预设。
不同素材类型的模型推荐。
更复杂的预设系统。
这些能力归入正式版后功能迭代，可与后续会员升级功能合并规划为增值能力。
```

正式版前需要做的是：

```text
在发布说明中明确低对比 / 发光半透明 / 透明布料的能力边界。
保留质量验收的问题帧提示和跳转复核。
进入 Phase 6F 正式发布稳定性补强。
```
