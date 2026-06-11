"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import Section from "@/components/ui/Section";
import ChartCard from "@/components/ui/ChartCard";
import { axisProps, gridProps, tooltipProps } from "@/components/ui/chartTheme";
import { DerivedPatient } from "@/lib/derive";
import { countBy } from "@/lib/aggregate";

export default function OutcomeSection({ data }: { data: DerivedPatient[] }) {
    const destData = countBy(data, (d) => d.dischargeDestination).sort(
        (a, b) => b.value - a.value
    );

    // 研究用項目はデータが入力され始めたら自動で表示する
    const ambulationData = countBy(data, (d) => d.ambulationAtDischarge);
    const ambulationOrder = ["独歩", "杖", "歩行器", "車椅子", "寝たきり"];
    ambulationData.sort(
        (a, b) => ambulationOrder.indexOf(a.name) - ambulationOrder.indexOf(b.name)
    );

    const complicationCounts = new Map<string, number>();
    for (const d of data) {
        for (const c of d.complicationsList) {
            complicationCounts.set(c, (complicationCounts.get(c) ?? 0) + 1);
        }
    }
    const complicationData = [...complicationCounts.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    const complicationKnownN = data.filter((d) => d.hasComplication !== null).length;
    const complicationN = data.filter((d) => d.hasComplication === true).length;

    return (
        <Section title="転帰" description="退院先と退院時の状態">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ChartCard title="退院先" subtitle="記載のある症例のみ">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={destData} layout="vertical">
                            <CartesianGrid {...gridProps} horizontal={false} />
                            <XAxis type="number" allowDecimals={false} {...axisProps} />
                            <YAxis type="category" dataKey="name" width={100} {...axisProps} />
                            <Tooltip {...tooltipProps} />
                            <Bar dataKey="value" name="件数" fill="#34d399" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {ambulationData.length > 0 && (
                    <ChartCard title="退院時歩行能力" subtitle="研究用項目（記載のある症例のみ）">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ambulationData}>
                                <CartesianGrid {...gridProps} vertical={false} />
                                <XAxis dataKey="name" {...axisProps} />
                                <YAxis allowDecimals={false} {...axisProps} />
                                <Tooltip {...tooltipProps} />
                                <Bar dataKey="value" name="件数" fill="#22d3ee" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}

                {complicationData.length > 0 && (
                    <ChartCard
                        title="入院中合併症"
                        subtitle={`発生率 ${complicationKnownN > 0 ? Math.round((complicationN / complicationKnownN) * 100) : 0}%（${complicationN}/${complicationKnownN} 件・記載のある症例のみ）`}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={complicationData} layout="vertical">
                                <CartesianGrid {...gridProps} horizontal={false} />
                                <XAxis type="number" allowDecimals={false} {...axisProps} />
                                <YAxis type="category" dataKey="name" width={90} {...axisProps} />
                                <Tooltip {...tooltipProps} />
                                <Bar dataKey="value" name="件数" fill="#fbbf24" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}
            </div>
        </Section>
    );
}
