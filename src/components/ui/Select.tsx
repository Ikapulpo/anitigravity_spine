"use client";

import { SelectHTMLAttributes } from "react";
import clsx from "clsx";

// ダークテーマ用のネイティブ select。option は children で渡す。
export default function Select({
    label,
    className,
    children,
    ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
    const select = (
        <select
            {...rest}
            className={clsx(
                "rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-200",
                "focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500",
                className
            )}
        >
            {children}
        </select>
    );

    if (!label) return select;
    return (
        <label className="flex items-center gap-2 text-xs font-medium text-slate-400">
            {label}
            {select}
        </label>
    );
}
