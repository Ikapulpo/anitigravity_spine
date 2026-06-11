import { ReactNode } from "react";

export default function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="mb-8">
            <div className="mb-3">
                <h2 className="text-base font-bold text-slate-100">{title}</h2>
                {description && (
                    <p className="mt-0.5 text-xs text-slate-500">{description}</p>
                )}
            </div>
            {children}
        </section>
    );
}
