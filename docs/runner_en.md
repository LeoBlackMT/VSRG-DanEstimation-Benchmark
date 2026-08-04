# Benchmark Runner Writing Guide (English)

> **中文版**: This is the English edition of the benchmark runner writing guide.
> 中文版: [runner.md](runner.md)
> **Translation Note**: This document was translated from Chinese to English with the assistance of an AI language model. While efforts have been made to ensure accuracy, please refer to the original Chinese version if any ambiguity arises.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Workflow Overview](#2-workflow-overview)
3. [Numeric Difficulty Definition](#3-numeric-difficulty-definition)
4. [Output CSV Specification](#4-output-csv-specification)
5. [The results/index.json Specification](#5-the-resultsindexjson-specification)
6. [Runtime Conventions](#6-runtime-conventions)
7. [Writer's Self-Check List](#7-writers-self-check-list)

---

## 1. Overview

Because different algorithms differ greatly in style, a generic script cannot fit them all, so this repository does not distribute any runner scripts. This document is a runner **writing guide**: it explains the complete benchmark run flow, the input/output formats, and the conventions that must be followed when writing a runner. You can implement a runner yourself in any language (Node.js, Python, etc.); as long as the output conforms to the format specified in this document, the results can be read correctly by this repository's display page.

The associated input/output files are as follows:

| File | Purpose |
|---|---|
| `samples/data.csv` | Input manifest; each line is one map record |
| `samples/{pattern}/{name}.osu` | Map files, stored in directories by pattern and name (you need to unpack `samples.7z` yourself) |
| `results/{Algorithm}.csv` | One result table per algorithm |
| `results/index.json` | Index of the results directory, read by the display page |

---

## 2. Workflow Overview

```
samples/data.csv ──────────────┐
samples/{pattern}/{name}.osu ──┼──►  run the estimation algorithm line by line  ──►  results/{Algorithm}.csv
                               │
                               └────────────────────────►  results/index.json
```

The complete workflow is divided into six steps:

1. **Read the input manifest**: read `samples/data.csv`; each line is one map record containing fields such as `bid / name / pattern / subPattern / expected`.
2. **Locate the map file**: based on the `pattern` and `name` in the line, find `samples/{pattern}/{name}.osu` according to the matching rules (see [6.2](#62-map-matching-rules)).
3. **Compute the numeric difficulty**: analyze the map with the chosen estimation algorithm and compute the numeric difficulty as the `got` value (definition in Chapter 3).
4. **Compute the error**: when both `expected` and `got` are numbers, compute `delta = expected - got` and `deltaAbs = |delta|`.
5. **Write the result table**: generate one `results/{Algorithm}.csv` per algorithm; copy `data.csv` and overwrite only the `got / delta / deltaAbs` columns.
6. **Update the index**: scan the results directory, generate (or overwrite) `results/index.json`, and add the `source` key (see [5.3](#53-the-source-key-manually-maintained-important)).

---

## 3. Numeric Difficulty Definition

### 3.1 What Is Numeric Difficulty

Numeric difficulty is the unit used to convert dan ranks into numbers. It is a floating-point number, usually between 0 and 20, that represents how difficult a map is. Please annotate using the dan system based on [Reform](https://www.danreform.com/) by DDMythical. Among them, Zeta uses Emik's Sample Zeta version, Eta uses Thaumiel's version, and Theta uses CloverWisp's version.
1st dan corresponds to 1.0, 2nd dan to 2.0, and so on. For the Greek letter part, alpha corresponds to 11.0, beta to 12.0, and so on.
The breakdown is as follows:
| (-0.5,-0.2) | [-0.2,0) | 0 | (0,0.2] | (0.2,0.5] |
|---|---|---|---|---|
| Low | Low/Mid | Mid | Mid/High | High |

After the estimator analyzes a map, it produces an estimated difficulty result. If your algorithm also uses numbers as its difficulty representation, directly convert it to the numeric difficulty compatible with this project; if it directly outputs an estimated dan string, you need to manually map it to the numeric difficulty.

### 3.2 Both expected and got Use Numeric Difficulty

The result table has two key columns, and both use the numeric difficulty concept:

- `expected`: **the reference numeric difficulty**. It comes from the target value given by the dan source that the map belongs to, representing "how difficult this map should be".
- `got`: **the numeric difficulty output by the algorithm**. The runner needs to write the estimator's result into this column, representing "how difficult the algorithm thinks this map is".

Only when both columns are on the same numeric scale do the error statistics make sense. When writing a runner, you must ensure that the `got` you write uses the same definition as the `expected` in the input file; otherwise the error numbers are not comparable at all.

### 3.3 Convention Difference Warning

Different projects hold different opinions on the mapping between "numeric difficulty" and "dan difficulty", and directly reusing another project's numbers can lead to wrong conclusions. One common difference is: **some other projects define numeric difficulty = the numeric difficulty defined in this project + 0.5**.

[DanOverlay](https://github.com/acarranzao1a-png/Dan-Overlay/)'s DP is an instance of this convention; its numeric difficulty scale differs from this repository's by 0.5. Its definition is as follows:
| [0,+0.2] | (+0.2,+0.4] | (+0.4,+0.6] | (+0.6,+0.8] | (+0.8,+1.0) |
|---|---|---|---|---|
| Low | Low/Mid | Mid | Mid/High | High |

Therefore, when writing a runner, you must:

- **Be explicit about which definition you adopt**, and convert accordingly when writing `got`;
- **Stay consistent throughout the whole benchmark**; you cannot use one definition for some rows and another for others.

Mixing the two scales will make the error statistics completely wrong.

### 3.4 This Project Does Not Provide a Mapping Table

**This project does not display any mapping definition tables**. The concrete conversion from dan to numeric difficulty is an internal convention of each algorithm and each project, and this repository's documentation does not expand on these details. If you need to know the conversion for a particular dan system, consult the original source of that system instead of expecting to find a comparison table in this repository.

---

## 4. Output CSV Specification

For a detailed introduction to the CSV, see Chapter 4 of [docs/algorithm.md](algorithm.md).

### 4.1 Header (8 Columns, Fixed)

```
bid,name,pattern,subPattern,expected,got,delta,deltaAbs
```

The meaning of each column:

| Column | Meaning |
|---|---|
| `bid` | Map ID, may be empty |
| `name` | Map name |
| `pattern` | Main pattern classification (e.g. rc / ln) |
| `subPattern` | Sub pattern classification (e.g. stream tech / light jumpstream) |
| `expected` | Reference numeric difficulty |
| `got` | Numeric difficulty output by the algorithm, or an error marker |
| `delta` | `expected - got` |
| `deltaAbs` | `\|delta\|` |

### 4.2 The Runner Only Overwrites Three Columns

The runner only needs to write (overwrite) three columns:

- `got`
- `delta`
- `deltaAbs`

The remaining columns (`bid / name / pattern / subPattern / expected`) come from `samples/data.csv`; the runner should **preserve them as-is and not modify them**. The recommended implementation is to read data.csv line by line, compute, then update only these three columns and pass through the other fields when writing.
The `got` column will be automatically converted to a dan string for display on the web page, and the `delta` and `deltaAbs` columns are used for error statistics.

### 4.3 Error Marker Conventions

When a line cannot produce a valid numeric difficulty, write one of the following strings into the `got` column:

- `Invalid`: the algorithm explicitly determines that the map is not applicable (e.g. the current mode is outside the algorithm's supported range).
- `Missing`: the corresponding map file cannot be found according to the matching rules.
- `Failed`: the algorithm failed to execute, or the output could not be parsed as a number.

The `delta` and `deltaAbs` of error lines remain empty. **Error lines do not participate in any statistics**: metrics such as MAE and RMSE are only computed over lines where both `expected` and `got` are numbers; error lines are kept in the CSV only for troubleshooting.

### 4.4 delta and deltaAbs

Only when both `expected` and `got` are valid numbers:

- `delta = expected - got`
- `deltaAbs = |delta|`

If either column is missing, empty, or not a number, these two columns are left empty and nothing is written.

---

## 5. The results/index.json Specification

`results/index.json` is the index of the results directory, read by the display page. It can be generated by the runner after each benchmark run (update-style write) or maintained manually.

### 5.1 Top-Level Fields

| Field | Type | Description |
|---|---|---|
| `generatedAt` | string | Generation time, ISO 8601 format (e.g. `2026-08-03T07:46:01.000Z`) |
| `algorithms` | string array | List of algorithm names, sorted alphabetically, derived from `files` |
| `files` | object array | One entry per result CSV |

You should not modify entries for algorithms unrelated to the current runner's algorithm.

### 5.2 files[] Entries

Each entry in the `files[]` array contains the following fields:

- `fileName`: the CSV file name (e.g. `Sunny.csv`).
- `algorithm`: the algorithm name, i.e. the file name without the `.csv` suffix.
- `sizeBytes`: the file size in bytes.
- `modifiedAt`: the file's last modification time, as an ISO 8601 string.

The `algorithms` array is derived from the `algorithm` field of `files` and sorted.

### 5.3 The source Key (Manually Maintained, Important)

A `files[]` entry may carry an optional **`source` key**, indicating the source link of that algorithm's results (e.g. the algorithm's homepage).
When the current algorithm has this key, the web page will display an "Algorithm Source" button before the button row; clicking it opens the link in a new tab. When an entry has no `source` key, the button is not displayed.
When maintaining locally without considering uploading, the `source` key can be left empty or omitted.

Important notes about the `source` key:

1. **It is a manually maintained field**: the runner should not write or modify `source` itself when generating index.json; it is added manually by the maintainer after generation.
2. **Regeneration may lose it**: if the runner writes index.json by overwriting each time, **regeneration will overwrite the entire file** and all manually added `source` keys will disappear. Therefore, an update-style write is recommended: keep existing entries and only update the entry of the current algorithm.
3. **A PR must include the `source` key**: if you want to display the algorithm source button on the web page, you must add the `source` key for your algorithm's entry in index.json when submitting the PR.

Example entry with the `source` key:

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

## 6. Runtime Conventions

### 6.1 Speed Fixed at 1.0

All benchmarks are computed at the native speed (1.0x), without applying any speed mod. Suffixes such as `x1.2` and `x1.35` in map file names are only labels, used to distinguish different speed categories of the same map; they are **not** the runtime speed parameter. The runner must not adjust the computation speed based on the speed label in the file name.

### 6.2 Map Matching Rules

When looking up map files, follow this priority:

1. **Exact path**: `samples/{pattern}/{name}.osu`, exactly matching the pattern and name in data.csv.
2. **Normalized name**: normalize the file name (remove excess whitespace, unify case, etc.), then do an exact match.
3. **Tolerant matching**: support the `Name(...)` and `Name (...)` forms, i.e. cases where a parenthesized remark follows the map name.
4. If none of the above finds the file, mark that line as `Missing`.

### 6.3 Console Output Recommendations

It is recommended that the runner output a status for each line while running, to quickly locate problems:

- `OK`: a numeric result was obtained normally.
- `Invalid`: the line was determined to be not applicable.
- `Missing`: the map file is missing.
- `Failed`: execution failed or the output could not be parsed.

When the run ends, output a summary for each algorithm:

- `ok`: number of successful lines
- `invalid`: number of invalid lines
- `missing`: number of missing lines
- `failed`: number of failed lines
- `total`: total number of lines

`ok + invalid + missing + failed` should equal `total`, which should also equal the total number of lines in data.csv. If they do not match, some lines were not processed.

---

## 7. Writer's Self-Check List

After finishing the implementation, go through the following checklist item by item:

- [ ] The output CSV uses the fixed 8-column header: `bid,name,pattern,subPattern,expected,got,delta,deltaAbs`.
- [ ] Only the `got / delta / deltaAbs` columns are overwritten; the other columns are preserved as-is.
- [ ] `got` holds the numeric difficulty field adapted to this project, on the same scale as `expected`.
- [ ] The adopted numeric difficulty definition is explicit and kept consistent throughout.
- [ ] Error lines use the `Invalid / Missing / Failed` markers, leave `delta` and `deltaAbs` empty, and do not participate in statistics.
- [ ] `delta = expected - got`, `deltaAbs = |delta|`, computed only when both are numbers.
- [ ] Speed is fixed at 1.0; the speed label in the file name is ignored.
- [ ] Map matching follows the priority: exact path → normalized name → `Name(...)` tolerant match.
- [ ] index.json contains the `generatedAt / algorithms / files` structure; the `source` key is maintained manually and must be re-added after a rerun.
