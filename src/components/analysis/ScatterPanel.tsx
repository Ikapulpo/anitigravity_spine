"use client";

import { useMemo } from "react";
import {
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Crosshair } from "lucide-react";
import clsx from "clsx";
import {
    axisProps,
    gridProps,
    tooltipContentStyle,
} from "@/components/ui/chartTheme";
import { CHART, COLOR, treatmentColor } from "@/lib/colors";
import { TREATMENT_LABEL, TreatmentGroup } from "@/lib/derive";
import { NumericVariable } from "@/lib/variables";
import { linearRegression, median } from "@/lib/stats";
import { ScatterPoint } from "@/components/tabs/AnalysisTab";

// SVG の点数が増えすぎると描画が重くなるため、表示のみ間引く（統計は全数で計算）
const MAX_DISPLAY_POINTS = 3000;

const GROUPS: TreatmentGroup[] = ["surgery", "conservative", "other"];

const parseGate = (s: string): number | null => {
    if (s.trim() === "") return null;
    const v = Number(s);
    return Number.isFinite(v) ? v : null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScatterTooltip({ active, payload, xVar, yVar }: any) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as ScatterPoint;
    return (
        <div style={tooltipContentStyle} className="px-3 py-2">
            <p className="font-semibold text-slate-200">{p.id || "(IDなし)"}</p>
            <p className="text-slate-400">
                {xVar.label}: <span className="text-slate-200">{p.x}</span> {xVar.unit ?? ""}
            </p>
            <p className="text-slate-400">
                {yVar.label}: <span className="text-slate-200">{p.y}</span> {yVar.unit ?? ""}
            </p>
            <p className="mt-0.5 text-slate-500">{TREATMENT_LABEL[p.group]}</p>
        </div>
    );
}

export default function ScatterPanel({
    points,
    xVar,
    yVar,
    colorByGroup,
    gateX,
    gateY,
    onGateChange,
    className,
}: {
    points: ScatterPoint[];
    xVar: NumericVariable;
    yVar: NumericVariable;
    colorByGroup: boolean;
    gateX: string;
    gateY: string;
    onGateChange: (gateX: string, gateY: string) => void;
    className?: string;
}) {
    // 表示用の間引き（決定的: 等間隔ストライド）
    const displayPoints = useMemo(() => {
        if (points.length <= MAX_DISPLAY_POINTS) return points;
        const stride = Math.ceil(points.length / MAX_DISPLAY_POINTS);
        return points.filter((_, i) => i % stride === 0);
    }, [points]);

    const reg = useMemo(
        () => linearRegression(points.map((p) => [p.x, p.y] as const)),
        [points]
    );

    const xs = points.map((p) => p.x);
    const minX = xs.length > 0 ? Math.min(...xs) : 0;
    const maxX = xs.length > 0 ? Math.max(...xs) : 1;

    const gx = parseGate(gateX);
    const gy = parseGate(gateY);

    // クアドラント集計（フローサイトメトリー風、境界値はゲート以上を「+」側に含める）
    const quadrants = useMemo(() => {
        if (gx === null || gy === null || points.length === 0) return null;
        const q = { ul: 0, ur: 0, ll: 0, lr: 0 };
        for (const p of points) {
            if (p.y >= gy) {
                if (p.x >= gx) q.ur++;
                else q.ul++;
            } else {
                if (p.x >= gx) q.lr++;
                else q.ll++;
            }
        }
        return q;
    }, [points, gx, gy]);

    const pct = (n: number) =>
        points.length > 0 ? `${((n / points.length) * 100).toFixed(1)}%` : "—";

    const setMedians = () => {
        if (points.length === 0) return;
        onGateChange(
            String(Math.round(median(points.map((p) => p.x)) * 10) / 10),
            String(Math.round(median(points.map((p) => p.y)) * 10) / 10)
        );
    };

    const axisLabel = (v: NumericVariable) => `${v.label}${v.unit ? `（${v.unit}）` : ""}`;

    return (
        <div className={clsx("rounded-xl border border-slate-800 bg-slate-900/70 p-4", className)}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-200">
                    {xVar.label} × {yVar.label}
                </h3>
                {/* 群の凡例（手動チップ） */}
                {colorByGroup && (
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        {GROUPS.map((g) => {
                            const n = points.filter((p) => p.group === g).length;
                            if (n === 0) return null;
                            return (
                                <span key={g} className="flex items-center gap-1">
                                    <span
                                        className="inline-block h-2 w-2 rounded-full"
                                        style={{ backgroundColor: treatmentColor(g) }}
                                    />
                                    {TREATMENT_LABEL[g]} ({n})
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 16, bottom: 14, left: 4 }}>
                        <CartesianGrid {...gridProps} />
                        <XAxis
                            type="number"
                            dataKey="x"
                            domain={["auto", "auto"]}
                            {...axisProps}
                            label={{
                                value: axisLabel(xVar),
                                position: "insideBottom",
                                offset: -8,
                                fill: "#94a3b8",
                                fontSize: 11,
                            }}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            domain={["auto", "auto"]}
                            {...axisProps}
                            label={{
                                value: axisLabel(yVar),
                                angle: -90,
                                position: "insideLeft",
                                fill: "#94a3b8",
                                fontSize: 11,
                            }}
                        />
                        <Tooltip
                            content={<ScatterTooltip xVar={xVar} yVar={yVar} />}
                            cursor={{ strokeDasharray: "3 3", stroke: "#475569" }}
                        />
                        {/* 回帰直線（観測されたXの範囲に限定して描画） */}
                        {reg && points.length >= 2 && (
                            <ReferenceLine
                                segment={[
                                    { x: minX, y: reg.intercept + reg.slope * minX },
                                    { x: maxX, y: reg.intercept + reg.slope * maxX },
                                ]}
                                stroke={CHART.referenceLine}
                                strokeDasharray="6 4"
                                ifOverflow="hidden"
                            />
                        )}
                        {/* クアドラントゲート */}
                        {gx !== null && (
                            <ReferenceLine x={gx} stroke="#fbbf24" strokeDasharray="4 4" />
                        )}
                        {gy !== null && (
                            <ReferenceLine y={gy} stroke="#fbbf24" strokeDasharray="4 4" />
                        )}
                        {colorByGroup ? (
                            GROUPS.map((g) => {
                                const pts = displayPoints.filter((p) => p.group === g);
                                if (pts.length === 0) return null;
                                return (
                                    <Scatter
                                        key={g}
                                        data={pts}
                                        fill={treatmentColor(g)}
                                        fillOpacity={0.75}
                                        isAnimationActive={false}
                                    />
                                );
                            })
                        ) : (
                            <Scatter
                                data={displayPoints}
                                fill={COLOR.accent}
                                fillOpacity={0.75}
                                isAnimationActive={false}
                            />
                        )}
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            {displayPoints.length < points.length && (
                <p className="mt-1 text-xs text-amber-400/80">
                    表示は {MAX_DISPLAY_POINTS.toLocaleString()} 点に間引いています（統計量は全{" "}
                    {points.length.toLocaleString()} 点で計算）
                </p>
            )}

            {/* ゲート操作 */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <Crosshair size={14} className="text-amber-400" />
                <span className="font-medium">クアドラントゲート</span>
                <label className="flex items-center gap-1">
                    X≧
                    <input
                        type="number"
                        value={gateX}
                        onChange={(e) => onGateChange(e.target.value, gateY)}
                        className="w-20 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                </label>
                <label className="flex items-center gap-1">
                    Y≧
                    <input
                        type="number"
                        value={gateY}
                        onChange={(e) => onGateChange(gateX, e.target.value)}
                        className="w-20 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200 focus:border-amber-500 focus:outline-none"
                    />
                </label>
                <button
                    onClick={setMedians}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-medium text-slate-300 hover:bg-slate-700"
                >
                    中央値にセット
                </button>
                <button
                    onClick={() => onGateChange("", "")}
                    className="rounded border border-slate-700 px-2 py-0.5 text-slate-500 hover:text-slate-300"
                >
                    クリア
                </button>
            </div>

            {/* クアドラント集計表 */}
            {quadrants && (
                <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-700 text-center text-xs">
                    {(
                        [
                            { label: "左上（X−/Y+）", n: quadrants.ul },
                            { label: "右上（X+/Y+）", n: quadrants.ur },
                            { label: "左下（X−/Y−）", n: quadrants.ll },
                            { label: "右下（X+/Y−）", n: quadrants.lr },
                        ] as const
                    ).map((q) => (
                        <div key={q.label} className="border border-slate-800 bg-slate-900/60 px-2 py-1.5">
                            <span className="text-slate-500">{q.label}</span>{" "}
                            <span className="font-semibold text-slate-200">n={q.n}</span>{" "}
                            <span className="text-amber-300/90">({pct(q.n)})</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
