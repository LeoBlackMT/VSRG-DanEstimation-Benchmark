# VSRG-DanEstimation-Benchmark

**[English](README_EN.md) | 中文**

## 项目简介

本项目主要针对 VSRG 难度估算算法检验其准确度，在真实谱面数据上进行对比。

难度估算（Dan/Difficulty Estimation）是依据社区段位（Dan）体系对谱面进行难度标定的做法。此前，社区中已有多种算法用于估算谱面难度，但缺乏统一的评测标准与数据集。为此，本项目提供了人工标注的[谱面样本](samples/data.csv)、评测脚本的[编写方法](docs/runner.md)、以及可公开访问的[结果网页](https://benchmark.leoblack.top/)，供算法作者进行横向对比。由于不同估算算法对同一张谱面的判断可能相差巨大，本项目试图回答一个问题：**哪个算法在真实谱面上更准？**

本项目主要基于 [Reform](https://www.danreform.com/) by DDMythical 段位体系进行标注。其中，Zeta 使用 Emik 的 Sample Zeta 版本，Eta 使用 Thaumiel 的版本，Theta 使用 CloverWisp 的版本。

本项目迁移自原始项目[ManiaMapAnalyzer](https://github.com/LeoBlackMT/osumania_map_analyser)。

### 解决什么问题

- **横向对比**：让多种算法在完全相同的谱面样本上运行，产出可统一比较的结果。
- **真实数据**：全部基于社区真实谱面并人工进行段位标注。
- **清晰透明**：样本、结果数据全部公开，任何人都可以查看，也可以[提交新算法的结果](docs/algorithm.md)。

### 收录的算法

- **[Sunny](https://github.com/sunnyxxy/Star-Rating-Rebirth)** ~b6c1d89~ by [Crz]sunnyxxy：被广泛认可的星数算法，支持全部Keys/键型。大多数算法都基于 Sunny 进行改进。
- **[Daniel](https://github.com/TheBagelOfMan/Daniel)** ~v1.1~ by TheBagelOfMan：基于 Sunny 算法的改进版本。仅支持 4K RC。
- **[Azusa](https://github.com/LeoBlackMT/osumania_map_analyser/tree/main/docs/azusa_algorithm.md)** ~v2.1.0~ by LeoBlackMT：融合 Daniel 和 Sunny 的调校算法。仅支持 4K RC。
- **[Roxy](https://github.com/LeoBlackMT/osumania_map_analyser/tree/main/docs/roxy_algorithm.md)** ~v2.1.0~ by LeoBlackMT：元结构估算器。通过 Ridge 线性元模型融合 Azusa/Daniel 参考预测，聚焦高难区间（数值 11~17），仅支持 4K RC。
- **[Companella](https://github.com/Leinadix/companella)** ~v6.52~ by Leinadix：使用 onnx 模型基于 [Etterna](https://github.com/etternagame/etterna) MinaCalc 的 4K 段位估算。
- **[Mixed](https://github.com/LeoBlackMT/osumania_map_analyser)** ~v2.1.0~ by LeoBlackMT：综合上方算法的混合算法，自动根据谱面特征路由至最佳算法。主要应用于[ManiaMapAnalyzer](https://github.com/LeoBlackMT/osumania_map_analyser)项目中
- **[DanOverlay](https://github.com/acarranzao1a-png/Dan-Overlay/)** ~v3.1.0~ by acarranzao1a-png：基于 Sunny、Etterna MinaCalc 等算法，进行校准和修正后的算法。支持4K RC/LN和7K，支持段位体系 Reform/Celestial/Signicial/Shoegazer。

## Benchmark 结果

在线结果页面：[https://benchmark.leoblack.top/](https://benchmark.leoblack.top/)

网页由 `results/` 目录下的数据驱动，支持按算法、键型、难度区间查看准确性对比，包括误差分布、平均误差、偏差等指标。

## 仓库结构

| 路径 | 说明 |
|---|---|
| `samples/` | 含数据集 `data.csv`（osu! + Malody 合并）、`osu.csv`（osu! 子集）、`malody.csv`（Malody 子集）与打包后的谱面样本 `samples.7z`，按 `course / jack / ln / speed / stamina / tech` 分类。**注意**：谱面版权归原作者所有，使用请遵守 [samples/Disclaimer.md](samples/Disclaimer.md) |
| `results/` | 各算法的 Benchmark 结果数据（`*.csv`）与 `index.json` |
| `docs/` | 项目文档：样本说明、运行方法、算法介绍、国际化 |
| `assets/` | 网页资源（CSS、JS、字体、图片等） |
| `index.html` | Benchmark 结果网页入口 |

## 文档索引

| 文档 | 语言 | 说明 |
|---|---|---|
| [docs/samples.md](docs/samples.md) | 中文 | 样本目录说明 |
| [docs/samples_en.md](docs/samples_en.md) | English | Sample dataset documentation |
| [docs/runner.md](docs/runner.md) | 中文 | Benchmark runner 编写方法 |
| [docs/runner_en.md](docs/runner_en.md) | English | How to write the benchmark runner |
| [docs/algorithm.md](docs/algorithm.md) | 双语 | 结果提交指南 |
| [docs/i18n.md](docs/i18n.md) | 双语 | 国际化与本地化贡献指南 |

## 如何贡献

### 运行 Benchmark

运行方法与依赖说明见 [docs/runner.md](docs/runner.md)。

### 提交新算法结果

1. Fork 本仓库。
2. 按 [docs/algorithm.md](docs/algorithm.md) 的要求生成 CSV 文件。
3. 将结果放入 `results/`，并在 `index.json` 中注册。
4. 提交 Pull Request，说明算法的简介、原理、来源与参数设置。

### 提交翻译文本

详情请见 [docs/i18n.md](docs/i18n.md)。

### 提交数据样本

由于数据样本涉及到 Benchmark 准确性，请在 issue 中提出申请，展示全部样本来源、谱面元信息、期望值等信息。经审核后可提交 Pull Request。


## 许可

- 除 `samples/` 目录外，本项目的代码与文档以 **MIT** 许可发布，详见 [LICENSE](LICENSE)。
- `samples/` 目录中的谱面、样本数据及相关素材**不适用 MIT 许可**，相关权利归原作者所有。使用、下载或分发前请务必阅读 [samples/Disclaimer.md](samples/Disclaimer.md)，并遵守社区规范与适用法律法规。
- 下载样本请仅在测试与验证范围内使用，并在合理时间内删除，避免版权纠纷。

## 免责声明

- Benchmark 结果为统计意义上的参考，不代表某个算法绝对更好或更差的结论。
- 实际游玩体验受个人能力、设备、mod 等多种因素影响，请结合自身判断。
- 本项目与相关社区组织无隶属关系，算法名称均属其各自作者。

## 特别鸣谢

- [inuiyumegan](https://github.com/inuiyumegan): 提供了大量谱面数据用于算法调试和Benchmark。