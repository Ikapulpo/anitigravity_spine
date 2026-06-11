"use client";

import { DerivedPatient } from "@/lib/derive";
import KpiRow from "@/components/overview/KpiRow";
import EpidemiologySection from "@/components/overview/EpidemiologySection";
import LosSection from "@/components/overview/LosSection";
import OutcomeSection from "@/components/overview/OutcomeSection";

export default function OverviewTab({ data }: { data: DerivedPatient[] }) {
    return (
        <>
            <KpiRow data={data} />
            <EpidemiologySection data={data} />
            <LosSection data={data} />
            <OutcomeSection data={data} />
        </>
    );
}
