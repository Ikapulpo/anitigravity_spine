import { LucideIcon } from "lucide-react";
import clsx from "clsx";
import { ReactNode } from "react";

// KPI カード。value は文字列でも JSX でも可。
export default function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    iconClass,
    className,
}: {
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    icon?: LucideIcon;
    iconClass?: string; // 例: "text-rose-400 bg-rose-400/10"
    className?: string;
}) {
    return (
        <div
            className={clsx(
                "rounded-xl border border-slate-800 bg-slate-900/70 p-4",
                className
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-400">{label}</p>
                {Icon && (
                    <span
                        className={clsx(
                            "rounded-lg p-1.5",
                            iconClass ?? "bg-cyan-400/10 text-cyan-300"
                        )}
                    >
                        <Icon size={16} />
                    </span>
                )}
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-slate-100">
                {value}
            </div>
            {sub !== undefined && (
                <div className="mt-1 text-xs text-slate-500">{sub}</div>
            )}
        </div>
    );
}
