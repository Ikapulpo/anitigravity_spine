import { ReactNode } from "react";
import clsx from "clsx";

// チャート用パネル。height を固定して ResponsiveContainer の親にする。
export default function ChartCard({
    title,
    subtitle,
    badge,
    height = 280,
    className,
    children,
}: {
    title: string;
    subtitle?: ReactNode;
    badge?: ReactNode; // 右上のバッジ（p 値など）
    height?: number;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={clsx(
                "rounded-xl border border-slate-800 bg-slate-900/70 p-4",
                className
            )}
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
                    {subtitle && (
                        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
                    )}
                </div>
                {badge}
            </div>
            <div style={{ height }}>{children}</div>
        </div>
    );
}
