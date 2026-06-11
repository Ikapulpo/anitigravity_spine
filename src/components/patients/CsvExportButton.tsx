"use client";

import { Download } from "lucide-react";
import { DerivedPatient } from "@/lib/derive";
import { buildPatientCsv, downloadCsv } from "@/lib/csv";

// 表示中（フィルタ・ソート適用後）の症例を研究用 CSV としてダウンロードする
export default function CsvExportButton({ data }: { data: DerivedPatient[] }) {
    const handleClick = () => {
        const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        downloadCsv(`ovf_export_${stamp}.csv`, buildPatientCsv(data));
    };

    return (
        <button
            onClick={handleClick}
            disabled={data.length === 0}
            className="flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            title="表示中の症例を日本語ヘッダ付き CSV（UTF-8 BOM）でダウンロード"
        >
            <Download size={13} />
            CSV出力（{data.length}件）
        </button>
    );
}
