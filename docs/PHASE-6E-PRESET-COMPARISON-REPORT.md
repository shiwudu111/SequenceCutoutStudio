# Phase 6E-3 Preset Comparison Report

日期：2026-06-15

## 1. 本次目标

本次只做离线预设视觉对比：

```text
复用已有 Raw 结果。
生成 detail_keep / soft_c / balanced_f / clean_i 四组 Soft 对比。
生成 contact sheet，方便人工判断预设差异。
不修改 app 默认参数。
不修改模型。
不重新打绿色包。
```

## 2. 输入与输出

输入目录：

```text
E:\cuts\test
release\phase-6e-2-preset-compare
```

生成脚本：

```text
scripts/phase_6e_build_contact_sheets.py
```

生成命令：

```powershell
.\portable-root\tools\python\python.exe scripts\phase_6e_build_contact_sheets.py
```

输出目录：

```text
release\phase-6e-3-preset-contact-sheets
```

生成文件：

```text
04简单背景_12fps_4s.png
07低明度低对比背景_12fps_4s.png
09毛发测试_12fps_4s.png
10发光法术_12fps_4s.png
12透明布料_12fps_4s.png
contact_sheet_index.md
```

## 3. 对比列说明

每张 contact sheet 从左到右为：

```text
original
raw
detail_keep
soft_c
balanced_f
clean_i
```

其中：

| 变体 | alphaLow | shrink | 用途 |
| --- | ---: | ---: | --- |
| detail_keep | 18 | 0.20 | 细节保留候选 |
| soft_c | 24 | 0.35 | 柔和边缘 C |
| balanced_f | 36 | 0.58 | 标准边缘 F |
| clean_i | 48 | 0.78 | 干净收边 I |

## 4. 人工观察结论

### 04 简单背景

```text
当前 Raw 已经较干净。
四组 Soft 参数差异较小。
detail_keep 没有明显带来决定性优势。
clean_i 没有明显破坏主体。
```

结论：

```text
当前默认 I 在简单背景中仍可保留。
```

### 07 低明度低对比

```text
主体和背景接近时，Raw 阶段已经决定主要结果。
Soft 参数只改变边缘收缩程度，不能从根本上恢复被误删的暗部细节。
```

结论：

```text
低对比问题不能靠 Soft 参数解决。
后续如果要优化，应进入模型候选或输入预处理验证，而不是只调收边参数。
```

### 09 毛发测试

```text
Raw 对毛发主体保留基本可用。
Soft 参数之间主要影响毛发边缘的收缩和细碎边缘。
clean_i 更干净，但可能牺牲少量细毛。
detail_keep 更保守，但没有明显成为更好的默认方案。
```

结论：

```text
毛发可以考虑后续做“细节保留”高级预设，但不建议替换当前默认 I。
```

### 10 发光法术

```text
第 25 / 30 帧附近的主体缺失在 Raw 阶段已经出现。
四组 Soft 结果都无法把被 Raw 去掉的身体区域补回来。
Soft 参数只能处理边缘，不具备恢复主体语义的能力。
```

结论：

```text
发光 / 半透明法术类问题属于 Raw 模型能力边界。
不能通过当前 Soft 预设优化解决。
质量验收继续标出疑似问题帧是正确方向。
```

### 12 透明布料

```text
Raw 已能保留大体主体，但透明布料与背景、半透明层之间仍有明显不确定性。
Soft 参数差异可见，但不能保证半透明材质的真实 alpha。
```

结论：

```text
透明布料不应作为当前正式版默认能力承诺。
后续如优化，应作为高级实验方向或模型对比方向。
```

## 5. Phase 6E-3 判断

本次对比支持以下判断：

```text
1. 仅调整 Soft 参数，不能修复 Raw 阶段误删主体的问题。
2. 当前 clean_i 仍适合作为“默认干净收边”方案。
3. detail_keep 可以保留为后续高级预设候选，但当前证据不足以替换默认 I。
4. 低对比、发光半透明、透明布料需要模型或预处理方向验证，不应靠收边参数承诺解决。
5. 正式版前不建议在 UI 中新增复杂模型选择，避免扩大风险。
```

## 6. 下一步建议

Phase 6E-4 建议只做决策收束：

```text
确认正式版默认仍使用 isnet-general-use + clean_i。
将 detail_keep 记录为后续高级预设候选。
暂不接入新模型。
把低对比 / 发光半透明 / 透明布料写入发布前能力边界说明。
然后转入 Phase 6F 正式发布稳定性补强。
```

补充决策：

```text
高级模型选择、细节保留预设和不同素材类型模型推荐，不进入正式版前主线。
这些能力转入正式版后功能迭代，并可与后续会员升级功能合并规划。
```
