"use client";

// 相関分析タブの統計量パネル。プロットの横で「統計量がパッと出る」役割。
// 検定はすべて探索的（多重比較未補正）。

import { ReactNode, useMemo } from "react";
import { treatmentColor } from "@/lib/colors";
import { TREATMENT_LABEL, TreatmentGroup } from "@/lib/derive";
import { NumericVariable } from "@/lib/variables";
import {
    formatP,
    iqr,
    linearRegression,
    mannWhitneyU,
    mean,
    median,
    pearson,
    sd,
    spearman,
    welchTTest,
} from "@/lib/stats";
import { formatDays } from "@/lib/aggregate";
import { ScatterPoint } from "@/components/tabs/AnalysisTab";
import { ComparisonGroup } from "@/components/analysis/GroupComparePanel";

const GROUPS: TreatmentGroup[] = ["surgery", "conservative", "other"];

// 相関の強さのめやす（絶対値）
const rStrength = (r: number): string => {
    const a = Math.abs(r);
    if (a < 0.2) return "ほぼ相関なし";
    if (a < 0.4) return "弱い相関";
    if (a < 0.7) return "中等度の相関";
    return "強い相関";
};

function Panel({ children }: { children: ReactNode }) {
    return (
        <div className="self-start rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">統計量</h3>
            <div className="space-y-4 text-sm">{children}</div>
        </div>
    );
}

function StatBlock({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div>
            <p className="mb-1 border-b border-slate-800 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {title}
            </p>
            <div className="space-y-0.5 text-slate-300">{children}</div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="font-mono text-sm text-slate-200">{value}</span>
        </div>
    );
}

export function ScatterStats({
    points,
    missingN,
    xVar,
    yVar,
    colorByGroup,
}: {
    points: ScatterPoint[];
    missingN: number;
    xVar: NumericVariable;
    yVar: NumericVariable;
    colorByGroup: boolean;
}) {
    const pairs = useMemo(() => points.map((p) => [p.x, p.y] as const), [points]);
    const pe = useMemo(() => pearson(pairs), [pairs]);
    const sp = useMemo(() => spearman(pairs), [pairs]);
    const reg = useMemo(() => linearRegression(pairs), [pairs]);

    const groupStats = useMemo(() => {
        if (!colorByGroup) return [];
        return GROUPS.map((g) => {
            const gp = points.filter((p) => p.group === g);
            return {
                group: g,
                n: gp.length,
                result: pearson(gp.map((p) => [p.x, p.y] as const)),
            };
        }).filter((s) => s.n > 0);
    }, [points, colorByGroup]);

    return (
        <Panel>
            <StatBlock title="解析対象">
                <Row label="有効ペア n" value={points.length} />
                <Row label="欠損のため除外" value={missingN} />
            </StatBlock>

            <StatBlock title="Pearson 相関">
                {pe ? (
                    <>
                        <Row label="r" value={pe.r.toFixed(3)} />
                        <Row
                            label="95%CI"
                            value={pe.ci ? `[${pe.ci[0].toFixed(3)}, ${pe.ci[1].toFixed(3)}]` : "—"}
                        />
                        <Row label="p値（両側）" value={formatP(pe.p)} />
                        <p className="pt-0.5 text-right text-xs text-slate-500">{rStrength(pe.r)}</p>
                    </>
                ) : (
                    <p className="text-xs text-slate-500">データ不足（n≥3 かつ分散が必要）</p>
                )}
            </StatBlock>

            <StatBlock title="Spearman 順位相関">
                {sp ? (
                    <>
                        <Row label="ρ" value={sp.rho.toFixed(3)} />
                        <Row label="p値（両側）" value={formatP(sp.p)} />
                        {sp.n < 10 && (
                            <p className="pt-0.5 text-right text-xs text-amber-400/80">
                                n&lt;10 のため p 値は参考値
                            </p>
                        )}
                    </>
                ) : (
                    <p className="text-xs text-slate-500">データ不足</p>
                )}
            </StatBlock>

            <StatBlock title="単回帰（最小二乗法）">
                {reg ? (
                    <>
                        <Row
                            label="回帰式"
                            value={`y = ${reg.slope.toFixed(3)}x ${reg.intercept >= 0 ? "+" : "−"} ${Math.abs(reg.intercept).toFixed(2)}`}
                        />
                        <Row label="R²" value={reg.r2.toFixed(3)} />
                        <p className="pt-0.5 text-right text-xs text-slate-500">
                            {xVar.label} 1{xVar.unit ?? ""} あたり {yVar.label} {reg.slope >= 0 ? "+" : ""}
                            {reg.slope.toFixed(2)}
                            {yVar.unit ?? ""}
                        </p>
                    </>
                ) : (
                    <p className="text-xs text-slate-500">データ不足</p>
                )}
            </StatBlock>

            {colorByGroup && groupStats.length > 0 && (
                <StatBlock title="治療群別の Pearson r">
                    {groupStats.map((s) => (
                        <div key={s.group} className="flex items-baseline justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ backgroundColor: treatmentColor(s.group) }}
                                />
                                {TREATMENT_LABEL[s.group]}（n={s.n}）
                            </span>
                            <span className="font-mono text-sm text-slate-200">
                                {s.result ? `r=${s.result.r.toFixed(3)}, ${formatP(s.result.p)}` : "—"}
                            </span>
                        </div>
                    ))}
                </StatBlock>
            )}
        </Panel>
    );
}

export function CompareStats({
    groups,
    yVar,
}: {
    groups: ComparisonGroup[];
    yVar: NumericVariable;
}) {
    const withData = groups.filter((g) => g.values.length > 0);
    const twoGroups = withData.length === 2;

    const welch = twoGroups ? welchTTest(withData[0].values, withData[1].values) : null;
    const mwu = twoGroups ? mannWhitneyU(withData[0].values, withData[1].values) : null;
    const smallSample = twoGroups && withData.some((g) => g.values.length < 8);

    return (
        <Panel>
            <StatBlock title={`群別要約（${yVar.label}${yVar.unit ? `・${yVar.unit}` : ""}）`}>
                {withData.length === 0 ? (
                    <p className="text-xs text-slate-500">データなし</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-slate-500">
                                    <th className="pb-1 text-left font-medium">群</th>
                                    <th className="pb-1 text-right font-medium">n</th>
                                    <th className="pb-1 text-right font-medium">平均±SD</th>
                                    <th className="pb-1 text-right font-medium">中央値 [IQR]</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-300">
                                {withData.map((g) => {
                                    const [q1, q3] = iqr(g.values);
                                    return (
                                        <tr key={g.name} className="border-t border-slate-800">
                                            <td className="py-1 pr-2">{g.name}</td>
                                            <td className="py-1 text-right font-mono">{g.values.length}</td>
                                            <td className="py-1 text-right font-mono">
                                                {formatDays(mean(g.values))}±
                                                {g.values.length > 1 ? formatDays(sd(g.values)) : "—"}
                                            </td>
                                            <td className="py-1 text-right font-mono">
                                                {formatDays(median(g.values))} [{formatDays(q1)}–{formatDays(q3)}]
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </StatBlock>

            <StatBlock title="2群間の検定">
                {twoGroups ? (
                    <>
                        <Row
                            label="Welch t検定"
                            value={
                                welch ? `t=${welch.t.toFixed(2)}, ${formatP(welch.p)}` : "計算不可"
                            }
                        />
                        <Row
                            label="Mann–Whitney U"
                            value={mwu ? `U=${mwu.u}, ${formatP(mwu.p)}` : "計算不可"}
                        />
                        {smallSample && (
                            <p className="pt-0.5 text-right text-xs text-amber-400/80">
                                少数例（n&lt;8 の群あり）のため p 値は参考値
                            </p>
                        )}
                    </>
                ) : (
                    <p className="text-xs text-slate-500">
                        {withData.length < 2
                            ? "比較できる群が 2 つ未満です"
                            : "3群以上の検定は対象外です。CSV を出力して解析ソフト（EZR 等の Kruskal–Wallis 検定など）をご利用ください。"}
                    </p>
                )}
            </StatBlock>
        </Panel>
    );
}
