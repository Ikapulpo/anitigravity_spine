"use client";

import { Activity, HeartPulse, Scale, Users } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { DerivedPatient } from "@/lib/derive";
import { formatP, iqr, mannWhitneyU, mean, median, sd } from "@/lib/stats";
import { formatDays, nonNull } from "@/lib/aggregate";

const pctLabel = (n: number, total: number): string =>
    total > 0 ? `${Math.round((n / total) * 100)}%` : "—";

function LosSummary({
    title,
    values,
    accentClass,
    borderClass,
}: {
    title: string;
    values: number[];
    accentClass: string;
    borderClass: string;
}) {
    const has = values.length > 0;
    const [q1, q3] = has ? iqr(values) : [NaN, NaN];
    return (
        <div className={`rounded-lg border p-3 ${borderClass}`}>
            <p className={`text-xs font-semibold ${accentClass}`}>
                {title}（n={values.length}）
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-100">
                {has ? formatDays(median(values)) : "—"}
                <span className="ml-1 text-sm font-medium text-slate-400">日</span>
                {has && (
                    <span className="ml-2 text-sm font-medium text-slate-400">
                        [{formatDays(q1)}–{formatDays(q3)}]
                    </span>
                )}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
                {has
                    ? `平均 ${formatDays(mean(values))} ± ${values.length > 1 ? formatDays(sd(values)) : "—"} 日`
                    : "データなし"}
            </p>
        </div>
    );
}

export default function KpiRow({ data }: { data: DerivedPatient[] }) {
    const total = data.length;
    const surgery = data.filter((d) => d.treatmentGroup === "surgery");
    const conservative = data.filter((d) => d.treatmentGroup === "conservative");

    const ages = nonNull(data.map((d) => d.ageNum));
    const femaleN = data.filter((d) => d.gender === "female").length;
    const genderKnownN = data.filter((d) => d.gender !== null).length;

    const losSurgery = nonNull(surgery.map((d) => d.losDays));
    const losConservative = nonNull(conservative.map((d) => d.losDays));
    const mwu = mannWhitneyU(losSurgery, losConservative);

    return (
        <div className="mb-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <StatCard
                    label="総症例数"
                    value={total}
                    sub="表示中のコホート"
                    icon={Users}
                />
                <StatCard
                    label="手術"
                    value={surgery.length}
                    sub={`全体の ${pctLabel(surgery.length, total)}`}
                    icon={Activity}
                    iconClass="bg-rose-400/10 text-rose-400"
                />
                <StatCard
                    label="保存的治療"
                    value={conservative.length}
                    sub={`全体の ${pctLabel(conservative.length, total)}`}
                    icon={HeartPulse}
                    iconClass="bg-sky-400/10 text-sky-400"
                />
                <StatCard
                    label="平均年齢"
                    value={
                        ages.length > 0 ? (
                            <>
                                {mean(ages).toFixed(1)}
                                <span className="text-sm font-medium text-slate-400">
                                    {" "}
                                    ± {ages.length > 1 ? sd(ages).toFixed(1) : "—"} 歳
                                </span>
                            </>
                        ) : (
                            "—"
                        )
                    }
                    sub={`年齢記載 ${ages.length} 件`}
                    icon={Scale}
                    iconClass="bg-violet-400/10 text-violet-400"
                />
                <StatCard
                    label="女性比率"
                    value={genderKnownN > 0 ? pctLabel(femaleN, genderKnownN) : "—"}
                    sub={`女性 ${femaleN} 件 / 性別記載 ${genderKnownN} 件`}
                    icon={Users}
                    iconClass="bg-pink-400/10 text-pink-400"
                />
            </div>

            {/* 在院日数の比較（最重要 KPI なのでワイドカードで強調） */}
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-200">
                        在院日数　中央値 [四分位範囲]
                    </h3>
                    <span
                        className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs font-medium text-slate-300"
                        title="手術群と保存群の在院日数の差の検定（Mann–Whitney U 検定、両側）"
                    >
                        Mann–Whitney U: {mwu ? formatP(mwu.p) : "データ不足"}
                    </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <LosSummary
                        title="手術"
                        values={losSurgery}
                        accentClass="text-rose-300"
                        borderClass="border-rose-500/25 bg-rose-500/5"
                    />
                    <LosSummary
                        title="保存的治療"
                        values={losConservative}
                        accentClass="text-sky-300"
                        borderClass="border-sky-500/25 bg-sky-500/5"
                    />
                </div>
            </div>
        </div>
    );
}
