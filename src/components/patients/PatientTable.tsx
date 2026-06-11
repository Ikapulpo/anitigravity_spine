"use client";

import { ReactNode } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, Search } from "lucide-react";
import clsx from "clsx";
import { DerivedPatient, TREATMENT_LABEL } from "@/lib/derive";
import { formatDateJa } from "@/lib/dates";
import { ALL_VARIABLES, availableVariables } from "@/lib/variables";
import { TableState } from "@/components/tabs/PatientsTab";

export interface PatientColumn {
    key: string;
    header: string;
    sortValue?: (p: DerivedPatient) => string | number | null;
    render: (p: DerivedPatient) => ReactNode;
}

const BADGE_CLASS: Record<DerivedPatient["treatmentGroup"], string> = {
    surgery: "border-rose-500/30 bg-rose-500/15 text-rose-300",
    conservative: "border-sky-500/30 bg-sky-500/15 text-sky-300",
    other: "border-slate-600/40 bg-slate-600/20 text-slate-300",
};

const dash = <span className="text-slate-600">—</span>;

const BASE_COLUMNS: PatientColumn[] = [
    {
        key: "id",
        header: "ID",
        sortValue: (p) => p.id || null,
        render: (p) => <span className="font-medium text-slate-200">{p.id || "—"}</span>,
    },
    {
        key: "age",
        header: "年齢 / 性別",
        sortValue: (p) => p.ageNum,
        render: (p) => (
            <span>
                {p.ageNum ?? "—"} / {p.genderLabel ?? "—"}
            </span>
        ),
    },
    {
        key: "treatment",
        header: "転帰",
        sortValue: (p) => TREATMENT_LABEL[p.treatmentGroup],
        render: (p) => (
            <span
                title={p.raw.outcome || undefined}
                className={clsx(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    BADGE_CLASS[p.treatmentGroup]
                )}
            >
                {p.raw.outcome.trim() || "未記入"}
            </span>
        ),
    },
    {
        key: "procedure",
        header: "術式",
        sortValue: (p) => p.procedureLabel,
        render: (p) => p.procedureLabel ?? dash,
    },
    {
        key: "admission",
        header: "入院日",
        sortValue: (p) => p.raw.admissionDate || null,
        render: (p) => (p.raw.admissionDate ? p.raw.admissionDate : "外来"),
    },
    {
        key: "surgeryDate",
        header: "手術日",
        sortValue: (p) => p.raw.surgeryDate || null,
        render: (p) =>
            p.raw.surgeryDate ? formatDateJa(p.raw.surgeryDate, p.raw.timestamp) : dash,
    },
    {
        key: "discharge",
        header: "退院日",
        sortValue: (p) => p.raw.dischargeDate || null,
        render: (p) =>
            p.raw.dischargeDate ? formatDateJa(p.raw.dischargeDate, p.raw.timestamp) : dash,
    },
    {
        key: "los",
        header: "在院日数",
        sortValue: (p) => p.losDays,
        render: (p) => (p.losDays !== null ? `${p.losDays}日` : dash),
    },
    {
        key: "postOp",
        header: "術後日数",
        sortValue: (p) => p.postOpDays,
        render: (p) => (p.postOpDays !== null ? `${p.postOpDays}日` : dash),
    },
    {
        key: "fractures",
        header: "骨折椎体",
        sortValue: (p) => p.fractureLevelIndex,
        render: (p) => (p.fractureLevels.length > 0 ? p.fractureLevels.join(", ") : dash),
    },
    {
        key: "of",
        header: "OF分類",
        sortValue: (p) => p.ofClassification,
        render: (p) => p.ofClassification ?? dash,
    },
    {
        key: "destination",
        header: "退院先",
        sortValue: (p) => p.dischargeDestination,
        render: (p) => p.dischargeDestination ?? dash,
    },
    {
        key: "mri",
        header: "MRI",
        render: (p) => {
            const urls = String(p.raw.mriImage ?? "")
                .split(/[,、\s]+/)
                .filter((url) => url.trim().startsWith("http"));
            if (urls.length === 0) return dash;
            return (
                <div className="flex flex-col gap-0.5">
                    {urls.map((url, i) => (
                        <a
                            key={i}
                            href={url.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                            <Search size={13} />
                            <span className="text-xs">画像 {i + 1}</span>
                        </a>
                    ))}
                </div>
            );
        },
    },
];

// 研究用項目はデータが 1 件でも入力されたら列として自動表示する
export function buildColumns(data: DerivedPatient[]): PatientColumn[] {
    const research = availableVariables(
        ALL_VARIABLES.filter((v) => v.research),
        data,
        1
    ).map((v): PatientColumn => ({
        key: v.key,
        header: v.label,
        sortValue: (p) => v.accessor(p),
        render: (p) => {
            const value = v.accessor(p);
            if (value === null) return dash;
            return v.type === "numeric" && v.unit ? `${value} ${v.unit}` : String(value);
        },
    }));
    return [...BASE_COLUMNS, ...research];
}

export default function PatientTable({
    data,
    columns,
    state,
    onChange,
}: {
    data: DerivedPatient[];
    columns: PatientColumn[];
    state: TableState;
    onChange: (state: TableState) => void;
}) {
    const handleSort = (col: PatientColumn) => {
        if (!col.sortValue) return;
        if (state.sortKey === col.key) {
            onChange({ ...state, sortDir: state.sortDir === "asc" ? "desc" : "asc" });
        } else {
            onChange({ ...state, sortKey: col.key, sortDir: "asc" });
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-900 text-xs text-slate-500">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} className="whitespace-nowrap px-3 py-3 font-semibold">
                                {col.sortValue ? (
                                    <button
                                        onClick={() => handleSort(col)}
                                        className="flex items-center gap-1 hover:text-slate-300"
                                    >
                                        {col.header}
                                        {state.sortKey === col.key ? (
                                            state.sortDir === "asc" ? (
                                                <ChevronUp size={13} className="text-cyan-400" />
                                            ) : (
                                                <ChevronDown size={13} className="text-cyan-400" />
                                            )
                                        ) : (
                                            <ArrowUpDown size={12} className="opacity-40" />
                                        )}
                                    </button>
                                ) : (
                                    col.header
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                    {data.map((p, i) => (
                        <tr key={p.id || `row-${i}`} className="transition-colors hover:bg-slate-800/40">
                            {columns.map((col) => (
                                <td key={col.key} className="whitespace-nowrap px-3 py-2.5">
                                    {col.render(p)}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-6 py-10 text-center text-slate-500"
                            >
                                条件に一致する症例がありません
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
