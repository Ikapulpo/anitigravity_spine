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
}
