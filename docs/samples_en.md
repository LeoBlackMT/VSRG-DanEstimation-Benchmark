# samples/ Directory Guide

> 中文版: [samples.md](samples.md)
> **Translation Note**: This document was translated from Chinese to English with the assistance of an AI language model. While efforts have been made to ensure accuracy, please refer to the original Chinese version if any ambiguity arises.

`samples/` is the benchmark's input data directory, holding the test beatmaps and the reference results table. This document explains what is in the directory, what each file is for, and the exact meaning of every field in `data.csv`.

---

## Table of Contents

1. [Directory contents overview](#directory-contents-overview)
2. [samples.7z (beatmap archive)](#samples7z-beatmap-archive)
3. [Disclaimer.md](#disclaimermd)
4. [data.csv field description](#datacsv-field-description)
5. [Integration with the runner](#integration-with-the-runner)

## Directory contents overview

| File | Description |
|---|---|
| `data.csv` | Reference results table, recording each beatmap's metadata, reference difficulty, and algorithm output |
| `Disclaimer.md` | Disclaimer (bilingual zh/en), covering beatmap copyright ownership and usage restrictions |
| `samples.7z` | Beatmap archive, containing all test beatmaps, grouped by key type |

The following 6 directories are ignored by `.gitignore`:

- `samples/course`
- `samples/jack`
- `samples/ln`
- `samples/speed`
- `samples/stamina`
- `samples/tech`

These directories are the result of extracting `samples.7z`; inside are the `.osu` beatmap files grouped by key type. They are large and can be regenerated from the archive at any time, so git ignores them and they never enter version control.

---

## samples.7z (beatmap archive)

`samples.7z` is the source of the test beatmaps. The archive contains `.osu` beatmaps grouped by key type, and the grouping matches the `pattern` field of `data.csv` one-to-one (course / jack / ln / speed / stamina / tech).

### Download and use

- When you clone the repo, `samples.7z` is downloaded along with it.
- Before running the benchmark, you need to extract it first:

```
7z x samples.7z -osamples
```

- After extraction you get six directories, `samples/course/`, `samples/jack/`, `samples/ln/`, `samples/speed/`, `samples/stamina/`, `samples/tech/`, which do not pollute the git status.
- You can also extract only the key-type subdirectories you need; the runner only reads the categories it actually uses.

### Correspondence between archive categories and directories

The directory structure inside `samples.7z` matches the extraction target exactly; each directory corresponds to one `pattern` in `data.csv`:

| Extraction directory | Corresponding pattern |
|---|---|
| `samples/course/` | course |
| `samples/jack/` | jack |
| `samples/ln/` | ln |
| `samples/speed/` | speed |
| `samples/stamina/` | stamina |
| `samples/tech/` | tech |

### Typical workflow

```
1. Clone the repo (samples.7z comes with it)
2. Extract: 7z x samples.7z -osamples
3. Read samples/Disclaimer.md to confirm usage terms
4. Write and run the runner (see docs/runner.md)
5. Check the output under results/
6. Go to the webpage and upload the results.
```

---

## Disclaimer.md

`samples/` also contains a bilingual disclaimer file. Key points:

- The beatmaps in the directory were made by other players, or come from test beatmaps and official website beatmap samples; they are used only for functional testing, algorithm validation, error troubleshooting, and benchmark comparison.
- Beatmap copyright and related rights belong to the original authors, compilers, or legal rights holders; this project claims no ownership and does not endorse the beatmap content or its difficulty design.
- Using these beatmaps does not constitute redistribution, commercial use, or transfer of rights.
- If you are a beatmap author and do not want your work used for such testing, you can contact the project maintainers.
- Users should confirm the usage permissions of the materials and data themselves, follow community norms and applicable laws, and delete the relevant files within 24 hours of download.

For the full terms, read the original `samples/Disclaimer.md`.

---

## data.csv field description

`data.csv` is the benchmark's core results table, with the header:

```
bid,name,pattern,subPattern,expected,got,delta,deltaAbs
```

Each field is explained below.

### bid - beatmap ID

The beatmap's unique ID on the osu! website; an optional field.

- This field can be used by the runner to download the beatmap directly from the osu! website; when filled in, the download button on the webpage can download the corresponding beatmap with one click.
- Whether it is filled in or not does not affect the runner; it is an optional field.

Note: when the field is not filled in, the line must start with a comma.

### name - beatmap display name

The beatmap's display name, used to identify which beatmap a result row refers to.

- Some names carry rate suffixes like `x1.35`, `x1.25`, `x0.95`, for example `Grinding Of The Teeth x1.35`.
- Note: the rate suffix is only a file-name marker distinguishing different rate versions of the same beatmap; it is **not** a mod actually applied by the runner at runtime. The actual run should not apply any rate.

### pattern - main key-type classification

The beatmap's main classification, deciding which key-type benchmark it belongs to. The runner can use this field to decide which kind of algorithm flow to call for the beatmap, and it is also used to output statistics grouped by classification.

### subPattern - sub-classification

A finer key-type description below the main classification, e.g. `stream tech`, `high chordjack`, `dense handstream`, `mid stream`.

- Rows without a sub-classification have the literal `Unsigned` in this field.
- The sub-classification is used for finer-grained comparison: beatmaps with the same `pattern` but different `subPattern` can behave very differently in difficulty curves.

### expected - reference difficulty

The beatmap's reference difficulty given by the benchmark data, i.e. the "correct answer", coming from the numeric difficulty of the dan tier beatmap set.

The definition of numeric difficulty is in [docs/runner_en.md](runner_en.md#3-numeric-difficulty-definition).

- `expected` and `got` share the same numeric difficulty concept; the difference between them is the source of the algorithm error.
- This field is provided by the dataset; the runner must not modify it.

### got - algorithm output

The numeric difficulty the algorithm actually computes for the same beatmap, filled in by the runner after the run.

- Same unit as `expected`, directly comparable.
- The closer the value is to `expected`, the more accurate the algorithm's estimate for that beatmap.

### delta - error (signed)

The signed form of the algorithm error:

```
delta = expected - got
```

- A positive value means the algorithm underestimated (`got` below the reference difficulty), a negative value means overestimation.
- For example, with `expected = 18` and `got = 17.75`, `delta = 0.25`, meaning the algorithm underestimated by 0.25.

### deltaAbs - absolute error

The absolute value of `delta`, measuring the size of the error regardless of direction:

```
deltaAbs = |delta|
```

- Used for statistics like mean absolute error, so positive and negative errors do not cancel each other out.
- For example, `delta = 0.25` and `delta = -0.04` have `deltaAbs` `0.25` and `0.04` respectively.

### Example rows

```
,Grinding Of The Teeth x1.35,tech,stream tech,18,17.75,0.25,0.25
3755310,Death Melody(e8v2) x1.25,stamina,dense handstream,14.5,14.65,-0.15,0.15
```

---

## Integration with the runner

- **Numeric difficulty concept**: the full definition, conversion, and source of the numeric difficulty used by `expected` and `got` are in [docs/runner_en.md](runner_en.md#3-numeric-difficulty-definition); this document does not elaborate.
- **Data flow**:

```
samples/data.csv (expected reference difficulty)
        │
        ▼
runner (reads beatmaps + runs algorithms, computes got/delta/deltaAbs)
        │
        ▼
results/ (algorithm output and statistics)
```

In short: the runner reads the beatmap files and the reference difficulties in `data.csv` from `samples/`, runs each algorithm to get `got`, then computes `delta` and `deltaAbs`, writes them back into the results, and finally outputs to `results/`.
