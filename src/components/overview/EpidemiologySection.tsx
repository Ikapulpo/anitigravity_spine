"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
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
    renderPieLabel,
    tooltipProps,
} from "@/components/ui/chartTheme";
import { COLOR } from "@/lib/colors";
import {
    AGE_GROUPS,
    DerivedPatient,
    FALL_LABEL,
    FRACTURE_LEVEL_NAMES,
    TREATMENT_LABEL,
} from "@/lib/derive";
import { countBy } from "@/lib/aggregate";

const FALL_COLORS: Record<string, string> = {
    転倒: "#fbbf24", // amber-400
    転倒なし: "#34d399", // emerald-400
    その他: COLOR.other,
};

export default function EpidemiologySection({ data }: { data: DerivedPatient[] }) {
    // 年齢 × 性別
    const ageGenderData = AGE_GROUPS.map((g) => ({
        name: g,
        女性: data.filter((d) => d.ageGroup === g && d.gender === "female").length,
        男性: data.filter((d) => d.ageGroup === g && d.gender === "male").length,
    }));
    const ageUnknownN = data.filter((d) => d.ageGroup === null || d.gender === null).length;

    // 骨折椎体レベル（多発骨折は各椎体を1件として集計）
    const levelCounts = new Map<string, number>();
    let levelUnknownN = 0;
    for (const d of data) {
        const valid = d.fractureLevels.filter((l) =>
            (FRACTURE_LEVEL_NAMES as readonly string[]).includes(l)
        );
        if (valid.length === 0) levelUnknownN++;
        for (const l of valid) levelCounts.set(l, (levelCounts.get(l) ?? 0) + 1);
    }
    const levelData = FRACTURE_LEVEL_NAMES.map((name) => ({
        name,
        件数: levelCounts.get(name) ?? 0,
    }));

    // 受傷機転
    const fallData = countBy(data, (d) => FALL_LABEL[d.fallCategory]).filter(
        (v) => v.value > 0
    );

    // OF 分類
    const ofData = countBy(data, (d) => d.ofClassification).sort((a, b) =>
        a.name.localeCompare(b.name)
    );
    const ofUnknownN = data.filter((d) => d.ofClassification === null).length;
    if (ofUnknownN > 0) ofData.push({ name: "不明", value: ofUnknownN });

    // 月別推移（治療群別の積み上げ）
    const months = [
        ...new Set(data.map((d) => d.monthKey).filter((m): m is string => m !== null)),
    ].sort();
    const monthlyData = months.map((m) => ({
        name: m.replace("-", "/"),
        手術: data.filter((d) => d.monthKey === m && d.treatmentGroup === "surgery").length,
        保存: data.filter((d) => d.monthKey === m && d.treatmentGroup === "conservative")
            .length,
        その他: data.filter((d) => d.monthKey === m && d.treatmentGroup === "other").length,
    }));

    // 骨粗鬆症治療歴（薬剤別）
    const osteoData = countBy(data, (d) => {
        const s = String(d.raw.osteoporosisHistory ?? "").trim();
        if (!s) return null;
        if (/^(none|なし|無|未治療)$/i.test(s)) return "なし";
        return s;
    })
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);

    return (
        <Section
            title="疫学的特徴"
            description="表示中のコホートの患者背景（グローバルフィルタが適用されます）"
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ChartCard
                    title="年齢分布（性別内訳）"
                    subtitle={ageUnknownN > 0 ? `年齢または性別の未記載 ${ageUnknownN} 件は除外` : undefined}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ageGenderData}>
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey="name" {...axisProps} />
                            <YAxis allowDecimals={false} {...axisProps} />
                            <Tooltip {...tooltipProps} />
                            <Legend wrapperStyle={legendWrapperStyle} formatter={legendFormatter} />
                            <Bar dataKey="女性" stackId="a" fill={COLOR.female} isAnimationActive={false} />
                            <Bar dataKey="男性" stackId="a" fill={COLOR.male} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                    title="骨折椎体レベル"
                    subtitle={`多発骨折は各椎体を1件として集計${levelUnknownN > 0 ? `　|　レベル不明 ${levelUnknownN} 件` : ""}`}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={levelData}>
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey="name" {...axisProps} tick={{ fill: "#94a3b8", fontSize: 10 }} interval={0} />
                            <YAxis allowDecimals={false} {...axisProps} />
                            <Tooltip {...tooltipProps} />
                            <Bar dataKey="件数" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                                {levelData.map((entry) => (
                                    <Cell
                                        key={entry.name}
                                        fill={entry.name.startsWith("T") ? "#a78bfa" : COLOR.accent}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="受傷機転" subtitle="転倒の有無（高エネルギー外傷・未記載は「その他」）">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={fallData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={4}
                                dataKey="value"
                                label={renderPieLabel}
                                labelLine={{ stroke: "#475569" }}
                                isAnimationActive={false}
                            >
                                {fallData.map((entry) => (
                                    <Cell key={entry.name} fill={FALL_COLORS[entry.name] ?? COLOR.other} />
                                ))}
                            </Pie>
                            <Tooltip {...tooltipProps} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="OF分類" subtitle="骨粗鬆症性椎体骨折の形態分類">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ofData}>
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey="name" {...axisProps} />
                            <YAxis allowDecimals={false} {...axisProps} />
                            <Tooltip {...tooltipProps} />
                            <Bar dataKey="value" name="件数" fill="#a78bfa" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="月別症例数の推移" subtitle="相談タイムスタンプ基準・治療群別">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                            <CartesianGrid {...gridProps} vertical={false} />
                            <XAxis dataKey="name" {...axisProps} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                            <YAxis allowDecimals={false} {...axisProps} />
                            <Tooltip {...tooltipProps} />
                            <Legend wrapperStyle={legendWrapperStyle} formatter={legendFormatter} />
                            <Bar dataKey={TREATMENT_LABEL.surgery} stackId="a" fill={COLOR.surgery} isAnimationActive={false} />
                            <Bar dataKey={TREATMENT_LABEL.conservative} stackId="a" fill={COLOR.conservative} isAnimationActive={false} />
                            <Bar dataKey={TREATMENT_LABEL.other} stackId="a" fill={COLOR.other} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="骨粗鬆症治療歴" subtitle="受傷時点の治療内容（記載のある症例のみ・上位7件）">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={osteoData} layout="vertical">
                            <CartesianGrid {...gridProps} horizontal={false} />
                            <XAxis type="number" allowDecimals={false} {...axisProps} />
                            <YAxis type="category" dataKey="name" width={100} {...axisProps} />
                            <Tooltip {...tooltipProps} />
                            <Bar dataKey="value" name="件数" fill="#34d399" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </Section>
    );
}
