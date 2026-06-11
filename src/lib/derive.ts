// 生の PatientRecord から数値・分類済みフィールドを派生させる唯一の場所。
// 在院日数・術後日数などの日数計算は旧 Dashboard.tsx の集計ロジックと
// 同一の結果になるよう、dates.ts のヘルパーを同じ引数で呼ぶこと。

import { PatientRecord } from "@/types/patient";
import {
    calculateFromDates,
    calculateHospitalizationDays,
    extractBaseYear,
} from "./dates";

export type TreatmentGroup = "surgery" | "conservative" | "other";
export type FallCategory = "fall" | "no_fall" | "other";

export const TREATMENT_LABEL: Record<TreatmentGroup, string> = {
    surgery: "手術",
    conservative: "保存",
    other: "その他",
};

export const FALL_LABEL: Record<FallCategory, string> = {
    fall: "転倒",
    no_fall: "転倒なし",
    other: "その他",
};

export const AGE_GROUPS = ["<60", "60-69", "70-79", "80-89", "90+"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export interface DerivedPatient {
    raw: PatientRecord; // テーブル・CSV 用に元レコードを保持
    id: string;
    gender: "male" | "female" | null;
    genderLabel: string | null; // 男性/女性
    ageNum: number | null;
    ageGroup: AgeGroup | null;
    baseYear: number;
    yearLabel: string | null; // timestamp の年（年フィルタ用）
    monthKey: string | null; // "YYYY-MM"（月別推移用）
    treatmentGroup: TreatmentGroup;
    procedureLabel: string | null;
    fallCategory: FallCategory;
    fractureLevels: string[]; // ["L1", "L2"] など
    fractureLevelIndex: number | null; // 先頭の骨折椎体 T1=1〜T12=12, L1=13〜L5=17
    ofClassification: string | null;
    losDays: number | null; // 在院日数
    preOpDays: number | null; // 入院→手術（術前待機日数）
    postOpDays: number | null; // 術後在院日数
    timeToSurgeryDays: number | null; // 受傷→手術
    timeToAdmissionDays: number | null; // 受傷→入院
    heightNum: number | null;
    weightNum: number | null;
    bmiNum: number | null;
    onOsteoporosisTx: boolean | null; // 受傷前の骨粗鬆症治療の有無
    hasNeuroSymptoms: boolean | null;
    dischargeDestination: string | null;
    // --- 研究用項目（未入力は null）---
    bmdYamPercent: number | null;
    bmdTScore: number | null;
    nrsOnAdmission: number | null;
    nrsAtDischarge: number | null;
    nrsImprovement: number | null; // 入院時 − 退院時（正=改善）
    barthelOnAdmission: number | null;
    barthelAtDischarge: number | null;
    ambulationAtDischarge: string | null;
    albumin: number | null;
    vitD25OH: number | null;
    complicationsList: string[];
    hasComplication: boolean | null;
    adjacentFracture: boolean | null;
    readmission90d: boolean | null;
    deathStatus: string | null;
    braceType: string | null;
    opMedAtDischarge: string | null;
}

// "6 days" "14日" "21.5" などから数値を取り出す。数値が含まれなければ null
const toNum = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const s = String(v).trim();
    if (!s) return null;
    const m = s.match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
};

const toStr = (v: unknown): string | null => {
    const s = String(v ?? "").trim();
    return s ? s : null;
};

// あり/なし系の値を boolean に正規化（解釈できない値は null = 欠損扱い）
const toBool = (v: unknown): boolean | null => {
    const s = String(v ?? "").trim();
    if (!s) return null;
    if (/^(あり|有|はい|yes|y|true|1|\+)$/i.test(s)) return true;
    if (/^(なし|無|いいえ|no|n|false|0|-)$/i.test(s)) return false;
    return null;
};

// 旧 Dashboard.tsx と同じ判定。手術キーワードを優先する
export const classifyTreatment = (outcome: string): TreatmentGroup => {
    const o = String(outcome ?? "");
    if (o.includes("Surgery") || o.includes("手術")) return "surgery";
    if (
        o.includes("Observation") ||
        o.includes("Conservative") ||
        o.includes("保存") ||
        o.includes("経過観察")
    ) {
        return "conservative";
    }
    return "other";
};

// 旧 Dashboard.tsx の normalizeFallHistory を移設
export const normalizeFallHistory = (value: string): FallCategory => {
    const v = String(value || "").trim();
    if (v.includes("転倒あり") || v.toLowerCase() === "yes") return "fall";
    if (v === "なし" || v.toLowerCase() === "no") return "no_fall";
    return "other";
};

const classifyGender = (value: string): "male" | "female" | null => {
    const v = String(value ?? "").trim().toLowerCase();
    if (!v) return null;
    if (v.includes("female") || v.includes("女") || v === "f") return "female";
    if (v.includes("male") || v.includes("男") || v === "m") return "male";
    return null;
};

const toAgeGroup = (age: number | null): AgeGroup | null => {
    if (age === null) return null;
    if (age < 60) return "<60";
    if (age < 70) return "60-69";
    if (age < 80) return "70-79";
    if (age < 90) return "80-89";
    return "90+";
};

// 骨折椎体を数値軸に乗せるための指数（散布図用）: T1=1 〜 T12=12, L1=13 〜 L5=17
export const fractureLevelToIndex = (level: string): number | null => {
    const m = String(level).trim().toUpperCase().match(/^([TL])(\d{1,2})$/);
    if (!m) return null;
    const n = parseInt(m[2]);
    if (m[1] === "T" && n >= 1 && n <= 12) return n;
    if (m[1] === "L" && n >= 1 && n <= 5) return 12 + n;
    return null;
};

export const FRACTURE_LEVEL_NAMES = [
    "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12",
    "L1", "L2", "L3", "L4", "L5",
] as const;

export const fractureIndexToName = (index: number): string =>
    FRACTURE_LEVEL_NAMES[index - 1] ?? String(index);

const parseFractureLevels = (newFractures: string): string[] =>
    String(newFractures ?? "")
        .split(/[,、\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

export function derivePatient(raw: PatientRecord): DerivedPatient {
    const ageNum = raw.age > 0 ? raw.age : null;

    const tsDate = raw.timestamp ? new Date(raw.timestamp) : null;
    const tsValid = tsDate !== null && !isNaN(tsDate.getTime());
    const yearLabel = tsValid ? String(tsDate.getFullYear()) : null;
    const monthKey = tsValid
        ? `${tsDate.getFullYear()}-${String(tsDate.getMonth() + 1).padStart(2, "0")}`
        : null;

    const treatmentGroup = classifyTreatment(raw.outcome);

    // 在院日数: 旧コードと同じ引数構成（hospitalizationPeriod || followUpStatus）
    const losDays = calculateHospitalizationDays(
        raw.admissionDate,
        raw.hospitalizationPeriod || raw.followUpStatus,
        raw.timestamp,
        raw.dischargeDate
    );

    // 入院→手術（術前待機日数）
    let preOpDays: number | null = null;
    if (raw.surgeryDate) {
        const d = calculateHospitalizationDays(raw.admissionDate, raw.surgeryDate, raw.timestamp);
        if (d !== null && d >= 0) preOpDays = d;
    }

    // 術後在院日数: 旧テーブル・集計と同じ手順（総日数−術前 → だめなら手術日→退院日）
    let postOpDays: number | null = null;
    if (treatmentGroup === "surgery") {
        if (losDays !== null) {
            const pre = calculateHospitalizationDays(raw.admissionDate, raw.surgeryDate, raw.timestamp);
            if (pre !== null) {
                const post = losDays - pre;
                if (post >= 0) postOpDays = post;
            }
        }
        if (postOpDays === null && raw.surgeryDate && raw.dischargeDate) {
            const d = calculateFromDates(raw.surgeryDate, raw.dischargeDate, raw.timestamp);
            if (d !== null && d >= 0) postOpDays = d;
        }
    }

    // 受傷→手術
    let timeToSurgeryDays: number | null = null;
    if (raw.surgeryDate) {
        const d = calculateHospitalizationDays(raw.injuryDate, raw.surgeryDate, raw.timestamp);
        if (d !== null && d >= 0) timeToSurgeryDays = d;
    }

    // 受傷→入院: まず timeToAdmission（"6 days" 等）、なければ日付から
    let timeToAdmissionDays = toNum(raw.timeToAdmission);
    if (timeToAdmissionDays !== null && timeToAdmissionDays < 0) timeToAdmissionDays = null;
    if (timeToAdmissionDays === null && raw.injuryDate && raw.admissionDate) {
        const d = calculateHospitalizationDays(raw.injuryDate, raw.admissionDate, raw.timestamp);
        if (d !== null && d >= 0) timeToAdmissionDays = d;
    }

    const heightNum = toNum(raw.height);
    const weightNum = toNum(raw.weight);
    let bmiNum = toNum(raw.bmi);
    if (bmiNum === null && heightNum !== null && heightNum > 0 && weightNum !== null) {
        bmiNum = Math.round((weightNum / Math.pow(heightNum / 100, 2)) * 10) / 10;
    }

    const osteo = String(raw.osteoporosisHistory ?? "").trim();
    const onOsteoporosisTx = osteo
        ? !/^(none|なし|無|未治療)$/i.test(osteo)
        : null;

    const neuro = String(raw.neuroSymptoms ?? "").trim();
    const hasNeuroSymptoms = neuro ? !/^(none|なし|無)$/i.test(neuro) : null;

    const fractureLevels = parseFractureLevels(raw.newFractures);
    const fractureLevelIndex =
        fractureLevels.map(fractureLevelToIndex).find((v): v is number => v !== null) ?? null;

    const nrsOnAdmission = toNum(raw.nrsOnAdmission);
    const nrsAtDischarge = toNum(raw.nrsAtDischarge);

    const complicationsList = String(raw.complications ?? "")
        .split(/[,、・\s]+/)
        .map((s) => s.trim())
        .filter((s) => s && !/^(none|なし|無)$/i.test(s));
    const hasComplication = toStr(raw.complications) === null ? null : complicationsList.length > 0;

    return {
        raw,
        id: String(raw.id ?? ""),
        gender: classifyGender(raw.gender),
        genderLabel:
            classifyGender(raw.gender) === "female"
                ? "女性"
                : classifyGender(raw.gender) === "male"
                    ? "男性"
                    : null,
        ageNum,
        ageGroup: toAgeGroup(ageNum),
        baseYear: extractBaseYear(raw.timestamp),
        yearLabel,
        monthKey,
        treatmentGroup,
        procedureLabel: toStr(raw.procedure),
        fallCategory: normalizeFallHistory(raw.fallHistory),
        fractureLevels,
        fractureLevelIndex,
        ofClassification: toStr(raw.ofClassification),
        losDays,
        preOpDays,
        postOpDays,
        timeToSurgeryDays,
        timeToAdmissionDays,
        heightNum,
        weightNum,
        bmiNum,
        onOsteoporosisTx,
        hasNeuroSymptoms,
        dischargeDestination: toStr(raw.dischargeDestination),
        bmdYamPercent: toNum(raw.bmdYamPercent),
        bmdTScore: toNum(raw.bmdTScore),
        nrsOnAdmission,
        nrsAtDischarge,
        nrsImprovement:
            nrsOnAdmission !== null && nrsAtDischarge !== null
                ? nrsOnAdmission - nrsAtDischarge
                : null,
        barthelOnAdmission: toNum(raw.barthelOnAdmission),
        barthelAtDischarge: toNum(raw.barthelAtDischarge),
        ambulationAtDischarge: toStr(raw.ambulationAtDischarge),
        albumin: toNum(raw.albumin),
        vitD25OH: toNum(raw.vitD25OH),
        complicationsList,
        hasComplication,
        adjacentFracture: toBool(raw.adjacentFracture),
        readmission90d: toBool(raw.readmission90d),
        deathStatus: toStr(raw.deathStatus),
        braceType: toStr(raw.braceType),
        opMedAtDischarge: toStr(raw.opMedAtDischarge),
    };
}
