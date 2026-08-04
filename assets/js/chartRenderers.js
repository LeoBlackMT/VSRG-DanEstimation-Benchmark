import { t } from "./i18n.js";

function buildDimmedColors(rows, activeValue, keyName, activeFill, activeBorder) {
    const shouldDim = Boolean(activeValue && activeValue !== "all");

    return {
        fills: rows.map((row) => {
            if (!shouldDim || row[keyName] === activeValue) {
                return activeFill;
            }
            return "rgba(140, 146, 160, 0.35)";
        }),
        borders: rows.map((row) => {
            if (!shouldDim || row[keyName] === activeValue) {
                return activeBorder;
            }
            return "rgba(140, 146, 160, 0.7)";
        }),
    };
}

export function createPatternChart({
    ChartRef,
    canvas,
    sourceSummary,
    renderState,
    interactionHandlers,
}) {
    const topPatterns = sourceSummary.patternRows.slice(0, 12).reverse();
    const activePattern = String(renderState.activeFilters?.pattern || "all");
    const colorSet = buildDimmedColors(
        topPatterns,
        renderState.dimUnselected ? activePattern : "all",
        "pattern",
        "rgba(249, 187, 93, 0.55)",
        "rgba(249, 187, 93, 0.95)",
    );

    return new ChartRef(canvas, {
        type: "bar",
        data: {
            labels: topPatterns.map((row) => row.pattern),
            datasets: [{
                label: t("index.kpi.mae", "MAE"),
                data: topPatterns.map((row) => Number(row.mae.toFixed(2))),
                backgroundColor: colorSet.fills,
                borderColor: colorSet.borders,
                borderWidth: 1,
            }],
        },
        options: {
            indexAxis: "y",
            onClick: (_event, elements) => {
                if (!elements?.length || !interactionHandlers?.onPatternSelect) {
                    return;
                }

                const index = elements[0].index;
                const row = topPatterns[index];
                if (!row) {
                    return;
                }
                interactionHandlers.onPatternSelect(row.pattern);
            },
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const row = topPatterns[context.dataIndex];
                            return ` MAE ${Number(context.raw).toFixed(2)} | bias ${row.bias.toFixed(2)} | n=${row.count}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: t("index.kpi.mae", "MAE"),
                    },
                },
            },
        },
    });
}

export function createSubPatternChart({
    ChartRef,
    canvas,
    sourceSummary,
    renderState,
    interactionHandlers,
}) {
    const topSubPatterns = (sourceSummary.subPatternRows || []).slice(0, 12).reverse();
    const activeSubPattern = String(renderState.activeFilters?.subPattern || "all");
    const colorSet = buildDimmedColors(
        topSubPatterns,
        renderState.dimUnselected ? activeSubPattern : "all",
        "subPattern",
        "rgba(94, 232, 189, 0.55)",
        "rgba(94, 232, 189, 0.95)",
    );

    return new ChartRef(canvas, {
        type: "bar",
        data: {
            labels: topSubPatterns.map((row) => row.subPattern),
            datasets: [{
                label: t("index.kpi.mae", "MAE"),
                data: topSubPatterns.map((row) => Number(row.mae.toFixed(2))),
                backgroundColor: colorSet.fills,
                borderColor: colorSet.borders,
                borderWidth: 1,
            }],
        },
        options: {
            indexAxis: "y",
            onClick: (_event, elements) => {
                if (!elements?.length || !interactionHandlers?.onSubPatternSelect) {
                    return;
                }

                const index = elements[0].index;
                const row = topSubPatterns[index];
                if (!row) {
                    return;
                }
                interactionHandlers.onSubPatternSelect(row.subPattern);
            },
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const row = topSubPatterns[context.dataIndex];
                            return ` MAE ${Number(context.raw).toFixed(2)} | bias ${row.bias.toFixed(2)} | n=${row.count}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: t("index.kpi.mae", "MAE"),
                    },
                },
            },
        },
    });
}

export function createHeadToHeadChart({ ChartRef, canvas, compareSummary }) {
    const points = compareSummary?.points || [];
    const values = points.flatMap((point) => [point.x, point.y]);
    const min = values.length ? Math.max(0, Math.min(...values) - 0.2) : 0;
    const max = values.length ? Math.max(...values) + 0.2 : 5;

    return new ChartRef(canvas, {
        type: "scatter",
        data: {
            datasets: [{
                label: t("index.kpi.totalMaps", "Maps"),
                data: points,
                backgroundColor: "rgba(128, 179, 255, 0.78)",
                borderColor: "rgba(128, 179, 255, 0.95)",
                borderWidth: 0,
                pointRadius: 4,
                pointHoverRadius: 6,
            }],
        },
        options: {
            plugins: {
                benchmarkDiagonalReference: {
                    enabled: true,
                },
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const names = [...new Set(
                                (items || [])
                                    .map((item) => item?.raw?.name)
                                    .filter((name) => Boolean(name)),
                            )];

                            if (!names.length) {
                                return t("common.unknown", "Unknown");
                            }

                            if (names.length === 1) {
                                return names[0];
                            }

                            return `${names.length} maps overlapped`;
                        },
                        label: (item) => {
                            const point = item.raw;
                            return `${point.name} | base |delta| ${Number(point.x).toFixed(2)} | compare |delta| ${Number(point.y).toFixed(2)} | pattern ${point.pattern || "-"}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    min,
                    max,
                    title: {
                        display: true,
                        text: t("index.compare.baseDeltaAbs", "Base |Delta|"),
                    },
                },
                y: {
                    min,
                    max,
                    title: {
                        display: true,
                        text: t("index.compare.compareDeltaAbs", "Compare |Delta|"),
                    },
                },
            },
        },
    });
}
