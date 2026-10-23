# 如何在 Benchmark Result 网页上显示你的算法

> English version below ↓

本文说明如何让一个新算法出现在 Benchmark Result 网页上：生成数据文件、注册索引、提交合入。网页只读取 `results/` 目录，算法名与显示名都来自文件名。

### 1. 核心流程

**第一步：阅读文档**
- 阅读 [docs/samples.md](samples.md) 了解 `data.csv` 的字段含义与数据契约。
- 阅读 [docs/runner.md](runner.md) 了解如何运行 benchmark、生成 CSV。

**第二步：编写 runner 并生成 `results/{Algorithm}.csv`**

- 根据文档编写 runner，运行算法并生成 CSV 文件。
- CSV 文件将生成在 `results/` 目录下，文件名形如 `Sunny.csv`、`Daniel.csv`。
- 算法显示名 = CSV 文件名去掉 `.csv` 后缀。例如 `MyAlgo.csv` 在网页上显示为 `MyAlgo`。

**第三步：自动生成/注册到 `results/index.json`**

根据文档中 results/index.json 规范进行注册，示例如下：

```json
{
  "fileName": "MyAlgo.csv",
  "algorithm": "MyAlgo",
  "sizeBytes": 12345,
  "modifiedAt": "2026-08-04T12:00:00.000Z",
  "source": "https://example.com/algorithm-repo"
}
```
随后在`README.md`和`README_EN.md`的收录算法小结新增你的算法。如果你不清楚某种语言，可以使用AI翻译或等候维护者补充。

**第四步：提交**

向本仓库发起 Pull Request，详细说明你的算法详情。改动应当集中在 `results/` 目录以及`README.md`和`README_EN.md`文件。你必须遵守 `samples/Disclaimer.md` 中的声明与限制。


### 2. i18n 提示

算法的显示名直接取自 CSV 文件名，不经过翻译。如果需要本地化显示名，请参照 [docs/i18n.md](i18n.md) 中的约定实现。

---

> **Translation Note**: This document was translated from Chinese to English with the assistance of an AI language model. While efforts have been made to ensure accuracy, please refer to the original Chinese version if any ambiguity arises.

# How to Show Your Algorithm on the Benchmark Result Page

> 中文版本在上方 ↑

This document explains how to make a new algorithm appear on the Benchmark Result page: generate the data file, register it in the index, and submit a pull request. The page only reads the `results/` directory, and both the algorithm name and the display name come from the filename.

## 1. Core Workflow

**Step 1: Read the docs**

Before writing anything, read the two documents that define the data format and how to run the benchmark. Both live in the `docs/` folder of this repository:

- Read [docs/samples_en.md](samples_en.md) to understand the field semantics and the data contract of `data.csv`.
- Read [docs/runner_en.md](runner_en.md) to learn how to run the benchmark and generate the CSV.

**Step 2: Write a runner and generate `results/{Algorithm}.csv`**

- Write a runner following the docs, run your algorithm, and produce a CSV file.
- The CSV file lands in the `results/` directory, named like `Sunny.csv` or `Daniel.csv`.
- The algorithm display name is the CSV filename without the `.csv` suffix. For example, `MyAlgo.csv` shows up as `MyAlgo` on the page.
- The same name is used everywhere: it is the algorithm name, the display name, and the key you register in `index.json`.

Keep the CSV inside `results/`. The page only serves files from that directory, so a file placed anywhere else will not be picked up.

**Step 3: Generate and register in `results/index.json`**

Register the file following the `results/index.json` spec in the docs. The entry for `MyAlgo.csv` looks like this:

```json
{
  "fileName": "MyAlgo.csv",
  "algorithm": "MyAlgo",
  "sizeBytes": 12345,
  "modifiedAt": "2026-08-04T12:00:00.000Z",
  "source": "https://example.com/algorithm-repo"
}
```

Then add your algorithm to the included-algorithms list in `README.md` and `README_EN.md`. If you are not confident writing in one of the languages, use machine translation or wait for a maintainer to fill it in.

**Step 4: Submit**

Open a pull request against this repository with a detailed description of your algorithm. The change should stay inside the `results/` directory plus `README.md` and `README_EN.md`: a new CSV, an updated `index.json`, and the README entry. Reviewers will check that the CSV and the `index.json` entry match.

You must follow the disclaimer and restrictions in `samples/Disclaimer.md`.

## 2. i18n Notes

The display name comes straight from the CSV filename and is not translated.

What you see on the page is exactly the filename without the `.csv` extension. If you need localized display names, follow the conventions in [docs/i18n.md](i18n.md#i18n-contribution-guide).
