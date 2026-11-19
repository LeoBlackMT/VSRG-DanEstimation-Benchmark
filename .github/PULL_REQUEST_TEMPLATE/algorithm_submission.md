## Algorithm Submission

### 1. Algorithm Overview

- **Algorithm Name**: 
- **Algorithm Version**: 
- **Repository / Source URL**: 
- **Author(s)**: 
- **Supported Scope**: (e.g. 4K RC only, 4K LN, full 4K)
- **Description**: 

---

### 2. Benchmark Summary

- **Total Charts Evaluated**: 
- **Overall MAE**: 
- **Overall RMSE**: 
- **Invalid / Missing / Failed Count**: 
- **Other notable statistics**:

| Band | Count |
|------|-------|
| Exact |  |
| Close |  |
| Moderate |  |
| Miss |  |

---

### 3. Contract & Data Integrity Checklist

Please ensure all items below are completed before requesting review:

- [ ] **CSV Format**: The file is saved as `results/{Algorithm}.csv` and its header is exactly `bid,name,pattern,subPattern,expected,got,delta,deltaAbs`.
- [ ] **Estimator Information**: The estimator does not input any external data or use any information outside of the provided samples. (e.g. no hardcoded pattern/subPattern, no reading of `expected` values, no external API calls)
- [ ] **Surgical Columns**: Only `got`, `delta`, and `deltaAbs` columns were modified; all other columns match `samples/data.csv` exactly.
- [ ] **Difficulty Scale**: `got` is scaled to the correct Dan Course numeric difficulty scale.
- [ ] **Error Markers**: Unsupported or unparseable charts correctly use standard markers (`Invalid`, `Missing`, `Failed`), and their `delta`/`deltaAbs` are empty.
- [ ] **Index Registration**: Registered in `results/index.json` with correct metadata (`fileName`, `algorithm`, `sizeBytes`, `modifiedAt`, `source`).
- [ ] **README Updates**: Updated the algorithm table and descriptions in both `README.md` (optional if you have no idea how to describe in Chinese) and `README_EN.md` (English).
- [ ] **License & Rights**: Complies with the terms outlined in `samples/Disclaimer.md`.
