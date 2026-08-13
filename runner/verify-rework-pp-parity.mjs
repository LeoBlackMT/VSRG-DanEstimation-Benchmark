// verify-rework-pp-parity.mjs
//
// Task 15 (B): samples C# parity verification for the ReworkPP feature.
//
// For every .osu under samples/ (samples/{pattern}/{name}.osu) and both
// classicMod=false / classicMod=true, this script compares the PRODUCTION
// modules (plugin js/rework/sunnyAlgorithm.js + reworkPerformance.js, loaded
// via esm-loader) against an INDEPENDENT reference transcription of the
// authoritative C# sources:
//
//   osu-author-port (rework branch)
//     osu.Game.Rulesets.Mania/Difficulty/Calculators/MACalculator.cs
//     osu.Game.Rulesets.Mania/Difficulty/Skills/SunnySkill.cs
//     osu.Game.Rulesets.Mania/Difficulty/ManiaDifficultyCalculator.cs
//     osu.Game.Rulesets.Mania/Difficulty/ManiaPerformanceCalculator.cs
//
// The reference is written inside this script as a faithful line-by-line C#
// transcription (no shared code with the production modules). Values compared:
//
//   complex pipeline (tolerance 1e-12 relative, >1e-12 -> FAIL):
//     star, variety, accScalar, spikiness, switches, totalNotes
//   pure arithmetic (strict ===):
//     Max PP, Live PP x3 tiers, v2Acc, proportion, varietyMultiplier,
//     accMultiplier, lengthMultiplier
//
// The PP comparisons feed BOTH sides the identical attribute tuple
// (production pipeline star/variety/accScalar/totalNotes) and identical
// judgement counts, isolating the pure-arithmetic PP chain from the pipeline.
//
// Run (from benchmark repo root):
//   node --loader "file:///C:/.../VSRG-DanEstimation-Benchmark/runner/esm-loader.mjs" runner/verify-rework-pp-parity.mjs [--limit N]
//
// Output: PARITY: N/N PASS (exact) + M/M ULP-LEVEL (max dev) + FAIL count

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { calculate as productionSunnyCalculate } from "../../../tosu/osumania_map_analyser/ManiaMapAnalyser by Leo_Black/js/rework/sunnyAlgorithm.js";
import { calculateReworkPp as productionReworkPp } from "../../../tosu/osumania_map_analyser/ManiaMapAnalyser by Leo_Black/js/rework/reworkPerformance.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SAMPLES_ROOT = path.join(REPO_ROOT, "samples");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let limit = Infinity;
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") limit = Number.parseInt(args[i + 1], 10);
}

// ---------------------------------------------------------------------------
// Reference implementation: independent transcription of the C# chain.
// No production code is imported or reused here.
// ---------------------------------------------------------------------------

// C# ManiaDifficultyCalculator.CreateDifficultyHitObjects: sort by StartTime
// then Column, DROP THE FIRST object (loop starts at i=1). Times are ints.
// SunnySkill.Process: Note(column, (int)startTime, endTime) where endTime =
// -1 when EndTime == StartTime (i.e. circle), else (int)EndTime.
function refParseOsu(text) {
    const lines = text.split(/\r?\n/);
    let mode = null;
    let circleSize = 0;
    let od = 0;
    const hitObjects = [];
    let inHitObjects = false;
    let rawCount = 0;

    for (const line of lines) {
        const t = line.trim();
        if (t.startsWith("[")) {
            inHitObjects = t === "[HitObjects]";
            continue;
        }
        if (inHitObjects) {
            if (!t || t.startsWith("//")) continue;
            // C# column mapping (LegacyPatternGenerator.GetColumn):
            //   Math.Clamp((int)MathF.Floor(x / (512f / TotalColumns)), 0, TotalColumns - 1)
            // In .osu mania, hit object lines are: x,y,time,type,hitSound[,extras]
            // extras[0] is the hold end time for type & 128 (hold).
            const K = Math.max(1, Math.round(circleSize));
            const divisor = 512 / K;
            const p = t.split(",");
            if (p.length < 5) continue;
            rawCount++;
            const x = Number.parseInt(p[0], 10);
            const time = Number.parseInt(p[2], 10);
            const type = Number.parseInt(p[3], 10);
            let col = Math.floor(x / divisor);
            if (col < 0) col = 0;
            if (col > K - 1) col = K - 1;
            let endTime = time;
            if ((type & 128) !== 0 && p.length >= 6) {
                endTime = Number.parseInt(p[5].split(":")[0], 10);
            }
            // C#: EndTime == StartTime ? -1 : (int)EndTime
            const tail = endTime === time ? -1 : endTime;
            hitObjects.push({ col, head: time, tail });
        } else if (t.startsWith("Mode:")) {
            mode = t.slice(5).trim();
        } else if (t.startsWith("CircleSize:")) {
            circleSize = parseFloat(t.slice(11).trim());
        } else if (t.startsWith("OverallDifficulty:")) {
            od = parseFloat(t.slice(18).trim());
        }
    }

    // Sort by (head, column) then drop the first — C# CreateDifficultyHitObjects.
    hitObjects.sort((a, b) => (a.head !== b.head ? a.head - b.head : a.col - b.col));
    if (hitObjects.length > 0) hitObjects.shift();

    const columnCount = Math.max(1, Math.round(circleSize));
    return {
        mode,
        od: od || 0,
        columnCount,
        totalNotes: rawCount, // C# TotalNotes = HitObjects.Count (raw, incl. dropped)
        notes: hitObjects,
    };
}

// C# SunnySkill.DifficultyValue:
//   x = 0.3 * Math.Pow(greatHitWindow / 500.0, 0.5); x = Min(x, 0.6*(x-0.09)+0.09)
// ManiaDifficultyCalculator.getHitWindow300 (current ruleset, NM, clockRate=1):
//   anti_od = Min(10, Max(0, 10 - od)); value = 34 + 3*anti_od;
//   value *= clockRate; value += 1e-6; return ((int)value + 0.5) / clockRate
function refComputeX(od) {
    const antiOd = Math.min(10, Math.max(0, 10 - od));
    const greatHitWindow = Math.trunc(34 + 3 * antiOd + 1e-6) + 0.5;
    let x = 0.3 * Math.pow(greatHitWindow / 500.0, 0.5);
    x = Math.min(x, 0.6 * (x - 0.09) + 0.09);
    return x;
}

// C# LowerBound(list, value): first index at which list[index] >= value.
function refLowerBound(list, value) {
    let lo = 0;
    let hi = list.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (list[mid] < value) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// C# CumulativeSum + QueryCumsum + SmoothOnCorners.
function refCumulativeSum(x, f) {
    const n = x.length;
    const F = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
        F[i] = F[i - 1] + f[i - 1] * (x[i] - x[i - 1]);
    }
    return F;
}

function refQueryCumsum(q, x, F, f) {
    if (q <= x[0]) return 0.0;
    if (q >= x[x.length - 1]) return F[F.length - 1];
    let idx = refLowerBound(x, q);
    const i = idx - 1;
    return F[i] + f[i] * (q - x[i]);
}

function refSmoothOnCorners(x, f, window, scale, mode) {
    const n = f.length;
    const F = refCumulativeSum(x, f);
    const g = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        const s = x[i];
        const a = Math.max(s - window, x[0]);
        const b = Math.min(s + window, x[x.length - 1]);
        const val = refQueryCumsum(b, x, F, f) - refQueryCumsum(a, x, F, f);
        if (mode === "avg") g[i] = b - a > 0 ? val / (b - a) : 0.0;
        else g[i] = scale * val;
    }
    return g;
}

// C# InterpValues.
function refInterpValues(newX, oldX, oldVals) {
    const n = newX.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
        const xVal = newX[i];
        if (xVal <= oldX[0]) {
            out[i] = oldVals[0];
        } else if (xVal >= oldX[oldX.length - 1]) {
            out[i] = oldVals[oldVals.length - 1];
        } else {
            let idx = refLowerBound(oldX, xVal); // BinarySearch -> first >= xVal
            const j = idx - 1;
            const t = (xVal - oldX[j]) / (oldX[j + 1] - oldX[j]);
            out[i] = oldVals[j] + t * (oldVals[j + 1] - oldVals[j]);
        }
    }
    return out;
}

// C# StepInterp: BinarySearch; exact match -> previous sample (idx-1).
// After normalizing to the insertion point, ALWAYS take idx-1 (C# does
// `idx = ~idx; idx = idx - 1;` unconditionally).
function refStepInterp(newX, oldX, oldVals) {
    const n = newX.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
        const xVal = newX[i];
        let idx = refLowerBound(oldX, xVal) - 1;
        if (idx < 0) idx = 0;
        if (idx >= oldVals.length) idx = oldVals.length - 1;
        out[i] = oldVals[idx];
    }
    return out;
}

// C# MergeSorted (Xbar pair lists).
function refMergeSorted(list1, list2) {
    const merged = [];
    let i = 0;
    let j = 0;
    while (i < list1.length && j < list2.length) {
        if (list1[i].head <= list2[j].head) {
            merged.push(list1[i]);
            i++;
        } else {
            merged.push(list2[j]);
            j++;
        }
    }
    while (i < list1.length) merged.push(list1[i++]);
    while (j < list2.length) merged.push(list2[j++]);
    return merged;
}

// C# RaoQuadraticEntropyLog.
function refRaoQuadraticEntropyLog(values, logIterations = 1) {
    const valList = [...values];
    const counts = new Map();
    for (const v of valList) counts.set(v, (counts.get(v) ?? 0) + 1);
    const unique = [...counts.keys()];
    const totalCount = valList.length;
    const p = unique.map((k) => counts.get(k) / totalCount);
    const nUnique = unique.length;
    let Q = 0;
    for (let i = 0; i < nUnique; i++) {
        for (let j = 0; j < nUnique; j++) {
            let acc = Math.abs(unique[i] - unique[j]);
            for (let k = 0; k < logIterations; k++) acc = Math.log(1 + acc);
            Q += p[i] * p[j] * acc;
        }
    }
    return Q;
}

// C# MACalculator.Variety.
function refVariety(noteSeq, noteSeqByColumn) {
    const tailSeq = [...noteSeq].sort((a, b) => a.tail - b.tail);
    const headGaps = [];
    for (let i = 0; i < noteSeq.length - 1; i++) headGaps.push(noteSeq[i + 1].head - noteSeq[i].head);
    const tailGaps = [];
    for (let i = 0; i < tailSeq.length - 1; i++) tailGaps.push(tailSeq[i + 1].tail - tailSeq[i].tail);
    const headVariety = refRaoQuadraticEntropyLog(headGaps, 1);
    const tailVariety = refRaoQuadraticEntropyLog(tailGaps, 1);
    const headGapsNew = [];
    for (let k = 0; k < noteSeqByColumn.length; k++) {
        const heads = noteSeqByColumn[k];
        for (let i = 0; i < heads.length - 1; i++) headGapsNew.push(heads[i + 1].head - heads[i].head);
    }
    const colVariety = 2.5 * refRaoQuadraticEntropyLog(headGapsNew, 2);
    return 0.5 * headVariety + 0.11 * tailVariety + 0.45 * colVariety;
}

// C# MACalculator.Switches.
function refSwitches(noteSeq, tailSeq, allCorners, ksArr, weights) {
    const heads = noteSeq.map((n) => n.head);
    const idxList = heads.map((h) => refLowerBound(allCorners, h));
    const ksArrAtNote = idxList.slice(0, idxList.length - 1).map((i) => ksArr[i]);
    const weightsAtNote = idxList.slice(0, idxList.length - 1).map((i) => weights[i]);
    const headGaps = [];
    for (let i = 0; i < heads.length - 1; i++) headGaps.push(heads[i + 1] - heads[i]);
    const numHeadGaps = headGaps.length;
    const avgs = [];
    for (let i = 0; i < numHeadGaps; i++) {
        const start = Math.max(0, i - 50);
        const end = Math.min(i + 50, numHeadGaps - 1);
        let sum = 0;
        let count = 0;
        for (let j = start; j <= end; j++) {
            sum += headGaps[j];
            count++;
        }
        avgs.push(sum / count);
    }
    let signatureHead = 0;
    for (let i = 0; i < numHeadGaps; i++) {
        signatureHead += Math.sqrt((headGaps[i] / avgs[i] / numHeadGaps) * weightsAtNote[i])
            * Math.pow(ksArrAtNote[i], 0.25);
    }
    let sumRefHead = 0;
    for (let i = 0; i < numHeadGaps; i++) sumRefHead += (headGaps[i] / avgs[i]) * weightsAtNote[i];
    const refSignatureHead = Math.sqrt(sumRefHead);

    const tails = tailSeq.map((n) => n.tail);
    const idxListTails = tails.map((t) => refLowerBound(allCorners, t));
    const ksArrAtTail = idxListTails.slice(0, idxListTails.length - 1).map((i) => ksArr[i]);
    const weightsAtTail = idxListTails.slice(0, idxListTails.length - 1).map((i) => weights[i]);
    const tailGaps = [];
    for (let i = 0; i < tails.length - 1; i++) tailGaps.push(tails[i + 1] - tails[i]);

    let signatureTail = 0;
    let refSignatureTail = 0;
    if (tails.length > 0 && tails[tails.length - 1] > tails[0] && tailGaps.length > 0) {
        const numTailGaps = tailGaps.length;
        const avgsTail = [];
        for (let i = 0; i < numTailGaps; i++) {
            const start = Math.max(0, i - 50);
            const end = Math.min(i + 50, numTailGaps - 1);
            let sum = 0;
            let count = 0;
            for (let j = start; j <= end; j++) {
                sum += tailGaps[j];
                count++;
            }
            avgsTail.push(sum / count);
        }
        for (let i = 0; i < numTailGaps; i++) {
            signatureTail += Math.sqrt((tailGaps[i] / avgsTail[i] / numTailGaps) * weightsAtTail[i])
                * Math.pow(ksArrAtTail[i], 0.25);
        }
        let sumRefTail = 0;
        for (let i = 0; i < numTailGaps; i++) sumRefTail += (tailGaps[i] / avgsTail[i]) * weightsAtTail[i];
        refSignatureTail = Math.sqrt(sumRefTail);
    }

    const numerator = signatureHead * numHeadGaps + signatureTail * tailGaps.length;
    const denominator = refSignatureHead * numHeadGaps + refSignatureTail * tailGaps.length;
    return numerator / denominator / 2.0 + 0.5;
}

// C# MACalculator.Calculate + SunnySkill.DifficultyValue + ppMetrics.
// Returns { sr, spikiness, switches, variety, accScalar }.
function refMACalculate(noteSeq, keyCount, x, containsCL) {
    const lambdaN = 5;
    const lambda1 = 0.11;
    const lambda3 = 24.0;
    const lambda2 = 6.0;
    const lambda4 = 0.8;
    const w0 = 0.4;
    const w1 = 2.7;
    const p1 = 1.5;
    const w2 = 0.27;

    // Re-sort (no-op: caller already sorted) + per-column grouping + ColumnIndex.
    noteSeq.sort((a, b) => (a.head !== b.head ? a.head - b.head : a.col - b.col));
    const noteDict = [];
    for (let k = 0; k < keyCount; k++) noteDict.push([]);
    for (const n of noteSeq) noteDict[n.col].push(n);
    for (const list of noteDict) {
        for (let i = 0; i < list.length; i++) list[i].columnIndex = i;
    }

    const LNSeq = noteSeq.filter((n) => n.tail >= 0);
    const tailSeq = [...LNSeq].sort((a, b) => a.tail - b.tail);

    const maxHead = Math.max(...noteSeq.map((n) => n.head));
    const maxTail = Math.max(...noteSeq.map((n) => n.tail));
    const T = Math.max(maxHead, maxTail) + 1;

    // Corners.
    const cornersBase = new Set();
    for (const n of noteSeq) {
        cornersBase.add(n.head);
        if (n.tail >= 0) cornersBase.add(n.tail);
    }
    for (const s of [...cornersBase]) {
        cornersBase.add(s + 501);
        cornersBase.add(s - 499);
        cornersBase.add(s + 1);
    }
    cornersBase.add(0);
    cornersBase.add(T);
    const cornersBaseList = [...cornersBase].filter((s) => s >= 0 && s <= T).sort((a, b) => a - b);

    const cornersA = new Set();
    for (const n of noteSeq) {
        cornersA.add(n.head);
        if (n.tail >= 0) cornersA.add(n.tail);
    }
    for (const s of [...cornersA]) {
        cornersA.add(s + 1000);
        cornersA.add(s - 1000);
    }
    cornersA.add(0);
    cornersA.add(T);
    const cornersAList = [...cornersA].filter((s) => s >= 0 && s <= T).sort((a, b) => a - b);

    const allCornersSet = new Set(cornersBaseList);
    for (const s of cornersAList) allCornersSet.add(s);
    const allCorners = [...allCornersSet].sort((a, b) => a - b);

    // Key usage.
    const keyUsage = [];
    for (let k = 0; k < keyCount; k++) keyUsage.push(new Array(cornersBaseList.length).fill(false));
    for (let k = 0; k < keyCount; k++) {
        for (const note of noteDict[k]) {
            const activeStart = Math.max(note.head - 150, 0);
            const activeEnd = note.tail < 0 ? note.head + 150 : Math.min(note.tail + 150, T - 1);
            let idx = refLowerBound(cornersBaseList, activeStart);
            while (idx < cornersBaseList.length && cornersBaseList[idx] < activeEnd) {
                keyUsage[k][idx] = true;
                idx++;
            }
        }
    }
    const kuCols = [];
    for (let i = 0; i < cornersBaseList.length; i++) {
        const active = [];
        for (let k = 0; k < keyCount; k++) if (keyUsage[k][i]) active.push(k);
        kuCols.push(active);
    }

    // Key usage 400 + anchor.
    const keyUsage400 = [];
    for (let k = 0; k < keyCount; k++) keyUsage400.push(new Array(cornersBaseList.length).fill(0));
    for (let k = 0; k < keyCount; k++) {
        for (const note of noteDict[k]) {
            const activeStart = Math.max(note.head, 0);
            const activeEnd = note.tail < 0 ? note.head : Math.min(note.tail, T - 1);
            let start400Idx = refLowerBound(cornersBaseList, activeStart - 400);
            let startIdx = refLowerBound(cornersBaseList, activeStart);
            let end400Idx = refLowerBound(cornersBaseList, activeEnd + 400);
            let endIdx = refLowerBound(cornersBaseList, activeEnd);

            for (let i = startIdx; i < endIdx; i++) {
                keyUsage400[k][i] += 3.75 + Math.min(activeEnd - activeStart, 1500) / 150;
            }
            for (let i = start400Idx; i < startIdx; i++) {
                keyUsage400[k][i] += 3.75 - 3.75 / Math.pow(400, 2) * Math.pow(cornersBaseList[i] - activeStart, 2);
            }
            for (let i = endIdx; i < end400Idx; i++) {
                keyUsage400[k][i] += 3.75 - 3.75 / Math.pow(400, 2) * Math.pow(Math.abs(cornersBaseList[i] - activeEnd), 2);
            }
        }
    }

    const anchor = new Array(cornersBaseList.length).fill(0);
    for (let i = 0; i < cornersBaseList.length; i++) {
        const counts = [];
        for (let k = 0; k < keyCount; k++) counts.push(keyUsage400[k][i]);
        counts.sort((a, b) => a - b);
        counts.reverse();
        const nonZeroCounts = counts.filter((c) => c > 0);
        const countLength = nonZeroCounts.length;
        if (countLength > 1) {
            let walk = 0;
            for (let j = 0; j < countLength - 1; j++) {
                walk += nonZeroCounts[j] * (1 - 4 * Math.pow(0.5 - nonZeroCounts[j + 1] / nonZeroCounts[j], 2));
            }
            let maxWalk = 0;
            for (let j = 0; j < countLength - 1; j++) maxWalk += nonZeroCounts[j];
            anchor[i] = walk / maxWalk;
        }
    }
    for (let i = 0; i < anchor.length; i++) {
        anchor[i] = 1 + Math.min(anchor[i] - 0.18, 5 * Math.pow(anchor[i] - 0.22, 3));
    }

    // Jbar.
    const jackNerfer = (delta) => 1 - 7e-5 * Math.pow(0.15 + Math.abs(delta - 0.08), -4);
    const Jks = [];
    const deltaKs = [];
    for (let k = 0; k < keyCount; k++) {
        Jks.push(new Array(cornersBaseList.length).fill(0));
        deltaKs.push(new Array(cornersBaseList.length).fill(1e9));
    }
    for (let k = 0; k < keyCount; k++) {
        const notes = noteDict[k];
        let pointer = 0;
        for (let i = 0; i < notes.length - 1; i++) {
            const start = notes[i].head;
            const end = notes[i + 1].head;
            const delta = 0.001 * (end - start);
            const val = (1.0 / delta) * (1.0 / (delta + lambda1 * Math.pow(x, 0.25)));
            const jVal = val * jackNerfer(delta);
            while (pointer < cornersBaseList.length && cornersBaseList[pointer] < start) pointer++;
            while (pointer < cornersBaseList.length && cornersBaseList[pointer] < end) {
                Jks[k][pointer] = jVal;
                deltaKs[k][pointer] = delta;
                pointer++;
            }
        }
    }
    const JbarKs = Jks.map((jarr, k) => refSmoothOnCorners(cornersBaseList, jarr, 500, 0.001, "sum"));
    const JbarBase = new Array(cornersBaseList.length).fill(0);
    for (let j = 0; j < cornersBaseList.length; j++) {
        let num = 0;
        let den = 0;
        for (let k = 0; k < keyCount; k++) {
            const v = Math.max(JbarKs[k][j], 0);
            const weight = 1.0 / deltaKs[k][j];
            num += Math.pow(v, lambdaN) * weight;
            den += weight;
        }
        const avg = num / Math.max(1e-9, den);
        JbarBase[j] = Math.pow(avg, 1.0 / lambdaN);
    }
    const Jbar = refInterpValues(allCorners, cornersBaseList, JbarBase);

    // Xbar.
    const crossMatrix = [
        [-1],
        [0.075, 0.075],
        [0.125, 0.05, 0.125],
        [0.125, 0.125, 0.125, 0.125],
        [0.175, 0.25, 0.05, 0.25, 0.175],
        [0.175, 0.25, 0.175, 0.175, 0.25, 0.175],
        [0.225, 0.35, 0.25, 0.05, 0.25, 0.35, 0.225],
        [0.225, 0.35, 0.25, 0.225, 0.225, 0.25, 0.35, 0.225],
        [0.275, 0.45, 0.35, 0.25, 0.05, 0.25, 0.35, 0.45, 0.275],
        [0.275, 0.45, 0.35, 0.25, 0.275, 0.275, 0.25, 0.35, 0.45, 0.275],
        [0.325, 0.55, 0.45, 0.35, 0.25, 0.05, 0.25, 0.35, 0.45, 0.55, 0.325],
    ];
    const fastCross = [];
    const Xks = [];
    for (let k = 0; k <= keyCount; k++) {
        fastCross.push(new Array(cornersBaseList.length).fill(0));
        Xks.push(new Array(cornersBaseList.length).fill(0));
    }
    const crossVal = (k) => (keyCount < crossMatrix.length ? crossMatrix[keyCount][k] : 0.4);

    for (let k = 0; k <= keyCount; k++) {
        let notesInPair;
        if (k === 0) notesInPair = noteDict[0];
        else if (k === keyCount) notesInPair = noteDict[keyCount - 1];
        else notesInPair = refMergeSorted(noteDict[k - 1], noteDict[k]);

        let pointer = 0;
        for (let i = 1; i < notesInPair.length; i++) {
            const start = notesInPair[i - 1].head;
            const end = notesInPair[i].head;
            const delta = 0.001 * (end - start);
            let val = 0.16 * Math.pow(Math.max(x, delta), -2);

            while (pointer < cornersBaseList.length && cornersBaseList[pointer] < start) pointer++;
            const pointerStart = pointer;
            while (pointer < cornersBaseList.length && cornersBaseList[pointer] < end) pointer++;
            const pointerEnd = pointer;

            const cv = crossVal(k);
            const leftKeyNotPresent = !kuCols[pointerStart].includes(k - 1) && !kuCols[pointerEnd].includes(k - 1);
            const keyNotPresent = !kuCols[pointerStart].includes(k) && !kuCols[pointerEnd].includes(k);
            if (leftKeyNotPresent || keyNotPresent) val *= 1 - cv;

            for (let p = pointerStart; p < pointerEnd; p++) {
                Xks[k][p] = val;
                fastCross[k][p] = Math.max(0, 0.4 * Math.pow(Math.max(Math.max(delta, 0.06), 0.75 * x), -2) - 80);
            }
        }
    }
    const Xbase = new Array(cornersBaseList.length).fill(0);
    for (let i = 0; i < cornersBaseList.length; i++) {
        let sum1 = 0;
        for (let k = 0; k <= keyCount; k++) sum1 += Xks[k][i] * crossVal(k);
        let sum2 = 0;
        for (let k = 0; k < keyCount; k++) {
            sum2 += Math.sqrt(fastCross[k][i] * crossVal(k) * fastCross[k + 1][i] * crossVal(k + 1));
        }
        Xbase[i] = sum1 + sum2;
    }
    const XbarBase = refSmoothOnCorners(cornersBaseList, Xbase, 500, 0.001, "sum");
    const Xbar = refInterpValues(allCorners, cornersBaseList, XbarBase);

    // Pbar (per-ms LN bodies, faithful to C#).
    const LNBodies = new Array(T).fill(0);
    for (const note of LNSeq) {
        const h = note.head;
        const t = note.tail;
        const t0 = Math.min(h + 60, t);
        const t1 = Math.min(h + 120, t);
        for (let i = t0; i < t1; i++) LNBodies[i] += 1.3;
        for (let i = t1; i < t; i++) LNBodies[i] += 1.0;
    }
    for (let i = 0; i < LNBodies.length; i++) {
        LNBodies[i] = Math.min(LNBodies[i], 2.5 + 0.5 * LNBodies[i]);
    }
    const cumsumLN = new Array(T + 1).fill(0);
    for (let i = 1; i <= T; i++) cumsumLN[i] = cumsumLN[i - 1] + LNBodies[i - 1];
    const lnSum = (a, b) => cumsumLN[b] - cumsumLN[a];

    const streamBooster = (delta) => {
        const val = 7.5 / delta;
        if (val > 160 && val < 360) return 1 + 1.7e-7 * (val - 160) * Math.pow(val - 360, 2);
        return 1.0;
    };

    const pStep = new Array(cornersBaseList.length).fill(0);
    let pointerP = 0;
    for (let i = 0; i < noteSeq.length - 1; i++) {
        const hL = noteSeq[i].head;
        const hR = noteSeq[i + 1].head;
        const deltaTime = hR - hL;

        if (deltaTime < 1e-9) {
            let idx = refLowerBound(cornersBaseList, hL);
            if (idx < cornersBaseList.length && Math.abs(cornersBaseList[idx] - hL) < 1e-9) {
                const spike = 1000 * Math.pow(0.02 * (4 / x - lambda3), 0.25);
                pStep[idx] += spike;
            }
            continue;
        }

        const delta = 0.001 * deltaTime;
        const v = 1 + lambda2 * 0.001 * lnSum(hL, hR);
        const bVal = streamBooster(delta);
        let inc;
        if (delta < (2 * x) / 3) {
            inc = (1.0 / delta) * Math.pow(0.08 * (1.0 / x) * (1 - lambda3 * (1.0 / x) * Math.pow(delta - x / 2, 2)), 0.25) * Math.max(bVal, v);
        } else {
            inc = (1.0 / delta) * Math.pow(0.08 * (1.0 / x) * (1 - lambda3 * (1.0 / x) * Math.pow(x / 6, 2)), 0.25) * Math.max(bVal, v);
        }
        while (pointerP < cornersBaseList.length && cornersBaseList[pointerP] < hL) pointerP++;
        while (pointerP < cornersBaseList.length && cornersBaseList[pointerP] < hR) {
            pStep[pointerP] += Math.min(inc * anchor[pointerP], Math.max(inc, inc * 2 - 10));
            pointerP++;
        }
    }
    const pbarBase = refSmoothOnCorners(cornersBaseList, pStep, 500, 0.001, "sum");
    const Pbar = refInterpValues(allCorners, cornersBaseList, pbarBase);

    // Abar.
    const dks = [];
    for (let k = 0; k < keyCount - 1; k++) dks.push(new Array(cornersBaseList.length).fill(0));
    for (let i = 0; i < cornersBaseList.length; i++) {
        const cols = kuCols[i];
        for (let j = 0; j < cols.length - 1; j++) {
            const k0 = cols[j];
            const k1 = cols[j + 1];
            dks[k0][i] = Math.abs(deltaKs[k0][i] - deltaKs[k1][i])
                + 0.4 * Math.max(0, Math.max(deltaKs[k0][i], deltaKs[k1][i]) - 0.11);
        }
    }
    const aStep = new Array(cornersAList.length).fill(1);
    for (let i = 0; i < cornersAList.length; i++) {
        const s = cornersAList[i];
        let idx = refLowerBound(cornersBaseList, s);
        if (idx >= cornersBaseList.length) idx = cornersBaseList.length - 1;
        const cols = kuCols[idx];
        for (let j = 0; j < cols.length - 1; j++) {
            const k0 = cols[j];
            const k1 = cols[j + 1];
            const dVal = dks[k0][idx];
            if (dVal < 0.02) {
                aStep[i] *= Math.min(0.75 + 0.5 * Math.max(deltaKs[k0][idx], deltaKs[k1][idx]), 1);
            } else if (dVal < 0.07) {
                aStep[i] *= Math.min(0.65 + 5 * dVal + 0.5 * Math.max(deltaKs[k0][idx], deltaKs[k1][idx]), 1);
            }
        }
    }
    const abarA = refSmoothOnCorners(cornersAList, aStep, 250, 1.0, "avg");
    const Abar = refInterpValues(allCorners, cornersAList, abarA);

    // Rbar.
    const iList = new Array(tailSeq.length).fill(0);
    for (let ni = 0; ni < tailSeq.length; ni++) {
        const currentNote = tailSeq[ni];
        const nextNoteIndex = currentNote.columnIndex + 1;
        const nextNoteExists = nextNoteIndex < noteDict[currentNote.col].length;
        const currentI = 0.001 * Math.abs(currentNote.tail - currentNote.head - 80.0) / x;
        if (!nextNoteExists) {
            iList[ni] = 2 / (2 + Math.exp(-5 * (currentI - 0.75)));
            continue;
        }
        const nextNote = noteDict[currentNote.col][nextNoteIndex];
        const nextI = 0.001 * Math.abs(nextNote.head - currentNote.tail - 80.0) / x;
        iList[ni] = 2 / (2 + Math.exp(-5 * (currentI - 0.75)) + Math.exp(-5 * (nextI - 0.75)));
    }
    const rBase = new Array(cornersBaseList.length).fill(0);
    let prevIdxStart = 0;
    for (let i = 0; i < tailSeq.length - 1; i++) {
        const note = tailSeq[i];
        const nextNote = tailSeq[i + 1];
        const startTime = note.tail;
        const endTime = nextNote.tail;
        let idxStart = -1;
        for (let j = prevIdxStart; j < cornersBaseList.length; j++) {
            if (cornersBaseList[j] >= startTime) {
                idxStart = j;
                prevIdxStart = j;
                break;
            }
        }
        if (idxStart === -1) continue;
        const deltaR = 0.001 * (nextNote.tail - note.tail);
        for (let j = idxStart; j < cornersBaseList.length; j++) {
            if (cornersBaseList[j] >= endTime) break;
            rBase[j] = 0.08 * Math.pow(deltaR, -1.0 / 2.0) * (1 / x) * (1 + lambda4 * (iList[i] + iList[i + 1]));
        }
    }
    const rbarBase = refSmoothOnCorners(cornersBaseList, rBase, 500, 0.001, "sum");
    const Rbar = refInterpValues(allCorners, cornersBaseList, rbarBase);

    // C / C_arr / C_arrV2 / Ks.
    const noteHitTimes = noteSeq.map((n) => n.head).sort((a, b) => a - b);
    const noteHitTimesV2 = noteSeq
        .flatMap((n) => (n.tail >= 0 ? [n.head, n.tail] : [n.head]))
        .sort((a, b) => a - b);
    const cStep = new Array(cornersBaseList.length).fill(0);
    const cStepV2 = new Array(cornersBaseList.length).fill(0);
    for (let i = 0; i < cornersBaseList.length; i++) {
        const s = cornersBaseList[i];
        const low = s - 500;
        const high = s + 500;
        cStep[i] = refLowerBound(noteHitTimes, high) - refLowerBound(noteHitTimes, low);
        cStepV2[i] = refLowerBound(noteHitTimesV2, high) - refLowerBound(noteHitTimesV2, low);
    }
    const cArr = refStepInterp(allCorners, cornersBaseList, cStep);
    const cArrV2 = refStepInterp(allCorners, cornersBaseList, cStepV2);

    const ksStep = new Array(cornersBaseList.length).fill(0);
    for (let i = 0; i < cornersBaseList.length; i++) {
        let cnt = 0;
        for (let k = 0; k < keyCount; k++) if (keyUsage[k][i]) cnt++;
        ksStep[i] = Math.max(cnt, 1);
    }
    const ksArr = refStepInterp(allCorners, cornersBaseList, ksStep);

    // D_all (uses C_arr — head-only — matching C#).
    const N = allCorners.length;
    const dAll = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
        const aVal = Abar[i];
        const jVal = Jbar[i];
        const xVal = Xbar[i];
        const pVal = Pbar[i];
        const rVal = Rbar[i];
        const cVal = cArr[i];
        const ksVal = ksArr[i];

        const term1 = Math.pow(Math.pow(aVal, 3.0 / ksVal) * Math.min(jVal, 8 + 0.85 * jVal), 1.5);
        const term2 = Math.pow(Math.pow(aVal, 2.0 / 3.0) * (0.8 * pVal + rVal * 35.0 / (cVal + 8)), 1.5);
        const sVal = Math.pow(w0 * term1 + (1 - w0) * term2, 2.0 / 3.0);
        const tVal = (Math.pow(aVal, 3.0 / ksVal) * xVal) / (xVal + sVal + 1);
        dAll[i] = w1 * Math.pow(sVal, 0.5) * Math.pow(tVal, p1) + sVal * w2;
    }

    // Gaps + effectiveWeights (ContainsCL ? C_arr : C_arrV2).
    const gaps = new Array(N).fill(0);
    if (N === 1) {
        gaps[0] = 0;
    } else {
        gaps[0] = (allCorners[1] - allCorners[0]) / 2.0;
        gaps[N - 1] = (allCorners[N - 1] - allCorners[N - 2]) / 2.0;
        for (let i = 1; i < N - 1; i++) gaps[i] = (allCorners[i + 1] - allCorners[i - 1]) / 2.0;
    }
    const sourceC = containsCL ? cArr : cArrV2;
    const effectiveWeights = new Array(N);
    for (let i = 0; i < N; i++) effectiveWeights[i] = sourceC[i] * gaps[i];

    // Weighted percentile calculation (stable sort by D).
    const cornerOrder = allCorners.map((_, i) => i).sort((a, b) => dAll[a] - dAll[b]);
    const dSorted = cornerOrder.map((i) => dAll[i]);
    const wSorted = cornerOrder.map((i) => effectiveWeights[i]);
    const cumWeights = new Array(N).fill(0);
    let sumW = 0;
    for (let i = 0; i < N; i++) {
        sumW += wSorted[i];
        cumWeights[i] = sumW;
    }
    const totalWeight = sumW;
    const normCumWeights = cumWeights.map((cw) => cw / totalWeight);

    const targetPercentiles = [0.945, 0.935, 0.925, 0.915, 0.845, 0.835, 0.825, 0.815];
    const indices = [];
    for (const tp of targetPercentiles) {
        let idx = normCumWeights.findIndex((cw) => cw >= tp);
        if (idx < 0) idx = N - 1;
        indices.push(idx);
    }

    let percentile93;
    let percentile83;
    if (indices.length >= 8) {
        let sum93 = 0;
        for (let i = 0; i < 4; i++) sum93 += dSorted[indices[i]];
        percentile93 = sum93 / 4.0;
        let sum83 = 0;
        for (let i = 4; i < 8; i++) sum83 += dSorted[indices[i]];
        percentile83 = sum83 / 4.0;
    } else {
        percentile93 = dSorted.reduce((a, b) => a + b, 0) / dSorted.length;
        percentile83 = percentile93;
    }

    let numWeighted = 0;
    let denWeighted = 0;
    for (let i = 0; i < N; i++) {
        numWeighted += Math.pow(dSorted[i], lambdaN) * wSorted[i];
        denWeighted += wSorted[i];
    }
    const weightedMean = Math.pow(numWeighted / denWeighted, 1.0 / lambdaN);

    let SR = (0.88 * percentile93) * 0.25 + (0.94 * percentile83) * 0.2 + weightedMean * 0.55;
    // p0 = 1.0 -> identity (Math.Pow(SR,1)/Math.Pow(8,1)*8 == SR); omitted.

    // Length weighting.
    let totalNotesW = noteSeq.length;
    for (const ln of LNSeq) totalNotesW += 0.5 * Math.min(ln.tail - ln.head, 1000) / 200.0;
    SR *= totalNotesW / (totalNotesW + 60);
    SR = refRescaleHigh(SR);
    SR *= 0.975;

    // Spikiness.
    let varianceSumTop = 0;
    for (let i = 0; i < dSorted.length; i++) {
        varianceSumTop += Math.pow(Math.pow(dSorted[i], 8) - Math.pow(weightedMean, 8), 2) * wSorted[i];
    }
    const weightedVariance = Math.pow(varianceSumTop / denWeighted, 1.0 / 8.0);
    const spikiness = Math.sqrt(weightedVariance) / weightedMean;

    const switches = refSwitches(noteSeq, tailSeq, allCorners, ksArr, dAll);
    const variety = refVariety(noteSeq, noteDict);
    const accScalar = 0.5 * spikiness + 0.5 * switches;

    return { sr: SR, spikiness, switches, variety, accScalar };
}

// C# rescaleHigh.
function refRescaleHigh(sr) {
    if (sr <= 9) return sr;
    return 9 + (sr - 9) * (1.0 / 1.2);
}

// Reference .osu -> noteSeq + compute star/metrics (full C# chain).
function refCalculate(osuText, classicMod) {
    const parsed = refParseOsu(osuText);
    if (parsed.mode !== "3" || parsed.columnCount <= 0) {
        return { status: "skip", reason: `mode=${parsed.mode} cols=${parsed.columnCount}` };
    }
    if (parsed.notes.length === 0) {
        return { status: "skip", reason: "no notes" };
    }
    const x = refComputeX(parsed.od);
    const res = refMACalculate(parsed.notes, parsed.columnCount, x, classicMod === true);
    return { status: "ok", ...res, totalNotes: parsed.totalNotes };
}

// C# ManiaPerformanceCalculator — pure arithmetic chain.
function refPp({ star, variety, accScalar, totalNotes, perfect, great, good, ok, meh, miss, noFail = false, easy = false }) {
    const totalHits = perfect + great + good + ok + meh + miss;
    const v2Acc = totalHits === 0 ? 0 : (perfect * 305 + great * 300 + good * 200 + ok * 100 + meh * 50) / (totalHits * 305);

    let multiplier = 1.0;
    if (noFail) multiplier *= 0.75;
    if (easy) multiplier *= 0.90;

    let proportion = 0;
    if (v2Acc > 0.8) {
        proportion = 4.5 * (v2Acc - 0.8) / Math.pow(100 * (1 - v2Acc) + Math.pow(0.9, 20), 0.05);
    }
    const difficultyValue = 9.8 * Math.pow(Math.max(star - 0.15, 0.05), 2.2) * proportion;

    const floor = 0.945;
    const cap = 1.055;
    const L = cap - floor;
    const v0 = 3.25;
    const k = 3;
    const varietyMult = floor + L / (1 + Math.exp(-k * (variety - v0)));

    const sigmoidScaler = 0.87 + 0.26 / (1 + Math.exp(-20 * (accScalar - 1)));
    const accMult = sigmoidScaler * (2 * Math.pow(v2Acc, 20) - 1) + 2 - 2 * Math.pow(v2Acc, 20);

    const lengthMult = 1.1 / (1 + Math.sqrt(star / (2 * totalNotes)));

    const pp = difficultyValue * multiplier * varietyMult * accMult * lengthMult;
    return { pp, v2Acc, proportion, accMultiplier: accMult, varietyMultiplier: varietyMult, lengthMultiplier: lengthMult };
}

// ---------------------------------------------------------------------------
// Comparison harness
// ---------------------------------------------------------------------------
let exactCount = 0;
let ulpCount = 0;
let failCount = 0;
let totalChecks = 0;
let maxDev = 0;
let maxDevKey = "";
const fails = [];
const report = [];
const t0 = Date.now();

// Per-field ULP-level max dev tracking for the report.
const fieldMaxDev = new Map();

function trackFieldDev(key, d) {
    const field = key.split("] ").pop() ?? key; // last fragment = actual value name
    const cur = fieldMaxDev.get(field) ?? 0;
    if (d > cur) fieldMaxDev.set(field, d);
}

function relDev(a, b) {
    if (a === b) return 0;
    return Math.abs(a - b) / Math.abs(b);
}

function checkComplex(key, prodVal, refVal) {
    totalChecks++;
    if (Object.is(prodVal, refVal)) {
        exactCount++;
    } else {
        const d = relDev(prodVal, refVal);
        if (d <= 1e-12) {
            ulpCount++;
            trackFieldDev(key, d);
            if (d > maxDev) {
                maxDev = d;
                maxDevKey = key;
            }
        } else {
            failCount++;
            fails.push(`${key}: prod=${prodVal} ref=${refVal} relDev=${d}`);
        }
    }
}

function checkExact(key, prodVal, refVal) {
    totalChecks++;
    if (Object.is(prodVal, refVal)) {
        exactCount++;
    } else {
        failCount++;
        fails.push(`${key}: prod=${prodVal} ref=${refVal} (not bitwise equal)`);
    }
}

function collectSamples() {
    const out = [];
    const dirs = readdirSync(SAMPLES_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name));
    for (const dir of dirs) {
        const full = path.join(SAMPLES_ROOT, dir.name);
        const files = readdirSync(full)
            .filter((f) => f.endsWith(".osu"))
            .sort((a, b) => a.localeCompare(b));
        for (const f of files) out.push({ pattern: dir.name, file: f, path: path.join(full, f) });
    }
    return out;
}

function makeCounts(totalNotes, tier) {
    // tier 0: 100% (all perfect); tier 1: ~95% (miss = round(5%)); tier 2: ~90%
    if (tier === 0) return { perfect: totalNotes, great: 0, good: 0, ok: 0, meh: 0, miss: 0 };
    const miss = Math.round(totalNotes * (tier === 1 ? 0.05 : 0.10));
    return { perfect: totalNotes - miss, great: 0, good: 0, ok: 0, meh: 0, miss };
}

const samples = collectSamples();
const runSamples = Number.isFinite(limit) ? samples.slice(0, limit) : samples;
console.log(`samples found: ${samples.length}, running: ${runSamples.length}`);

for (const { pattern, file, path: samplePath } of runSamples) {
    const osuText = readFileSync(samplePath, "utf8");
    for (const classicMod of [false, true]) {
        const keyPrefix = `[${pattern}/${file} classic=${classicMod}]`;

        // ---- production side ----
        const prodRaw = productionSunnyCalculate(osuText, 1.0, null, null, {
            classicMod,
            withPpMetrics: true,
        });
        if (typeof prodRaw === "number") {
            report.push(`${keyPrefix} SKIP (production returned ${prodRaw})`);
            continue;
        }
        const prodPpMetrics = prodRaw.ppMetrics ?? {};

        // ---- reference side ----
        const refRaw = refCalculate(osuText, classicMod);
        if (refRaw.status !== "ok") {
            report.push(`${keyPrefix} SKIP (reference: ${refRaw.reason})`);
            continue;
        }

        // 1. star + ppMetrics (complex pipeline, <= 1e-12 relative)
        checkComplex(`${keyPrefix} star`, prodRaw.star, refRaw.sr);
        checkComplex(`${keyPrefix} variety`, prodPpMetrics.variety, refRaw.variety);
        checkComplex(`${keyPrefix} accScalar`, prodPpMetrics.accScalar, refRaw.accScalar);
        checkComplex(`${keyPrefix} spikiness`, prodPpMetrics.spikiness, refRaw.spikiness);
        checkComplex(`${keyPrefix} switches`, prodPpMetrics.switches, refRaw.switches);
        checkComplex(`${keyPrefix} totalNotes`, prodPpMetrics.totalNotes, refRaw.totalNotes);

        // 2-5. PP values — both sides get the SAME attribute tuple + counts.
        const attrs = {
            starRating: prodRaw.star, // production calculateReworkPp param name
            variety: prodPpMetrics.variety,
            accScalar: prodPpMetrics.accScalar,
            totalNotes: prodPpMetrics.totalNotes,
        };
        const refAttrs = {
            star: prodRaw.star,
            variety: prodPpMetrics.variety,
            accScalar: prodPpMetrics.accScalar,
            totalNotes: prodPpMetrics.totalNotes,
        };
        const n = attrs.totalNotes;
        if (!Number.isFinite(n) || n <= 0) {
            report.push(`${keyPrefix} SKIP (totalNotes=${n})`);
            continue;
        }

        // Max PP.
        const maxCounts = { perfect: n, great: 0, good: 0, ok: 0, meh: 0, miss: 0 };
        const prodMax = productionReworkPp({ ...attrs, ...maxCounts });
        const refMax = refPp({ ...refAttrs, ...maxCounts });
        checkExact(`${keyPrefix} MaxPP pp`, prodMax.pp, refMax.pp);
        checkExact(`${keyPrefix} MaxPP v2Acc`, prodMax.v2Acc, refMax.v2Acc);
        checkExact(`${keyPrefix} MaxPP proportion`, prodMax.proportion, refMax.proportion);
        checkExact(`${keyPrefix} MaxPP varietyMultiplier`, prodMax.varietyMultiplier, refMax.varietyMultiplier);
        checkExact(`${keyPrefix} MaxPP accMultiplier`, prodMax.accMultiplier, refMax.accMultiplier);
        checkExact(`${keyPrefix} MaxPP lengthMultiplier`, prodMax.lengthMultiplier, refMax.lengthMultiplier);

        // Live PP x3 tiers.
        for (let tier = 0; tier < 3; tier++) {
            const counts = makeCounts(n, tier);
            const prodLive = productionReworkPp({ ...attrs, ...counts });
            const refLive = refPp({ ...refAttrs, ...counts });
            const tierName = ["100%", "95%", "90%"][tier];
            checkExact(`${keyPrefix} LivePP(${tierName}) pp`, prodLive.pp, refLive.pp);
            checkExact(`${keyPrefix} LivePP(${tierName}) v2Acc`, prodLive.v2Acc, refLive.v2Acc);
            checkExact(`${keyPrefix} LivePP(${tierName}) proportion`, prodLive.proportion, refLive.proportion);
            checkExact(`${keyPrefix} LivePP(${tierName}) varietyMultiplier`, prodLive.varietyMultiplier, refLive.varietyMultiplier);
            checkExact(`${keyPrefix} LivePP(${tierName}) accMultiplier`, prodLive.accMultiplier, refLive.accMultiplier);
            checkExact(`${keyPrefix} LivePP(${tierName}) lengthMultiplier`, prodLive.lengthMultiplier, refLive.lengthMultiplier);
        }
    }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
const summary = `PARITY: ${exactCount}/${totalChecks} PASS (exact) + ${ulpCount}/${totalChecks} ULP-LEVEL (max dev ${maxDev}${maxDevKey ? " @ " + maxDevKey : ""}) + ${failCount} FAIL`;

console.log("");
console.log(summary);
console.log(`elapsed: ${elapsed}s, max rel dev: ${maxDev}`);

if (fails.length > 0) {
    console.log("\n--- FAIL DETAILS ---");
    for (const f of fails.slice(0, 30)) console.log(f);
    if (fails.length > 30) console.log(`... and ${fails.length - 30} more`);
}

// Evidence output.
const evidencePath = path.resolve(REPO_ROOT, "../../tosu/osumania_map_analyser/.omo/evidence/task-15-parity.txt");
try {
    mkdirSync(path.dirname(evidencePath), { recursive: true });
    const body = [
        `verify-rework-pp-parity.mjs run at ${new Date().toISOString()}`,
        `samples: ${samples.length} found, ${runSamples.length} run (limit=${Number.isFinite(limit) ? limit : "all"})`,
        `elapsed: ${elapsed}s`,
        "",
        ...report,
        "",
        summary,
        `max rel dev (ULP-level): ${maxDev}${maxDevKey ? " @" + maxDevKey : ""}`,
        "per-field max ULP-level dev:",
        ...[...fieldMaxDev.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `  ${v}  ${k}`),
        `fails: ${failCount}`,
        ...(fails.length ? ["", "--- FAIL DETAILS ---", ...fails] : []),
        "",
    ];
    writeFileSync(evidencePath, body.join("\n"));
    console.log(`evidence written: ${evidencePath}`);
} catch (e) {
    console.log(`evidence write skipped: ${e.message}`);
}

process.exit(failCount === 0 ? 0 : 1);
