# 如何在 Benchmark Result 网页上显示你的算法

> 中文 · English version below ↓ / 下方为英文版

## 中文

本文说明如何让一个新算法出现在 Benchmark Result 网页上：生成数据文件、注册索引、提交合入。网页只读取 `results/` 目录，算法名与显示名都来自文件名。

### 1. 核心流程

四步：阅读文档、编写 runner 生成 CSV，注册到 `index.json`，通过 PR 提交。

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

**第四步：提交**

向本仓库发起 Pull Request，改动集中在 `results/` 目录（新增 CSV 并更新 `index.json`）。如果你的数据使用了 `samples/` 目录下的谱面，必须遵守 `samples/Disclaimer.md` 中的声明与限制。


### 2. i18n 提示

算法的显示名直接取自 CSV 文件名，不经过翻译。如果需要本地化显示名，请参照 `docs/i18n.md` 中的约定实现。

---

## English version below ↓ / 下方为英文版

---

> **Translation Note**: This document was translated from Chinese to English with the assistance of an AI language model. While efforts have been made to ensure accuracy, please refer to the original Chinese version if any ambiguity arises.

# How to Show Your Algorithm on the Benchmark Result Page

This document explains how to make a new algorithm appear on the Benchmark Result page: generate the data file, register it in the index, and submit a pull request. The page only reads the `results/` directory, and both the algorithm name and the display name come from the filename.

## 1. Core Workflow

There are four steps:

1. Read the docs.
2. Write a runner and generate the CSV.
3. Register the file in `results/index.json`.
4. Submit a pull request.

**Step 1: Read the docs**

Before writing anything, read the two documents that define the data format and how to run the benchmark. Both live in the `docs/` folder of this repository:

- Read [docs/samples.md](samples.md) to understand the field semantics and the data contract of `data.csv`.
- Read [docs/runner.md](runner.md) to learn how to run the benchmark and generate the CSV.

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

The entry has four required fields plus one optional field:

- `fileName`: the CSV filename, e.g. `"MyAlgo.csv"`.
- `algorithm`: the algorithm name, e.g. `"MyAlgo"`.
- `sizeBytes`: the file size in bytes, from the file metadata.
- `modifiedAt`: the file modification time (ISO 8601 string), from the file metadata.
- `source` (optional): a link to the algorithm source, such as the repository, paper, or author page.

**Step 4: Submit**

Open a pull request against this repository. The change stays inside the `results/` directory: a new CSV plus an updated `index.json`. Reviewers will check that the CSV and the `index.json` entry match.

If your data uses beatmaps from the `samples/` directory, you must follow the disclaimer and restrictions in `samples/Disclaimer.md`.

## 2. i18n Notes

The display name comes straight from the CSV filename and is not translated.

What you see on the page is exactly the filename without the `.csv` extension. If you need localized display names, follow the conventions in `docs/i18n.md`.
