# samples/ 目录说明

> 本文档为中文。
> English version: [samples_en.md](samples_en.md)

## 目录

1. [目录内容总览](#目录内容总览)
2. [samples.7z（谱面压缩包）](#samples7z谱面压缩包)
3. [Disclaimer.md（免责声明）](#disclaimermd免责声明)
4. [data.csv 字段说明](#datacsv-字段说明)
5. [与 runner 的衔接](#与-runner-的衔接)

`samples/` 是 benchmark 的输入数据目录，存放测试谱面与基准结果表格。本文档说明目录里有什么、每个文件是干什么的，以及 `data.csv` 中每个字段的确切含义。

---

## 目录内容总览

| 文件 | 说明 |
|---|---|
| `data.csv` | 基准结果表格，记录每张谱面的元信息、参考难度与算法输出 |
| `Disclaimer.md` | 免责声明（中英双语），说明谱面版权归属与使用限制 |
| `samples.7z` | 谱面压缩包，内含全部测试谱面，按键型分类打包 |

`.gitignore` 中忽略了以下 6 个目录：

- `samples/course`
- `samples/jack`
- `samples/ln`
- `samples/speed`
- `samples/stamina`
- `samples/tech`

这些目录是 `samples.7z` 解压后的产物，里面是按按键型分类的 `.osu` 谱面文件。它们体积大且可随时由压缩包重新生成，因此被 git 忽略，不会进入版本库。

---

## samples.7z（谱面压缩包）

`samples.7z` 是测试谱面的来源。压缩包内是按键型分类的 `.osu` 谱面，分类方式与 `data.csv` 的 `pattern` 字段一一对应（course / jack / ln / speed / stamina / tech）。

### 下载与使用

- 克隆仓库时，`samples.7z` 会随仓库一并下载。
- 运行 benchmark 前，需要先解压：

```
7z x samples.7z -osamples
```

- 解压后得到 `samples/course/`、`samples/jack/`、`samples/ln/`、`samples/speed/`、`samples/stamina/`、`samples/tech/` 六个目录，不会污染 git 状态。
- 也可以只解压需要的按键型子目录，runner 部分分类。

### 压缩包内分类与目录的对应关系

`samples.7z` 内部的目录结构与解压目标完全一致，每个目录对应 `data.csv` 中的一种 `pattern`：

| 解压目录 | 对应 pattern |
|---|---|
| `samples/course/` | course |
| `samples/jack/` | jack |
| `samples/ln/` | ln |
| `samples/speed/` | speed |
| `samples/stamina/` | stamina |
| `samples/tech/` | tech |

### 典型使用流程

```
1. 克隆仓库（随仓库获得 samples.7z）
2. 解压：7z x samples.7z -osamples
3. 阅读 samples/Disclaimer.md 确认使用条件
4. 编写并运行 runner（详见 [docs/runner.md](runner.md)）
5. 查看 results/ 下的输出
6. 进入网页上传结果。
```

---

## Disclaimer.md（免责声明）

`samples/` 内还包含一份中英双语的免责声明文件。要点如下：

- 目录内谱面由其他玩家制作，或来自测试谱面与官网谱面样本，仅用于功能测试、算法验证、误差排查和 benchmark 对比。
- 谱面版权与相关权利属于原作者、整理者或合法权利人；本项目不主张所有权，也不代表对谱面内容或难度设计的认同。
- 使用这些谱面不构成再发布、商业使用或权利转让。
- 若你是谱面作者且不希望作品被用于此类测试，可联系项目维护者处理。
- 使用者应自行确认素材与数据的使用权限，遵守社区规范与适用法律法规，下载后 24 小时内删除相关文件。

完整条款请阅读 `samples/Disclaimer.md` 原文。

---

## data.csv 字段说明

`data.csv` 是 benchmark 的核心结果表格，表头为：

```
bid,name,pattern,subPattern,expected,got,delta,deltaAbs
```

字段含义逐项说明如下。

### bid —— 谱面 ID

谱面在 osu! 网站上的唯一 ID，可选字段。

- 该字段可用于 runner 直接从 osu! 网站下载谱面，填写后在网页中可点击下载按钮直接下载对应谱面。
- 是否填写不影响 runner 运行，属可选字段。

注意不填写时开头需要有一个逗号。

### name —— 谱面显示名

谱面的显示名称，用于在结果中标识是哪一张谱面。

- 部分名称带有 `x1.35`、`x1.25`、`x0.95` 之类的倍速后缀，例如 `Grinding Of The Teeth x1.35`。
- 注意：倍速后缀只是文件名标识，用于区分同一谱面的不同速率版本，**不是** runner 运行时实际施加的 mod。实际运行不应应用任何倍速。


### pattern —— 主键型分类

谱面的主分类，决定它属于哪种按键型 benchmark。
runner 可依据该字段决定对谱面调用哪一类算法流程，也用于按分类输出统计结果。

### subPattern —— 子分类

在主分类之下更细的键型描述，例如 `stream tech`、`high chordjack`、`dense handstream`、`mid stream` 等。

- 未设置子分类的行，该字段为字面量 `Unsigned`。
- 子分类用于 finer 粒度对比：同一 `pattern` 下不同 `subPattern` 的谱面，难度曲线的行为可能差异很大。

### expected —— 参考难度

谱面由基准数据给出的参考难度，即"正确答案"，来自段位谱面集合的数值化难度。

数值化难度定义见[docs/runner.md](runner.md) 的第 3 节。

- `expected` 与 `got` 共用同一套数值化难度概念，二者的差值就是算法误差的来源。
- 该字段由数据集提供，runner 不应修改它。

### got —— 算法输出

算法对同一张谱面实际计算出的数值化难度，由 runner 运行后填写。

- 与 `expected` 单位一致，可直接比较。
- 数值越接近 `expected`，说明算法对该谱面的估算越准。

### delta —— 误差（有符号）

算法误差的有符号形式：

```
delta = expected - got
```

- 正值表示算法低估（`got` 小于参考难度），负值表示算法高估。
- 例如 `expected = 18`、`got = 17.75` 时 `delta = 0.25`，表示算法低估了 0.25。

### deltaAbs —— 绝对误差

`delta` 的绝对值，衡量误差大小而不关心方向：

```
deltaAbs = |delta|
```

- 用于统计平均绝对误差等指标，避免正负误差相互抵消。
- 例如 `delta = 0.25` 与 `delta = -0.04` 的 `deltaAbs` 分别为 `0.25` 与 `0.04`。


### 示例行

```
,Grinding Of The Teeth x1.35,tech,stream tech,18,17.75,0.25,0.25
3755310,Death Melody(e8v2) x1.25,stamina,dense handstream,14.5,14.65,-0.15,0.15
```

---

## 与 runner 的衔接

- **数值化难度概念**：`expected` 与 `got` 使用的数值化难度的完整定义、换算与来源见 [runner.md](runner.md)，本文档不展开。
- **数据流向**：

```
samples/data.csv（expected 参考难度）
        │
        ▼
runner（读取谱面 + 运行算法，计算 got/delta/deltaAbs）
        │
        ▼
results/（算法输出与统计结果）
```

简单说：runner 从 `samples/` 读取谱面文件与 `data.csv` 中的参考难度，运行各算法得到 `got`，再算出 `delta` 与 `deltaAbs` 回填结果，最终产出到 `results/`。
