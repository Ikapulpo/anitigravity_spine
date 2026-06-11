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
import clsx from "clsx";
import { axisProps, gridProps, tooltipContentStyle } from "@/components/ui/chartTheme";
import { CATEGORICAL_PALETTE, COLOR } from "@/lib/colors";
import { DerivedPatient } from "@/lib/derive";
import { CategoricalVariable, NumericVariable } from "@/lib/variables";
import { median } from "@/lib/stats";

export interface ComparisonGroup {
    name: string;
    values: number[];
}

interface StripPoint {
    x: number;
    y: number;
    id: string;
    groupName: string;
}

// 患者IDから決定的なジッターを生成（Math.random だと SSR とハイドレーションで
// 結果がズレるため使用しない）
const jitterFor = (id: string, salt: number): number => {
    let h = 2166136261 ^ salt;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (((h >>> 0) % 1000) / 1000 - 0.5) * 0.56; // ±0.28
};

// 治療群の比較では全チャート共通の治療群カラーを使う
const groupColor = (catKey: string, groupName: string, index: number): string => {
    if (catKey === "treatmentGroup") {
        if (groupName === "手術") return COLOR.surgery;
        if (groupName === "保存") return COLOR.conservative;
        return COLOR.other;
    }
    return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StripTooltip({ active, payload, yVar }: any) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as StripPoint;
    return (
        <div style={tooltipContentStyle} className="px-3 py-2">
            <p className="font-semibold text-slate-200">{p.id || "(IDなし)"}</p>
            <p className="text-slate-400">
                {yVar.label}: <span className="text-slate-200">{p.y}</span> {yVar.unit ?? ""}
            </p>
            <p className="mt-0.5 text-slate-500">{p.groupName}</p>
        </div>
    );
}

export default function GroupComparePanel({
    groups,
    catVar,
    yVar,
    data,
    className,
}: {
    groups: ComparisonGroup[];
    catVar: CategoricalVariable;
    yVar: NumericVariable;
    data: DerivedPatient[];
    className?: string;
}) {
    // ストリッププロット用の点（グループごとに x = グループ index + ジッター）
    const seriesByGroup = useMemo(() => {
        return groups.map((g, gi) => {
            const points: StripPoint[] = [];
            for (const d of data) {
                if (catVar.accessor(d) !== g.name) continue;
                const y = yVar.accessor(d);
                if (y === null) continue;
                points.push({ x: gi + jitterFor(d.id, gi + 1), y, id: d.id, groupName: g.name });
            }
            return { name: g.name, color: groupColor(catVar.key, g.name, gi), points };
        });
    }, [groups, catVar, yVar, data]);

    const axisLabel = `${yVar.label}${yVar.unit ? `（${yVar.unit}）` : ""}`;

    if (groups.length === 0) {
        return (
            <div className={clsx("rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center text-sm text-slate-400", className)}>
                この変数にはデータがありません。
            </div>
        );
    }

    return (
        <div className={clsx("rounded-xl border border-slate-800 bg-slate-900/70 p-4", className)}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-200">
                    {catVar.label} 別の {yVar.label}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    {seriesByGroup.map((s) => (
                        <span key={s.name} className="flex items-center gap-1">
                            <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: s.color }}
                            />
                            {s.name} ({s.points.length})
                        </span>
                    ))}
                </div>
            </div>

            <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 16, bottom: 14, left: 4 }}>
                        <CartesianGrid {...gridProps} vertical={false} />
                        <XAxis
                            type="number"
                            dataKey="x"
                            domain={[-0.5, groups.length - 0.5]}
                            ticks={groups.map((_, i) => i)}
                            tickFormatter={(i: number) => groups[Math.round(i)]?.name ?? ""}
                            {...axisProps}
                            interval={0}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            domain={["auto", "auto"]}
                            {...axisProps}
                            label={{
                                value: axisLabel,
                                angle: -90,
                                position: "insideLeft",
                                fill: "#94a3b8",
                                fontSize: 11,
                            }}
                        />
                        <Tooltip
                            content={<StripTooltip yVar={yVar} />}
                            cursor={{ strokeDasharray: "3 3", stroke: "#475569" }}
                        />
                        {/* 各群の中央値ライン */}
                        {groups.map((g, gi) =>
                            g.values.length > 0 ? (
                                <ReferenceLine
                                    key={`med-${g.name}`}
                                    segment={[
                                        { x: gi - 0.35, y: median(g.values) },
                                        { x: gi + 0.35, y: median(g.values) },
                                    ]}
                                    stroke="#e2e8f0"
                                    strokeWidth={2}
                                />
                            ) : null
                        )}
                        {seriesByGroup.map((s) =>
                            s.points.length > 0 ? (
                                <Scatter
                                    key={s.name}
                                    data={s.points}
                                    fill={s.color}
                                    fillOpacity={0.75}
                                    isAnimationActive={false}
                                />
                            ) : null
                        )}
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-slate-600">
                横線は各群の中央値。点は重なりを避けるため横方向に分散して表示しています。
            </p>
        </div>
    );
}
