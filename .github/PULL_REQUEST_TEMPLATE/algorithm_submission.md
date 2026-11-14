## Algorithm Submission

### 1. Algorithm Overview

- **Algorithm Name**: 
- **Repository / Source URL**: 
- **Author(s)**: 
- **Supported Scope**: (e.g. 4K RC only, 4K LN, full 4K)
- **Brief Description**: 

---

### 2. Benchmark Summary

- **Total Charts Evaluated**: 
- **Overall MAE**: 
- **Overall RMSE**: 
- **Invalid / Missing / Failed Count**: 

---

### 3. Contract & Data Integrity Checklist

Please ensure all items below are completed before requesting review:

- [ ] **CSV Format**: The file is saved as `results/{Algorithm}.csv` and its header is exactly `bid,name,pattern,subPattern,expected,got,delta,deltaAbs`.
- [ ] **Surgical Columns**: Only `got`, `delta`, and `deltaAbs` columns were modified; all other columns match `samples/data.csv` exactly.
- [ ] **Difficulty Scale**: `got` is scaled to the Reform Dan numeric difficulty scale (e.g., DanOverlay DP converted with `- 0.5`).
- [ ] **Error Markers**: Unsupported or unparseable charts correctly use standard markers (`Invalid`, `Missing`, `Failed`), and their `delta`/`deltaAbs` are empty.
- [ ] **Index Registration**: Registered in `results/index.json` with correct metadata (`fileName`, `algorithm`, `sizeBytes`, `modifiedAt`, `source`).
- [ ] **README Updates**: Updated the algorithm table and descriptions in both `README.md` (Chinese) and `README_EN.md` (English).
- [ ] **Local Verification**: Verified locally that the website displays the algorithm correctly, and charts/tables render without errors.
- [ ] **License & Rights**: Complies with the terms outlined in `samples/Disclaimer.md`.

## Related Issues

<!-- Closes #123, Relates to #456 -->
