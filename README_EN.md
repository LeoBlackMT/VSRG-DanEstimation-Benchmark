# VSRG-DanEstimation-Benchmark

**English | [中文](README.md)**

> **Translation Note**: This document was translated from Chinese to English with the assistance of an AI language model. While efforts have been made to ensure accuracy, please refer to the original Chinese version if any ambiguity arises.

## Project Overview

This project mainly benchmarks the accuracy of VSRG difficulty estimation algorithms. It was migrated from the original project [ManiaMapAnalyzer](https://github.com/LeoBlackMT/osumania_map_analyser).

Difficulty estimation (Dan/Difficulty Estimation) is the practice of rating a beatmap's difficulty against the community Dan tier system. Previously, the community already had multiple algorithms for estimating beatmap difficulty, but lacked a unified evaluation standard and dataset. Since different estimation algorithms can disagree wildly on the same beatmap, this project provides manually annotated [beatmap samples](samples/data.csv), the [methodology for writing evaluation scripts](docs/runner_en.md), and a publicly accessible [results website](https://benchmark.leoblack.top/), for algorithm authors to make side-by-side comparisons.

Currently, this project only supports 4K samples, and LN samples are still limited. We welcome anyone to submit samples to expand our sample library!

### What Problems It Solves

- **Side-by-side comparison**: runs multiple algorithms on exactly the same beatmap samples, producing results that can be compared uniformly.
- **Real data**: all based on real community beatmaps with manually annotated Dan tiers.
- **Clear and transparent**: samples and result data are fully public; anyone can view them, and can also [submit results for a new algorithm](docs/algorithm.md#how-to-show-your-algorithm-on-the-benchmark-result-page).

### Dan System Baseline

The RC charts in this project are annotated against the [Reform](https://www.danreform.com/) Dan system by DDMythical. Among them, Zeta uses Emik's [Sample Zeta](https://osu.ppy.sh/beatmapsets/1985457#mania/4123991) version, [Eta](https://osu.ppy.sh/beatmapsets/1156299#mania/2738787) uses [Thaumiel](https://osu.ppy.sh/users/15017771)'s version, and [Theta](https://osu.ppy.sh/beatmapsets/2234779#mania/4747219) uses [CloverWisp](https://osu.ppy.sh/users/24748885)'s version. LN charts are annotated against the [4K LN Dan Course V2](https://osu.ppy.sh/beatmapsets/891143#mania/1862816) Dan system by [_underjoy](https://osu.ppy.sh/users/2235750). Among them, [LN16](https://osu.ppy.sh/beatmapsets/2243057#mania/4767800) uses [hypersovae](https://osu.ppy.sh/users/31898985)'s version, and [LN17](https://osu.ppy.sh/beatmapsets/2340696#mania/5029140) uses Lnlism's version.

## Benchmark Results

Online results page: [https://benchmark.leoblack.top/](https://benchmark.leoblack.top/)

The website is driven by the data in the `results/` directory. It supports viewing accuracy comparisons by algorithm, key mode and difficulty range, including metrics such as error distribution, mean error and bias.

### Included Algorithms

- **[Sunny](https://github.com/sunnyxxy/Star-Rating-Rebirth)** `b6c1d89` by [Crz]sunnyxxy: a widely recognized star rating algorithm supporting all key counts/pattern types. Most algorithms are improvements based on Sunny.
- **[Daniel](https://github.com/TheBagelOfMan/Daniel)** `v1.1` by TheBagelOfMan: an improved version based on the Sunny algorithm. Supports 4K RC only.
- **[Azusa](https://github.com/LeoBlackMT/osumania_map_analyser/tree/main/docs/azusa_algorithm.md)** `v2.1.0` by LeoBlackMT: a tuned algorithm fusing Daniel and Sunny. Supports 4K RC only.
- **[Roxy](https://github.com/LeoBlackMT/osumania_map_analyser/tree/main/docs/roxy_algorithm.md)** `v2.1.0` by LeoBlackMT: a meta-structure estimator. It blends Azusa/Daniel reference predictions via a Ridge linear meta-model, focused on the high-difficulty band (numeric 11~17); supports 4K RC only.
- **[Companella](https://github.com/Leinadix/companella)** `v6.52` by Leinadix: 4K Dan estimation using an ONNX model based on [Etterna](https://github.com/etternagame/etterna) MinaCalc.
- **[Mixed](https://github.com/LeoBlackMT/osumania_map_analyser)** `v2.1.0` by LeoBlackMT: a hybrid algorithm combining the algorithms above, automatically routing to the best algorithm based on beatmap characteristics. Mainly used in the [ManiaMapAnalyzer](https://github.com/LeoBlackMT/osumania_map_analyser) project.
- **[ISOR](https://github.com/acarranzao1a-png/Dan-Overlay/)** `v3.1.0` by acarranzao1a-png: an algorithm calibrated and corrected on top of Sunny, Etterna MinaCalc and other algorithms. Supports 4K RC/LN and 7K, and the Reform/Celestial/Signicial/Shoegazer Dan systems.
- **[P1h](https://github.com/sky2002/osu-star-web)** `v1.0` by sky2002: a 4K difficulty and Dan estimator combining an action-level Transformer, Student-t timing error probability integration, and 22-feature HistGBDT tree calibration.
- **[AquaCrest](https://github.com/AquaStoneLZS/AquaCrest)** `v1.0.0` by AquaStoneLZS: A 4K difficulty and Dan estimator using RBF SVR over 924 features, combining AquaTide/AquaReef indices, Azusa local difficulty curves, and chart structure features. Supports 4K RC only.

## Repository Structure

| Path | Description |
|---|---|
| `samples/` | Contains the dataset `data.csv` and the packaged `.osu` beatmap samples `samples.7z`, categorized by `course / jack / ln / speed / stamina / tech`. **Note**: beatmap copyrights belong to their original authors; please follow [samples/Disclaimer.md](samples/Disclaimer.md) when using them |
| `results/` | Benchmark result data for each algorithm (`*.csv`) and `index.json` |
| `docs/` | Project documentation: sample notes, run methods, algorithm overview, internationalization |
| `assets/` | Website assets (CSS, JS, fonts, images, etc.) |
| `index.html` | Entry point of the Benchmark results website |

## Documentation Index

| Document | Language | Description |
|---|---|---|
| [docs/samples.md](docs/samples.md) | 中文 | Sample directory documentation |
| [docs/samples_en.md](docs/samples_en.md) | English | Sample dataset documentation |
| [docs/runner.md](docs/runner.md) | 中文 | How to write the benchmark runner |
| [docs/runner_en.md](docs/runner_en.md) | English | How to write the benchmark runner |
| [docs/algorithm.md](docs/algorithm.md) | Bilingual | Result submission guide |
| [docs/i18n.md](docs/i18n.md) | Bilingual | Internationalization and localization contribution guide |

## How to Contribute

### Running the Benchmark

The run method and dependency notes are in [docs/runner_en.md](docs/runner_en.md).

### Submitting Results for a New Algorithm

1. Fork this repository.
2. Generate the CSV file following the requirements in [docs/algorithm.md](docs/algorithm.md#how-to-show-your-algorithm-on-the-benchmark-result-page).
3. Put the results into `results/` and register them in `index.json`.
4. Submit a Pull Request describing the algorithm's introduction, principle, source and parameter settings.

### Submitting Translations

See [docs/i18n.md](docs/i18n.md#i18n-contribution-guide) for details.

### Submitting Sample Data

Since sample data affects the benchmark's accuracy, please submit an issue first, showing all sample sources, beatmap metadata, expected numberic difficulty, etc. After review, you may submit a Pull Request.

## License

- Except for the `samples/` directory, the project's code and documentation are released under the **MIT** license; see [LICENSE](LICENSE).
- The beatmaps, sample data and related assets in the `samples/` directory are **not covered by the MIT license**; their rights belong to the original authors. Please read [samples/Disclaimer.md](samples/Disclaimer.md) before using, downloading or redistributing, and comply with community norms and applicable laws.
- Only download samples for testing and verification purposes, and delete them within a reasonable time to avoid copyright disputes.

## Disclaimer

- Benchmark results are statistical references and do not represent a conclusion that one algorithm is absolutely better or worse.
- All beatmap samples are manually annotated, so misjudgments, omissions or errors may exist.
- Actual gameplay experience is affected by many factors such as personal skill, hardware and mods; please use your own judgment.
- This project is not affiliated with the related community organizations; algorithm names belong to their respective authors.

## Special Thanks

- [inuiyumegan](https://github.com/inuiyumegan): aggregated and provided 700+ beatmap samples.
- [YuLuoX](https://osu.ppy.sh/users/36113882): provided a large number of high-quality stream/speed samples.
- [Tsumikiyuzu](https://osu.ppy.sh/users/15288539) & [Hx032 / Hoshiikunn](https://osu.ppy.sh/users/11603156): created the [δ图纲目](https://docs.qq.com/sheet/DQ3JpZVF4SnZCWEpy), containing 500+ high-quality manually annotated samples around delta.
