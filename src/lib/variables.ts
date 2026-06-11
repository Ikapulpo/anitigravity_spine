// 分析用の変数レジストリ。相関分析タブの軸セレクタ・統計パネル・CSV 出力・
// 症例一覧の追加列はすべてここから生成される。新しい項目を増やすときは
// PatientRecord の型 + GAS のマッピング + ここへの 1 エントリ追加だけでよい。

import { DerivedPatient, FALL_LABEL, TREATMENT_LABEL, fractureIndexToName } from "./derive";

interface VariableBase {
    key: string;
    label: string; // 画面・CSVヘッダ共通の日本語ラベル
    research?: boolean; // 研究用追加項目（シート列28以降）
}

export interface NumericVariable extends VariableBase {
    type: "numeric";
    unit?: string;
    accessor: (p: DerivedPatient) => number | null;
    // 表示桁数（既定 1）
    digits?: number;
}

export interface CategoricalVariable extends VariableBase {
    type: "categorical";
    accessor: (p: DerivedPatient) => string | null;
    order?: string[]; // 表示順（未指定は出現順）
}

export type VariableDescriptor = NumericVariable | CategoricalVariable;

export const NUMERIC_VARIABLES: NumericVariable[] = [
    { type: "numeric", key: "age", label: "年齢", unit: "歳", digits: 0, accessor: (p) => p.ageNum },
    { type: "numeric", key: "bmi", label: "BMI", unit: "kg/m²", accessor: (p) => p.bmiNum },
    { type: "numeric", key: "height", label: "身長", unit: "cm", accessor: (p) => p.heightNum },
    { type: "numeric", key: "weight", label: "体重", unit: "kg", accessor: (p) => p.weightNum },
    { type: "numeric", key: "losDays", label: "在院日数", unit: "日", digits: 0, accessor: (p) => p.losDays },
    { type: "numeric", key: "postOpDays", label: "術後在院日数", unit: "日", digits: 0, accessor: (p) => p.postOpDays },
    { type: "numeric", key: "preOpDays", label: "術前待機日数", unit: "日", digits: 0, accessor: (p) => p.preOpDays },
    { type: "numeric", key: "timeToSurgeryDays", label: "受傷から手術まで", unit: "日", digits: 0, accessor: (p) => p.timeToSurgeryDays },
    { type: "numeric", key: "timeToAdmissionDays", label: "受傷から入院まで", unit: "日", digits: 0, accessor: (p) => p.timeToAdmissionDays },
    { type: "numeric", key: "fractureLevelIndex", label: "骨折椎体レベル", unit: "T1=1〜L5=17", digits: 0, accessor: (p) => p.fractureLevelIndex },
    { type: "numeric", key: "bmdYamPercent", label: "骨密度 YAM", unit: "%", research: true, accessor: (p) => p.bmdYamPercent },
    { type: "numeric", key: "bmdTScore", label: "骨密度 Tスコア", research: true, accessor: (p) => p.bmdTScore },
    { type: "numeric", key: "nrsOnAdmission", label: "入院時疼痛NRS", digits: 0, research: true, accessor: (p) => p.nrsOnAdmission },
    { type: "numeric", key: "nrsAtDischarge", label: "退院時疼痛NRS", digits: 0, research: true, accessor: (p) => p.nrsAtDischarge },
    { type: "numeric", key: "nrsImprovement", label: "疼痛改善度（NRS差）", digits: 0, research: true, accessor: (p) => p.nrsImprovement },
    { type: "numeric", key: "barthelOnAdmission", label: "入院時Barthel Index", digits: 0, research: true, accessor: (p) => p.barthelOnAdmission },
    { type: "numeric", key: "barthelAtDischarge", label: "退院時Barthel Index", digits: 0, research: true, accessor: (p) => p.barthelAtDischarge },
    { type: "numeric", key: "albumin", label: "血清アルブミン", unit: "g/dL", research: true, accessor: (p) => p.albumin },
    { type: "numeric", key: "vitD25OH", label: "25(OH)ビタミンD", unit: "ng/mL", research: true, accessor: (p) => p.vitD25OH },
];

const boolLabel = (v: boolean | null): string | null => (v === null ? null : v ? "あり" : "なし");

export const CATEGORICAL_VARIABLES: CategoricalVariable[] = [
    {
        type: "categorical",
        key: "treatmentGroup",
        label: "治療群",
        order: ["手術", "保存", "その他"],
        accessor: (p) => TREATMENT_LABEL[p.treatmentGroup],
    },
    {
        type: "categorical",
        key: "gender",
        label: "性別",
        order: ["女性", "男性"],
        accessor: (p) => p.genderLabel,
    },
    {
        type: "categorical",
        key: "ageGroup",
        label: "年齢層",
        order: ["<60", "60-69", "70-79", "80-89", "90+"],
        accessor: (p) => p.ageGroup,
    },
    {
        type: "categorical",
        key: "fallCategory",
        label: "受傷機転",
        order: ["転倒", "転倒なし", "その他"],
        accessor: (p) => FALL_LABEL[p.fallCategory],
    },
    {
        type: "categorical",
        key: "ofClassification",
        label: "OF分類",
        accessor: (p) => p.ofClassification,
    },
    {
        type: "categorical",
        key: "procedure",
        label: "術式",
        accessor: (p) => p.procedureLabel,
    },
    {
        type: "categorical",
        key: "primaryFractureLevel",
        label: "主骨折椎体",
        accessor: (p) =>
            p.fractureLevelIndex !== null ? fractureIndexToName(p.fractureLevelIndex) : null,
    },
    {
        type: "categorical",
        key: "onOsteoporosisTx",
        label: "骨粗鬆症治療歴",
        order: ["あり", "なし"],
        accessor: (p) => boolLabel(p.onOsteoporosisTx),
    },
    {
        type: "categorical",
        key: "hasNeuroSymptoms",
        label: "神経症状",
        order: ["あり", "なし"],
        accessor: (p) => boolLabel(p.hasNeuroSymptoms),
    },
    {
        type: "categorical",
        key: "dischargeDestination",
        label: "退院先",
        accessor: (p) => p.dischargeDestination,
    },
    {
        type: "categorical",
        key: "ambulationAtDischarge",
        label: "退院時歩行能力",
        order: ["独歩", "杖", "歩行器", "車椅子", "寝たきり"],
        research: true,
        accessor: (p) => p.ambulationAtDischarge,
    },
    {
        type: "categorical",
        key: "hasComplication",
        label: "入院中合併症",
        order: ["あり", "なし"],
        research: true,
        accessor: (p) => boolLabel(p.hasComplication),
    },
    {
        type: "categorical",
        key: "adjacentFracture",
        label: "新規隣接椎体骨折",
        order: ["あり", "なし"],
        research: true,
        accessor: (p) => boolLabel(p.adjacentFracture),
    },
    {
        type: "categorical",
        key: "readmission90d",
        label: "90日以内再入院",
        order: ["あり", "なし"],
        research: true,
        accessor: (p) => boolLabel(p.readmission90d),
    },
    {
        type: "categorical",
        key: "deathStatus",
        label: "死亡",
        order: ["なし", "入院中", "1年以内"],
        research: true,
        accessor: (p) => p.deathStatus,
    },
    {
        type: "categorical",
        key: "braceType",
        label: "装具",
        order: ["硬性", "軟性", "なし"],
        research: true,
        accessor: (p) => p.braceType,
    },
    {
        type: "categorical",
        key: "opMedAtDischarge",
        label: "退院時骨粗鬆症治療薬",
        research: true,
        accessor: (p) => p.opMedAtDischarge,
    },
];

export const ALL_VARIABLES: VariableDescriptor[] = [
    ...NUMERIC_VARIABLES,
    ...CATEGORICAL_VARIABLES,
];

export const findNumericVariable = (key: string): NumericVariable | undefined =>
    NUMERIC_VARIABLES.find((v) => v.key === key);

export const findCategoricalVariable = (key: string): CategoricalVariable | undefined =>
    CATEGORICAL_VARIABLES.find((v) => v.key === key);

// データ中に非 null 値が minN 件以上ある変数のみ返す。
// 研究用列にデータが入り始めると軸セレクタ等に自動で現れる仕組み。
export function availableVariables<T extends VariableDescriptor>(
    variables: T[],
    data: DerivedPatient[],
    minN = 3
): T[] {
    return variables.filter((v) => {
        let count = 0;
        for (const p of data) {
            if (v.accessor(p) !== null) {
                count++;
                if (count >= minN) return true;
            }
        }
        return false;
    });
}

// カテゴリ変数の水準を表示順で返す
export function categoryLevels(variable: CategoricalVariable, data: DerivedPatient[]): string[] {
    const seen = new Set<string>();
    for (const p of data) {
        const v = variable.accessor(p);
        if (v !== null) seen.add(v);
    }
    if (variable.order) {
        const ordered = variable.order.filter((o) => seen.has(o));
        const rest = [...seen].filter((s) => !variable.order!.includes(s)).sort();
        return [...ordered, ...rest];
    }
    return [...seen].sort();
}
