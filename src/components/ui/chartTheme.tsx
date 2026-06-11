// Recharts ダークテーマ用の共有 props とヘルパー。Recharts の既定色はライト
// テーマ前提なので、全チャートでこれらを明示的に渡す（渡し忘れると軸・凡例・
// ツールチップが白背景用の色で描画され、ダーク背景では読めなくなる）。

import { CSSProperties, ReactNode } from "react";
import { CHART } from "@/lib/colors";

export const tickStyle = { fill: CHART.tick, fontSize: 11 } as const;

export const gridProps = {
    stroke: CHART.grid,
    strokeDasharray: "3 3",
} as const;

export const axisProps = {
    tick: tickStyle,
    axisLine: { stroke: CHART.axisLine },
    tickLine: { stroke: CHART.axisLine },
} as const;

export const tooltipContentStyle: CSSProperties = {
    backgroundColor: CHART.tooltipBg,
    border: `1px solid ${CHART.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: "#e2e8f0",
};

export const tooltipItemStyle: CSSProperties = { color: "#e2e8f0" };
export const tooltipLabelStyle: CSSProperties = { color: "#94a3b8" };

export const tooltipProps = {
    contentStyle: tooltipContentStyle,
    itemStyle: tooltipItemStyle,
    labelStyle: tooltipLabelStyle,
    cursor: { fill: CHART.cursorFill },
} as const;

export const legendWrapperStyle: CSSProperties = { fontSize: 12 };

// Legend の文字色はダーク用に formatter で上書きする必要がある
export const legendFormatter = (value: ReactNode): ReactNode => (
    <span style={{ color: "#94a3b8", fontSize: 12 }}>{value}</span>
);

// 円グラフの外側ラベル（名前 + %）。Pie の label prop に渡す
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const renderPieLabel = (props: any): ReactNode => {
    const { cx, cy, midAngle, outerRadius, percent, name } = props;
    const RADIAN = Math.PI / 180;
    const r = outerRadius + 14;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
        <text
            x={x}
            y={y}
            fill="#94a3b8"
            fontSize={11}
            textAnchor={x > cx ? "start" : "end"}
            dominantBaseline="central"
        >
            {`${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
        </text>
    );
};
