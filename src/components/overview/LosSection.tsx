"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import Section from "@/components/ui/Section";
import ChartCard from "@/components/ui/ChartCard";
import {
    axisProps,
    gridProps,
    legendFormatter,
    legendWrapperStyle,
    tooltipProps,
} from "@/components/ui/chartTheme";
import { COLOR } from "@/lib/colors";
import { AGE_GROUPS, DerivedPatient } from "@/lib/derive";
import { formatDays, nonNull } from "@/lib/aggregate";
import { formatP, mannWhitneyU, median } from "@/lib/stats";

const BIN_WIDTH = 7; // 在院日数ヒストグラムのビン幅（週単位）
const MAX_BINS = 12;

export default function LosSection({ data }: { data: DerivedPatient[] }) {
    const surgery = data.filter((d) => d.treatmentGroup === "surgery");
    const conservative = data.filter((d) => d.treatmentGroup === "conservative");
    const losSurgery = nonNull(surgery.map((d) => d.losDays));
    const losConservative = nonNull(conservative.map((d) => d.losDays));
    const mwu = mannWhitneyU(losSurgery, losConservative);

    // 在院日数の分布（7日刻みのヒストグラム、上限を超える分は最終ビンへ）
    const allLos = [...losSurgery, ...losConservative];
    const maxLos = allLos.length > 0 ? Math.max(...allLos) : 0;
    const binCount = Math.max(1, Math.min(Math.floor(maxLos / BIN_WIDTH) + 1, MAX_BINS));
    const capped = binCount === MAX_BINS && maxLos >= MAX_BINS * BIN_WIDTH;
    const binIndex = (v: number) => Math.min(Math.floor(v / BIN_WIDTH), binCount - 1);
    const histData = Array.from({ length: binCount }, (_, i) => ({
        name:
            capped && i === binCount - 1
                ? `${i * BIN_WIDTH}+`
                : `${i * BIN_WIDTH}–${(i + 1) * BIN_WIDTH - 1}`,
        手術: losSurgery.filter((v) => binIndex(v) === i).length,
        保存: losConservative.filter((v) => binIndex(v) === i).length,
    }));

    // 術式別の術後在院日数（中央値）
    const byProcedure = new Map<string, number[]>();
    for (const d of surgery) {
        if (d.procedureLabel === null || d.postOpDays === null) continue;
        const list = byProcedure.get(d.procedureLabel) ?? [];
        list.push(d.postOpDays);
        byProcedure.set(d.procedureLabel, list);
    }
    const procedureData = [...byProcedure.entries()]
        .map(([name, vals]) => ({ name, 中央値: median(vals), n: vals.length }))
        .sort((a, b) => b.中央値 - a.中央値);

    // 年齢層別の在院日数（中央値）
    const ageLosData = AGE_GROUPS.map((g) => {
        const s = nonNull(
            data.filter((d) => d.ageGroup === g && d.treatmentGroup === "surgery").map((d) => d.losDays)
        );
        const c = nonNull(
            data
                .filter((d) => d.ageGroup === g && d.treatmentGroup === "conservative")
                .map((d) => d.losDays)
        );
        return {
            name: g,
            手術: s.length > 0 ? median(s) : null,
            保存: c.length > 0 ? median(c) : null,
        };
    });

    return (
        <Section
            title="在院日数（手術 vs 保存）"
            description="退院済み症例の入院期間の比較。検定は Mann–Whitney U 検定（両側・探索的）"
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ChartCard
                    title="在院日数の分布"
                    subtitle={`中央値: 手術 ${losSurgery.length > 0 ? formatDays(median(losSurgery)) : "—"}日 / 保存 ${losConservative.length > 0 ? formatDays(median(losConservative)) : "—"}日`}
                    badge={
                        <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                            {mwu ? formatP(mwu.p) : "検定不可"}
                        </span>
                    }
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={histData} barCategoryGap="20%">
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey="name" {...axisProps} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                            <YAxis allowDecimals={false} {...axisProps} />
                            <Tooltip {...tooltipProps} />
                            <Legend wrapperStyle={legendWrapperStyle} formatter={legendFormatter} />
                            <Bar dataKey="手術" fill={COLOR.surgery} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                            <Bar dataKey="保存" fill={COLOR.conservative} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="術式別 術後在院日数" subtitle="中央値（日）・手術症例のみ">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={procedureData}>
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey="name" {...axisProps} />
                            <YAxis allowDecimals={false} {...axisProps} />
                            <Tooltip
                                {...tooltipProps}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter={(value: any, _name: any, item: any) => [
                                    `${formatDays(Number(value))}日（n=${item?.payload?.n ?? "?"}）`,
                                    "術後在院日数 中央値",
                                ]}
                            />
                            <Bar dataKey="中央値" fill={COLOR.surgery} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="年齢層別 在院日数" subtitle="中央値（日）・治療群別">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ageLosData}>
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey="name" {...axisProps} />
                            <YAxis allowDecimals={false} {...axisProps} />
                            <Tooltip {...tooltipProps} />
                            <Legend wrapperStyle={legendWrapperStyle} formatter={legendFormatter} />
                            <Bar dataKey="手術" fill={COLOR.surgery} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                            <Bar dataKey="保存" fill={COLOR.conservative} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </Section>
    );
}
