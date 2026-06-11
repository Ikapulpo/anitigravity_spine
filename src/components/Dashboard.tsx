"use client";

// ダッシュボードのシェル。データの派生計算・グローバルフィルタ・タブ切替のみを
// 担当し、画面の中身は tabs/ 以下の各タブコンポーネントに委譲する。
// 相関分析の設定とテーブルの状態はタブ切替で消えないようここで保持する。

import { useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import clsx from "clsx";
import { PatientRecord } from "@/types/patient";
import { derivePatient, TreatmentGroup } from "@/lib/derive";
import { logout } from "@/app/actions/auth";
import TabBar, { TabKey } from "@/components/ui/TabBar";
import Select from "@/components/ui/Select";
import OverviewTab from "@/components/tabs/OverviewTab";
import AnalysisTab, {
    AnalysisConfig,
    DEFAULT_ANALYSIS_CONFIG,
} from "@/components/tabs/AnalysisTab";
import PatientsTab, {
    DEFAULT_TABLE_STATE,
    TableState,
} from "@/components/tabs/PatientsTab";

const TREATMENT_FILTERS: {
    key: "all" | TreatmentGroup;
    label: string;
    activeClass: string;
}[] = [
    { key: "all", label: "全体", activeClass: "bg-slate-700 text-slate-100" },
    { key: "surgery", label: "手術", activeClass: "bg-rose-500/20 text-rose-300" },
    { key: "conservative", label: "保存", activeClass: "bg-sky-500/20 text-sky-300" },
];

export default function Dashboard({ patients }: { patients: PatientRecord[] }) {
    const [tab, setTab] = useState<TabKey>("overview");
    const [selectedYear, setSelectedYear] = useState("All");
    const [treatmentFilter, setTreatmentFilter] = useState<"all" | TreatmentGroup>("all");
    const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig>(DEFAULT_ANALYSIS_CONFIG);
    const [tableState, setTableState] = useState<TableState>(DEFAULT_TABLE_STATE);

    const derived = useMemo(() => patients.map(derivePatient), [patients]);

    const years = useMemo(
        () =>
            Array.from(
                new Set(derived.map((d) => d.yearLabel).filter((y): y is string => y !== null))
            )
                .sort()
                .reverse(),
        [derived]
    );

    const filtered = useMemo(
        () =>
            derived.filter(
                (d) =>
                    (selectedYear === "All" || d.yearLabel === selectedYear) &&
                    (treatmentFilter === "all" || d.treatmentGroup === treatmentFilter)
            ),
        [derived, selectedYear, treatmentFilter]
    );

    return (
        <div className="mx-auto min-h-screen max-w-screen-2xl px-4 py-6 md:px-8">
            <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-100 md:text-2xl">
                        脊椎OVFダッシュボード
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        骨粗鬆症性椎体骨折の疫学・治療・転帰　|　表示中{" "}
                        <span className="font-semibold text-slate-300">{filtered.length}</span> 件 / 全{" "}
                        {derived.length} 件
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Select
                        label="年"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        <option value="All">すべて</option>
                        {years.map((y) => (
                            <option key={y} value={y}>
                                {y}年
                            </option>
                        ))}
                    </Select>

                    <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5">
                        {TREATMENT_FILTERS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setTreatmentFilter(f.key)}
                                className={clsx(
                                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                                    treatmentFilter === f.key
                                        ? f.activeClass
                                        : "text-slate-400 hover:text-slate-200"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => logout()}
                        className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
                    >
                        <LogOut size={13} />
                        ログアウト
                    </button>
                </div>
            </header>

            <TabBar active={tab} onChange={setTab} />

            {/* アクティブタブのみマウントする（多数の ResponsiveContainer の同時描画を回避） */}
            <main className="mt-6">
                {tab === "overview" && <OverviewTab data={filtered} />}
                {tab === "analysis" && (
                    <AnalysisTab
                        data={filtered}
                        config={analysisConfig}
                        onChange={setAnalysisConfig}
                    />
                )}
                {tab === "patients" && (
                    <PatientsTab data={filtered} state={tableState} onChange={setTableState} />
                )}
            </main>
        </div>
    );
}
