export interface PatientRecord {
  timestamp: string;
  id: string;
  gender: string;
  age: number;
  injuryDate: string;
  fallHistory: string;
  preInjuryADL: string;
  fractureLevel: string;
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
  surgeryDate: string;
  dischargeDate: string;
  hospitalizationPeriod: string;
  dischargeDestination: string;
  followUpStatus: string;
}
