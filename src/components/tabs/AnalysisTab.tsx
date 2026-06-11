"use client";

// 相関分析タブ。フローサイトメトリーのワークステーション風に、
// 2軸プロットと統計量パネルを並べて表示する。
// - 散布図モード: 数値 × 数値（相関・回帰・クアドラントゲート）
// - 群間比較モード: カテゴリ × 数値（ストリッププロット・検定）

import { useMemo } from "react";
import clsx from "clsx";
import Select from "@/components/ui/Select";
import ScatterPanel from "@/components/analysis/ScatterPanel";
import GroupComparePanel from "@/components/analysis/GroupComparePanel";
import { CompareStats, ScatterStats } from "@/components/analysis/StatsPanel";
import { DerivedPatient } from "@/lib/derive";
import {
    CATEGORICAL_VARIABLES,
    NUMERIC_VARIABLES,
    availableVariables,
    categoryLevels,
} from "@/lib/variables";
import { nonNull } from "@/lib/aggregate";

export interface AnalysisConfig {
    mode: "scatter" | "compare";
    scatterX: string;
    scatterY: string;
    compareCat: string;
    compareY: string;
    colorByGroup: boolean;
    // ゲートは入力欄の文字列のまま保持し、使用時に数値へ変換する
    gateX: string;
    gateY: string;
}

export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
    mode: "scatter",
    scatterX: "age",
    scatterY: "losDays",
    compareCat: "treatmentGroup",
    compareY: "losDays",
    colorByGroup: true,
    gateX: "",
    gateY: "",
};

export interface ScatterPoint {
    x: number;
    y: number;
    id: string;
    group: DerivedPatient["treatmentGroup"];
}

export default function AnalysisTab({
    data,
    config,
    onChange,
}: {
    data: DerivedPatient[];
    config: AnalysisConfig;
    onChange: (config: AnalysisConfig) => void;
}) {
    const set = (patch: Partial<AnalysisConfig>) => onChange({ ...config, ...patch });

    // データが minN 件以上ある変数だけを軸候補にする（研究用列は入力が始まると自動で出現）
    const numericVars = useMemo(() => availableVariables(NUMERIC_VARIABLES, data), [data]);
    const categoricalVars = useMemo(
        () => availableVariables(CATEGORICAL_VARIABLES, data),
        [data]
    );

    const xVar = numericVars.find((v) => v.key === config.scatterX) ?? numericVars[0];
    const yVar =
        numericVars.find((v) => v.key === config.scatterY) ??
        numericVars[Math.min(1, numericVars.length - 1)];
    const catVar =
        categoricalVars.find((v) => v.key === config.compareCat) ?? categoricalVars[0];
    const compareYVar = numericVars.find((v) => v.key === config.compareY) ?? numericVars[0];

    // 散布図の有効ペア（欠損は除外し、件数を統計パネルに表示）
    const { points, missingN } = useMemo(() => {
        if (!xVar || !yVar) return { points: [] as ScatterPoint[], missingN: 0 };
        const pts: ScatterPoint[] = [];
        let missing = 0;
        for (const d of data) {
            const x = xVar.accessor(d);
            const y = yVar.accessor(d);
            if (x === null || y === null) {
                missing++;
                continue;
            }
            pts.push({ x, y, id: d.id, group: d.treatmentGroup });
        }
        return { points: pts, missingN: missing };
    }, [data, xVar, yVar]);

    // 群間比較のグループ
    const groups = useMemo(() => {
        if (!catVar || !compareYVar) return [];
        return categoryLevels(catVar, data).map((name) => ({
            name,
            values: nonNull(
                data.filter((d) => catVar.accessor(d) === name).map((d) => compareYVar.accessor(d))
            ),
        }));
    }, [data, catVar, compareYVar]);

    if (numericVars.length < 2) {
        return (
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center text-sm text-slate-400">
                分析できる数値変数が不足しています（データが 3 件以上ある数値変数が 2 つ必要です）。
            </div>
        );
    }

    return (
        <div>
            {/* コントロールバー */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5">
                    {(
                        [
                            { key: "scatter", label: "散布図" },
                            { key: "compare", label: "群間比較" },
                        ] as const
                    ).map((m) => (
                        <button
                            key={m.key}
                            onClick={() => set({ mode: m.key })}
                            className={clsx(
                                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                                config.mode === m.key
                                    ? "bg-cyan-500/20 text-cyan-300"
                                    : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {config.mode === "scatter" ? (
                    <>
                        <Select
                            label="X軸"
                            value={xVar?.key ?? ""}
                            onChange={(e) => set({ scatterX: e.target.value })}
                        >
                            {numericVars.map((v) => (
                                <option key={v.key} value={v.key}>
                                    {v.label}
                                    {v.unit ? `（${v.unit}）` : ""}
                                </option>
                            ))}
                        </Select>
                        <Select
                            label="Y軸"
                            value={yVar?.key ?? ""}
                            onChange={(e) => set({ scatterY: e.target.value })}
                        >
                            {numericVars.map((v) => (
                                <option key={v.key} value={v.key}>
                                    {v.label}
                                    {v.unit ? `（${v.unit}）` : ""}
                                </option>
                            ))}
                        </Select>
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-400">
                            <input
                                type="checkbox"
                                checked={config.colorByGroup}
                                onChange={(e) => set({ colorByGroup: e.target.checked })}
                                className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 accent-cyan-500"
                            />
                            治療群で色分け
                        </label>
                    </>
                ) : (
                    <>
                        <Select
                            label="群分け"
                            value={catVar?.key ?? ""}
                            onChange={(e) => set({ compareCat: e.target.value })}
                        >
                            {categoricalVars.map((v) => (
                                <option key={v.key} value={v.key}>
                                    {v.label}
                                </option>
                            ))}
                        </Select>
                        <Select
                            label="比較する値"
                            value={compareYVar?.key ?? ""}
                            onChange={(e) => set({ compareY: e.target.value })}
                        >
                            {numericVars.map((v) => (
                                <option key={v.key} value={v.key}>
                                    {v.label}
                                    {v.unit ? `（${v.unit}）` : ""}
                                </option>
                            ))}
                        </Select>
                    </>
                )}
            </div>

            {/* プロット + 統計パネル */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {config.mode === "scatter" && xVar && yVar ? (
                    <>
                        <ScatterPanel
                            className="xl:col-span-2"
                            points={points}
                            xVar={xVar}
                            yVar={yVar}
                            colorByGroup={config.colorByGroup}
                            gateX={config.gateX}
                            gateY={config.gateY}
                            onGateChange={(gateX, gateY) => set({ gateX, gateY })}
                        />
                        <ScatterStats
                            points={points}
                            missingN={missingN}
                            xVar={xVar}
                            yVar={yVar}
                            colorByGroup={config.colorByGroup}
                        />
                    </>
                ) : catVar && compareYVar ? (
                    <>
                        <GroupComparePanel
                            className="xl:col-span-2"
                            groups={groups}
                            catVar={catVar}
                            yVar={compareYVar}
                            data={data}
                        />
                        <CompareStats groups={groups} yVar={compareYVar} />
                    </>
                ) : (
                    <div className="xl:col-span-3 rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center text-sm text-slate-400">
                        分析できるカテゴリ変数がありません。
                    </div>
                )}
            </div>

            <p className="mt-4 text-xs text-slate-600">
                ※ ここでの検定はすべて探索的解析です（多重比較は未補正）。論文・学会用の確証解析は
                症例一覧タブから CSV を出力し、EZR / SPSS 等で実施してください。
            </p>
        </div>
    );
}
