"use client";

import { ChartScatter, LayoutDashboard, LucideIcon, Table2 } from "lucide-react";
import clsx from "clsx";

export type TabKey = "overview" | "analysis" | "patients";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
    { key: "overview", label: "概況", icon: LayoutDashboard },
    { key: "analysis", label: "相関分析", icon: ChartScatter },
    { key: "patients", label: "症例一覧", icon: Table2 },
];

export default function TabBar({
    active,
    onChange,
}: {
    active: TabKey;
    onChange: (tab: TabKey) => void;
}) {
    return (
        <nav className="flex gap-1 border-b border-slate-800">
            {TABS.map(({ key, label, icon: Icon }) => (
                <button
                    key={key}
                    onClick={() => onChange(key)}
                    className={clsx(
                        "-mb-px flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                        active === key
                            ? "border-accent bg-slate-900/60 text-cyan-300"
                            : "border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
                    )}
                >
                    <Icon size={16} />
                    {label}
                </button>
            ))}
        </nav>
    );
}
