# VSRG-DanEstimation-Benchmark

**English | [中文](README.md)**

> **Translation Note**: This document was translated from Chinese to English with the assistance of an AI language model. While efforts have been made to ensure accuracy, please refer to the original Chinese version if any ambiguity arises.

## Project Overview

This project mainly benchmarks the accuracy of VSRG difficulty estimation algorithms, comparing them on real beatmap data.

Difficulty estimation (Dan/Difficulty Estimation) is the practice of rating a beatmap's difficulty against the community Dan tier system. Previously, the community already had multiple algorithms for estimating beatmap difficulty, but lacked a unified evaluation standard and dataset. To this end, this project provides manually annotated [beatmap samples](samples/data.csv), the [methodology for writing evaluation scripts](docs/runner_en.md), and a publicly accessible [results website](https://benchmark.leoblack.top/), for algorithm authors to make side-by-side comparisons. Since different estimation algorithms can disagree wildly on the same beatmap, this project tries to answer one question: **which algorithm is more accurate on real beatmaps?**

The annotations in this project are mainly based on the [Reform](https://www.danreform.com/) Dan system by DDMythical. Among them, Zeta uses Emik's Sample Zeta version, Eta uses Thaumiel's version, and Theta uses CloverWisp's version.

This project was migrated from the original project [ManiaMapAnalyzer](https://github.com/LeoBlackMT/osumania_map_analyser).

### What Problems It Solves

- **Side-by-side comparison**: runs multiple algorithms on exactly the same beatmap samples, producing results that can be compared uniformly.
- **Real data**: all based on real community beatmaps with manually annotated Dan tiers.
- **Clear and transparent**: samples and result data are fully public; anyone can view them, and can also [submit results for a new algorithm](docs/algorithm.md#how-to-show-your-algorithm-on-the-benchmark-result-page).

### Included Algorithms

- **[Sunny](https://github.com/sunnyxxy/Star-Rating-Rebirth)** by [Crz]sunnyxxy: a widely recognized star rating algorithm supporting all key counts/pattern types. Most algorithms are improvements based on Sunny.
- **[Daniel](https://github.com/TheBagelOfMan/Daniel)** by TheBagelOfMan: an improved version based on the Sunny algorithm. Supports 4K RC only.
- **[Azusa](https://github.com/LeoBlackMT/osumania_map_analyser/tree/main/docs/azusa_algorithm.md)** by LeoBlackMT: a tuned algorithm fusing Daniel and Sunny. Supports 4K RC only.
- **[Roxy](https://github.com/LeoBlackMT/osumania_map_analyser/tree/main/docs/roxy_algorithm.md)** by LeoBlackMT: a meta-structure estimator. Its GBDT model is trained on the results of Sunny, Daniel and Azusa; supports 4K RC only.
- **[Companella](https://github.com/Leinadix/companella)** by Leinadix: 4K Dan estimation using an ONNX model based on [Etterna](https://github.com/etternagame/etterna) MinaCalc.
- **[Mixed](https://github.com/LeoBlackMT/osumania_map_analyser)** by LeoBlackMT: a hybrid algorithm combining the algorithms above, automatically routing to the best algorithm based on beatmap characteristics. Mainly used in the [ManiaMapAnalyzer](https://github.com/LeoBlackMT/osumania_map_analyser) project.
- **[DanOverlay](https://github.com/acarranzao1a-png/Dan-Overlay/)** by acarranzao1a-png: an algorithm calibrated and corrected on top of Sunny, Etterna MinaCalc and other algorithms. Supports 4K RC/LN and 7K, and the Reform/Celestial/Signicial/Shoegazer Dan systems.

## Benchmark Results

Online results page: [https://benchmark.leoblack.top/](https://benchmark.leoblack.top/)

The website is driven by the data in the `results/` directory. It supports viewing accuracy comparisons by algorithm, key mode and difficulty range, including metrics such as error distribution, mean error and bias.

## Repository Structure

| Path | Description |
|---|---|
| `samples/` | Contains the dataset `data.csv` and the packaged beatmap samples `samples.7z`, categorized by `course / jack / ln / speed / stamina / tech`. **Note**: beatmap copyrights belong to their original authors; please follow [samples/Disclaimer.md](samples/Disclaimer.md) when using them |
| `results/` | Benchmark result data for each algorithm (`*.csv`) and `index.json` |
| `docs/` | Project documentation: sample notes, run methods, algorithm overview, internationalization |
| `assets/` | Website assets (CSS, JS, fonts, images, etc.) |
| `runner/` | Benchmark run scripts |
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

## License

- Except for the `samples/` directory, the project's code and documentation are released under the **MIT** license; see [LICENSE](LICENSE).
- The beatmaps, sample data and related assets in the `samples/` directory are **not covered by the MIT license**; their rights belong to the original authors. Please read [samples/Disclaimer.md](samples/Disclaimer.md) before using, downloading or redistributing, and comply with community norms and applicable laws.
- Only download samples for testing and verification purposes, and delete them within a reasonable time to avoid copyright disputes.

## Disclaimer

- Benchmark results are statistical references and do not represent a conclusion that one algorithm is absolutely better or worse.
- Actual gameplay experience is affected by many factors such as personal skill, hardware and mods; please use your own judgment.
- This project is not affiliated with the related community organizations; algorithm names belong to their respective authors.

## Special Thanks

- [inuiyumegan](https://github.com/inuiyumegan): provided a large amount of beatmap data for algorithm debugging and Benchmark.
