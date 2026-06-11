// 研究用 CSV 出力。日本語ヘッダ + UTF-8 BOM + CRLF で Excel / EZR / SPSS に
// そのまま読み込める形式にする。元データ（生の値）と派生値の両方を含める。

import { DerivedPatient, TREATMENT_LABEL } from "./derive";
import { ALL_VARIABLES } from "./variables";

const RAW_COLUMNS: { header: string; accessor: (p: DerivedPatient) => string }[] = [
    { header: "ID", accessor: (p) => p.id },
    { header: "タイムスタンプ", accessor: (p) => p.raw.timestamp },
    { header: "性別（原文）", accessor: (p) => p.raw.gender },
    { header: "受傷日", accessor: (p) => p.raw.injuryDate },
    { header: "受傷機転（原文）", accessor: (p) => p.raw.fallHistory },
    { header: "受傷前ADL", accessor: (p) => p.raw.preInjuryADL },
    { header: "神経症状（原文）", accessor: (p) => p.raw.neuroSymptoms },
    { header: "MRI", accessor: (p) => p.raw.mriImage },
    { header: "既往歴", accessor: (p) => p.raw.medicalHistory },
    { header: "骨粗鬆症治療歴（原文）", accessor: (p) => p.raw.osteoporosisHistory },
    { header: "疼痛（原文）", accessor: (p) => p.raw.currentPain },
    { header: "入院日", accessor: (p) => p.raw.admissionDate },
    { header: "骨折椎体（原文）", accessor: (p) => p.raw.newFractures },
    { header: "転帰（原文）", accessor: (p) => p.raw.outcome },
    { header: "手術日", accessor: (p) => p.raw.surgeryDate },
    { header: "退院日", accessor: (p) => p.raw.dischargeDate },
    { header: "合併症（原文）", accessor: (p) => p.raw.complications ?? "" },
    { header: "備考", accessor: (p) => p.raw.remarks },
    { header: "備考2", accessor: (p) => p.raw.remarks2 ?? "" },
];

const escapeCell = (value: string): string => {
    if (/[",\r\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
};

export function buildPatientCsv(data: DerivedPatient[]): string {
    const headers = [
        ...RAW_COLUMNS.map((c) => c.header),
        "治療群",
        ...ALL_VARIABLES.map((v) => v.label + ("unit" in v && v.unit ? `(${v.unit})` : "")),
    ];

    const rows = data.map((p) => {
        const rawCells = RAW_COLUMNS.map((c) => c.accessor(p));
        const derivedCells = ALL_VARIABLES.map((v) => {
            const value = v.accessor(p);
            return value === null ? "" : String(value);
        });
        return [...rawCells, TREATMENT_LABEL[p.treatmentGroup], ...derivedCells]
            .map(escapeCell)
            .join(",");
    });

    return [headers.map(escapeCell).join(","), ...rows].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
    // BOM を付けないと Excel が UTF-8 を認識しない
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
