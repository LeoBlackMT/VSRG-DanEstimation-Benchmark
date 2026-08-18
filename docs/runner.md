# Benchmark Runner 编写指南（中文）

> English version: [runner_en.md](runner_en.md).

---

## 目录

1. [概述](#1-概述)
2. [运行流程总览](#2-运行流程总览)
3. [数值化难度定义](#3-数值化难度定义)
4. [输出 CSV 规范](#4-输出-csv-规范)
5. [results/index.json 规范](#5-resultsindexjson-规范)
6. [运行约定](#6-运行约定)
7. [编写自查清单](#7-编写自查清单)

---

## 1. 概述

由于不同算法风格各异，无法使用通用脚本，因此本仓库不分发任何 runner 脚本。本文档是一份 runner **编写指南**：它说明基准测试的完整运行流程、输入输出格式，以及编写 runner 时必须遵守的约定。你可以用任何语言（Node.js、Python 等）自己实现一个 runner，只要产出符合本文件规定的格式，结果就可以被本仓库的展示页正常读取。

配套的输入输出文件如下：

| 文件 | 作用 |
|---|---|
| `samples/data.csv` | 输入清单（osu! + Malody 合并），每行一条谱面记录 |
| `samples/osu.csv` | osu! 子集（可选，仅供查看） |
| `samples/malody.csv` | Malody 子集（可选，仅供查看） |
| `samples/{pattern}/{name}.osu` | 谱面文件，按模式与名称分目录存放（需自行解压`samples.7z`） |
| `results/{Algorithm}.csv` | 每个算法一份结果表 |
| `results/index.json` | 结果目录的索引，供展示页读取 |

---

## 2. 运行流程总览

```
samples/data.csv ──────────────┐
samples/{pattern}/{name}.osu ──┼──►  逐行运行估计算法  ──►  results/{Algorithm}.csv
                               │
                               └────────────────────────►  results/index.json
```

完整流程分为六步：

1. **读取输入清单**：读取 `samples/data.csv`，每一行是一条谱面记录，包含 `bid / name / pattern / subPattern / expected` 等字段。
2. **定位谱面文件**：根据行内的 `pattern` 与 `name`，按匹配规则找到 `samples/{pattern}/{name}.osu`（匹配规则见 [6.2](#62-谱面匹配规则)）。
3. **计算数值化难度**：用选定的估计算法分析谱面，计算数值化难度作为 `got` 值（定义见第 3 章）。
4. **计算误差**：当 `expected` 与 `got` 均为数字时，计算 `delta = expected - got` 与 `deltaAbs = |delta|`。
5. **写结果表**：每个算法生成一份 `results/{Algorithm}.csv`，复制`data.csv`并只覆盖 `got / delta / deltaAbs` 三列。
6. **更新索引**：扫描结果目录，生成（或覆盖）`results/index.json`，并补充 `source` 键（见 5.3）。

---

## 3. 数值化难度定义

### 3.1 什么是数值化难度

数值化难度是用于将段位转换为数字的量纲。它是一个浮点数，通常在 0–20 之间，表示谱面的难度大小。请使用基于 [Reform](https://www.danreform.com/) by DDMythical 段位体系进行标注。其中，Zeta 使用 Emik 的 Sample Zeta 版本，Eta 使用 Thaumiel 的版本，Theta 使用 CloverWisp 的版本。
1st dan 对应 1.0，2nd dan 对应 2.0，依此类推。希腊字母部分 alpha 对应 11.0， beta 对应 12.0，以此类推。Intro 部分，Intro-1 ~ 3 分别对应 0, -1, -2。
具体的数值化难度细分可参考下表：
| (-0.5,-0.2) | [-0.2,0) | 0 | (0,0.2] | (0.2,0.5] |
|---|---|---|---|---|
| Low | Low/Mid | Mid | Mid/High | High |

估计器分析一张谱面后，会产出估计难度结果。如果你的算法也使用数字作为难度表示，直接转换为本项目兼容的数值化难度即可；如果直接输出估计段位字符串，需要手动映射到数值化难度。

### 3.2 expected 与 got 都使用数值化难度

结果表里有两个关键列，二者都使用数值化难度这一概念：

- `expected`：**参考数值化难度**。来自谱面所属段位来源给出的目标值，代表"这张谱面应该有多难"。
- `got`：**算法输出的数值化难度**。runner 需要把估计器的结果写入这一列，代表"算法认为这张谱面有多难"。

两列处于同一个数值尺度上，误差统计才有意义。编写 runner 时必须保证自己写入的 `got` 与输入文件里的 `expected` 使用同一种定义，否则误差数字毫无可比性。

### 3.3 惯例差异警告

不同项目对"数值化难度"与"段位难度"之间的映射存在不同的看法，直接套用别的项目的数值可能得出错误结论。其中一种常见的差异是：**部分其他项目定义的数值化难度 = 本项目定义的数值化难度 + 0.5**。

[DanOverlay](https://github.com/acarranzao1a-png/Dan-Overlay/) 的 DP 就是这一惯例的实例，它的数值化难度尺度与本仓库相差 0.5。其定义如下：
| [0,+0.2] | (+0.2,+0.4] | (+0.4,+0.6] | (+0.6,+0.8] | (+0.8,+1.0) |
|---|---|---|---|---|
| Low | Low/Mid | Mid | Mid/High | High |

因此编写 runner 时，你必须：

- **明确自己采用哪种定义**, 并在输出`got`时进行转换；
- **在整个基准测试中保持一致**，不能某些行用一种定义、另一些行用另一种。

混用两种尺度会导致误差统计完全错误。

### 3.4 本项目不提供映射表

**本项目不展示任何映射定义表**。段位到数值化难度的具体换算属于各算法、各项目内部的约定，本仓库的文档不展开这些细节。如果你需要了解某套段位体系的换算，请查阅该体系的原始来源，而不是期望在本仓库找到对照表。

---

## 4. 输出 CSV 规范

csv 的详细介绍见 [docs/samples.md](samples.md#datacsv-字段说明)。

### 4.1 表头（8 列，固定）

```
bid,name,pattern,subPattern,expected,got,delta,deltaAbs
```

各列含义：

| 列 | 含义 |
|---|---|
| `bid` | 谱面 ID，可为空 |
| `name` | 谱面名 |
| `pattern` | 主模式分类（如 rc / ln） |
| `subPattern` | 子模式分类（如 stream tech / light jumpstream） |
| `expected` | 参考数值化难度 |
| `got` | 算法输出的数值化难度，或错误标记 |
| `delta` | `expected - got` |
| `deltaAbs` | `\|delta\|` |

### 4.2 runner 只覆盖三列

runner 只需要写入（覆盖）三列：

- `got`
- `delta`
- `deltaAbs`

其余列（`bid / name / pattern / subPattern / expected`）来自 `samples/data.csv`，runner 应当**原样保留，不做修改**。推荐的实现方式是：逐行读取 data.csv，计算后只更新这三列，其余字段透传写出。
`got` 列将在网页中自动转换为段位字符串显示，`delta` 与 `deltaAbs` 列用于误差统计。

### 4.3 错误标记约定

当某一行无法得到有效的数值化难度时，在 `got` 列写入以下字符串之一：

- `Invalid`：算法明确判定该谱面不适用（例如当前模式不在算法支持范围内）。
- `Missing`：按匹配规则找不到对应的谱面文件。
- `Failed`：算法执行失败，或输出无法解析为数字。

错误行的 `delta` 与 `deltaAbs` 保持为空。**错误行不参与任何统计**：MAE、RMSE 等指标只基于 `expected` 与 `got` 均为数字的行计算，错误行保留在 CSV 中仅用于排查。

### 4.4 delta 与 deltaAbs

仅当 `expected` 与 `got` 都是有效数字时：

- `delta = expected - got`
- `deltaAbs = |delta|`

只要其中一列缺失、为空或不是数字，这两列就留空，不写任何内容。

---

## 5. results/index.json 规范

`results/index.json` 是结果目录的索引，供展示页读取。可以在每次 benchmark 运行结束后由 runner 生成（更新式写入）或手动维护。

### 5.1 顶层字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `generatedAt` | 字符串 | 生成时间，ISO 8601 格式（如 `2026-08-03T07:46:01.000Z`） |
| `algorithms` | 字符串数组 | 算法名列表，按字母序排列，由 `files` 推导 |
| `files` | 对象数组 | 每个结果 CSV 对应一个条目 |

不应修改与当前 runner 算法无关的算法条目。

### 5.2 files[] 条目

`files[]` 数组中的每个条目包含以下字段：

- `fileName`：CSV 文件名（如 `Sunny.csv`）。
- `algorithm`：算法名，即去掉 `.csv` 后缀的文件名。
- `sizeBytes`：文件大小（字节）。
- `modifiedAt`：文件最后修改时间，ISO 8601 格式字符串。

`algorithms` 数组由 `files` 的 `algorithm` 字段推导并排序得到。

### 5.3 source 键（手动维护，重要）

`files[]` 条目可以附加一个可选的 **`source` 键**，表示该算法结果的来源链接（例如算法主页）。
当当前算法存在该键时，网页将在按钮行前显示"算法来源"按钮，点击后在新标签页打开该链接。条目没有 `source` 键时，不显示该按钮。
当自行维护不考虑上传时，`source` 键可以留空或不写。

关于 `source` 键的重要提示：

1. **它是手动维护的字段**：runner 生成 index.json 时不应自行写入/修改 `source`，它由维护者在生成后手动添加。
2. **重新生成可能丢失**：如果runner 每次以覆盖方式写 index.json，**重新生成会覆盖整个文件**，已手动添加的 `source` 键会全部消失。因此，建议采用更新式写入，保留已有条目，只更新当前算法的条目。
3. **提交PR必须包含source键**：如果你想在网页上显示算法来源按钮，必须在提交 PR 时在 index.json 中为你的算法条目添加 `source` 键。

带 `source` 键的条目示例：

```json
{
  "fileName": "example.csv",
  "algorithm": "example",
  "sizeBytes": 114514,
  "modifiedAt": "2026-06-07T10:44:32.000Z",
  "source": "https://example.com/example-algorithm"
}
```

---

## 6. 运行约定

### 6.1 倍速固定为 1.0

所有 benchmark 一律以原生倍速（1.0x）计算，不施加任何速度 mod。谱面文件名中的 `x1.2`、`x1.35` 等后缀仅为标识，用来区分同一份谱面的不同倍速分类，**不是**运行时的倍速参数。runner 不得依据文件名中的倍速标识调整计算倍速。

### 6.2 谱面匹配规则

查找谱面文件时按以下优先级：

1. **精确路径**：`samples/{pattern}/{name}.osu`，与 data.csv 中的 pattern 和 name 完全一致。
2. **标准化名称**：对文件名做标准化（去除多余空白、统一大小写等）后再做精确匹配。
3. **容错匹配**：支持 `Name(...)` 与 `Name (...)` 形式，即谱面名后跟括号备注的情况。
4. 以上都找不到，该行标记为 `Missing`。

### 6.3 控制台输出建议

runner 运行时建议为每一行输出一个状态，便于快速定位问题：

- `OK`：正常得到数值结果。
- `Invalid`：该行被判定为不适用。
- `Missing`：谱面文件缺失。
- `Failed`：执行失败或输出无法解析。

运行结束时输出每个算法的汇总：

- `ok`：成功行数
- `invalid`：无效行数
- `missing`：缺失行数
- `failed`：失败行数
- `total`：总行数

`ok + invalid + missing + failed` 应等于 `total`，也等于 data.csv 的总行数。若不等，说明有行被遗漏处理。

---

## 7. 编写自查清单

实现完成后，对照以下清单逐项确认：

- [ ] 输出 CSV 使用固定的 8 列表头：`bid,name,pattern,subPattern,expected,got,delta,deltaAbs`。
- [ ] 只覆盖 `got / delta / deltaAbs` 三列，其余列原样保留。
- [ ] `got` 写入的是本项目适配的数值化难度字段，与 `expected` 处于同一尺度。
- [ ] 已明确采用的数值化难度定义，并全程保持一致。
- [ ] 错误行使用 `Invalid / Missing / Failed` 标记，`delta` 与 `deltaAbs` 留空，且不参与统计。
- [ ] `delta = expected - got`，`deltaAbs = |delta|`，仅当两者皆为数字时计算。
- [ ] 倍速固定 1.0，忽略文件名中的倍速标识。
- [ ] 谱面匹配遵循 精确路径 → 标准化名称 → `Name(...)` 容错 的优先级。
- [ ] index.json 包含 `generatedAt / algorithms / files` 结构，`source` 键手动维护，重跑后重新添加。
