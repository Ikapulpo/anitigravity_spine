export interface PatientRecord {
  timestamp: string;
  id: string;
  gender: string;
  age: number;
  injuryDate: string;
  fallHistory: string;
  preInjuryADL: string;
  // fractureLevel: string; // Removed
  neuroSymptoms: string;
  ofClassification: string;
  mriImage: string;
  medicalHistory: string;
  osteoporosisHistory: string;
  remarks: string;
  currentPain: string;
  admissionDate: string;
  newFractures: string;
  timeToAdmission: string;
  outcome: string; // 転機
  procedure: string; // 術式
  surgeryDate: string;
  dischargeDate: string;
  hospitalizationPeriod: string;
  height?: string | number;
  weight?: string | number;
  bmi?: string | number;
  dischargeDestination: string;
  followUpStatus: string;

  // --- 研究用の任意項目（シート列27〜42、google_apps_script.js 参照）---
  // 列がまだ存在しない旧シート/旧GASデプロイでも動くよう、すべてオプショナル。
  remarks2?: string; // 27: 備考2
  bmdYamPercent?: string | number; // 28: 骨密度 YAM%
  bmdTScore?: string | number; // 29: 骨密度 Tスコア
  nrsOnAdmission?: string | number; // 30: 入院時疼痛NRS (0-10)
  nrsAtDischarge?: string | number; // 31: 退院時疼痛NRS (0-10)
  barthelOnAdmission?: string | number; // 32: 入院時Barthel Index (0-100)
  barthelAtDischarge?: string | number; // 33: 退院時Barthel Index (0-100)
  ambulationAtDischarge?: string; // 34: 退院時歩行能力（独歩/杖/歩行器/車椅子/寝たきり）
  albumin?: string | number; // 35: 血清アルブミン (g/dL)
  vitD25OH?: string | number; // 36: 25(OH)ビタミンD (ng/mL)
  complications?: string; // 37: 入院中合併症（カンマ区切り）
  adjacentFracture?: string; // 38: 新規隣接椎体骨折（あり/なし）
  readmission90d?: string; // 39: 90日以内再入院（あり/なし）
  deathStatus?: string; // 40: 死亡（なし/入院中/1年以内）
  braceType?: string; // 41: 装具（硬性/軟性/なし）
  opMedAtDischarge?: string; // 42: 退院時骨粗鬆症治療薬
}
