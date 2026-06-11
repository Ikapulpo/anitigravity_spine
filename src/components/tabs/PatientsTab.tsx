"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import { DerivedPatient, FRACTURE_LEVEL_NAMES } from "@/lib/derive";
import Select from "@/components/ui/Select";
import PatientTable, { buildColumns } from "@/components/patients/PatientTable";
import CsvExportButton from "@/components/patients/CsvExportButton";

export interface TableState {
    query: string;
    sortKey: string;
    sortDir: "asc" | "desc";
    levelFilter: string; // "All" または T1〜L5
}

export const DEFAULT_TABLE_STATE: TableState = {
    query: "",
    sortKey: "id",
    sortDir: "asc",
    levelFilter: "All",
};

export default function PatientsTab({
    data,
    state,
    onChange,
}: {
    data: DerivedPatient[];
    state: TableState;
    onChange: (state: TableState) => void;
}) {
    const columns = useMemo(() => buildColumns(data), [data]);

    const levels = useMemo(
        () =>
            FRACTURE_LEVEL_NAMES.filter((name) =>
                data.some((d) => d.fractureLevels.includes(name))
            ),
        [data]
    );

    const filtered = useMemo(() => {
        const q = state.query.trim().toLowerCase();
        return data.filter((d) => {
            if (state.levelFilter !== "All" && !d.fractureLevels.includes(state.levelFilter)) {
                return false;
            }
            if (!q) return true;
            return [d.id, d.raw.outcome, d.raw.newFractures, d.raw.procedure].some((s) =>
                String(s).toLowerCase().includes(q)
            );
        });
    }, [data, state.query, state.levelFilter]);

    // ソート（null は昇順/降順にかかわらず常に末尾）
    const sorted = useMemo(() => {
        const col = columns.find((c) => c.key === state.sortKey);
        if (!col?.sortValue) return filtered;
        const sortValue = col.sortValue;
        const dir = state.sortDir === "asc" ? 1 : -1;
        return [...filtered].sort((a, b) => {
            const av = sortValue(a);
            const bv = sortValue(b);
            if (av === null && bv === null) return 0;
            if (av === null) return 1;
            if (bv === null) return -1;
            const cmp =
                typeof av === "number" && typeof bv === "number"
                    ? av - bv
                    : String(av).localeCompare(String(bv), "ja");
            return cmp * dir;
        });
    }, [filtered, columns, state.sortKey, state.sortDir]);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
            <div className="flex flex-col gap-3 border-b border-slate-800 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-200">症例一覧</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {sorted.length} 件表示　|　列見出しをクリックでソート
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                            size={15}
                        />
                        <input
                            type="text"
                            placeholder="ID・転帰・椎体・術式で検索"
                            value={state.query}
                            onChange={(e) => onChange({ ...state, query: e.target.value })}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 md:w-64"
                        />
                    </div>
                    <Select
                        label="骨折椎体"
                        value={state.levelFilter}
                        onChange={(e) => onChange({ ...state, levelFilter: e.target.value })}
                    >
                        <option value="All">すべて</option>
                        {levels.map((l) => (
                            <option key={l} value={l}>
                                {l}
                            </option>
                        ))}
                    </Select>
                    <CsvExportButton data={sorted} />
                </div>
            </div>

            <PatientTable data={sorted} columns={columns} state={state} onChange={onChange} />
        </div>
    );
}
