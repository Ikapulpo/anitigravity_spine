import { PatientRecord } from "@/types/patient";

const MOCK_PATIENTS: PatientRecord[] = [
    {
        timestamp: "2023/10/01 10:00:00",
        id: "P001",
        gender: "Female",
        age: 82,
        injuryDate: "2023/09/25",
        fallHistory: "Yes",
        preInjuryADL: "Independent",
        fractureLevel: "L1",
        neuroSymptoms: "None",
        ofClassification: "Type 3",
        mriImage: "High intensity at L1",
        medicalHistory: "Hypertension",
        osteoporosisHistory: "Alendronate",
        remarks: "Severe pain on motion",
        currentPain: "Severe",
        admissionDate: "2023/10/01",
        newFractures: "L1",
        timeToAdmission: "6 days",
        outcome: "Surgery",
        surgeryDate: "2023/10/02",
        dischargeDate: "",
        hospitalizationPeriod: "",
        dischargeDestination: "",
        followUpStatus: "Pending",
    },
    {
        timestamp: "2023/10/05 14:30:00",
        id: "P002",
        gender: "Male",
        age: 75,
        injuryDate: "2023/10/03",
        fallHistory: "No",
        preInjuryADL: "Assisted",
        fractureLevel: "T12",
        neuroSymptoms: "Radiculopathy",
        ofClassification: "Type 4",
        mriImage: "T12 collapse",
        medicalHistory: "Diabetes",
        osteoporosisHistory: "None",
        remarks: "Considering surgery due to neuro deficit",
        currentPain: "Moderate",
        admissionDate: "2023/10/05",
        newFractures: "T12",
        timeToAdmission: "2 days",
        outcome: "Surgery",
        surgeryDate: "2023/10/06",
        dischargeDate: "",
        hospitalizationPeriod: "",
        dischargeDestination: "",
        followUpStatus: "Scheduled for OP",
    },
    {
        timestamp: "2023/10/10 09:15:00",
        id: "P003",
        gender: "Female",
        age: 88,
        injuryDate: "2023/10/08",
        fallHistory: "Yes",
        preInjuryADL: "Wheelchair",
        fractureLevel: "L3",
        neuroSymptoms: "None",
        ofClassification: "Type 2",
        mriImage: "L3 edema",
        medicalHistory: "Dementia",
        osteoporosisHistory: "Denosumab",
        remarks: "Conservative treatment",
        currentPain: "Mild",
        admissionDate: "2023/10/10",
        newFractures: "L3",
        timeToAdmission: "2 days",
        outcome: "Conservative",
        surgeryDate: "",
        dischargeDate: "2023/10/24",
        hospitalizationPeriod: "14 days",
        dischargeDestination: "Nursing Home",
        followUpStatus: "Discharged",
    },
    {
        timestamp: "2023/10/12 11:00:00",
        id: "P004",
        gender: "Female",
        age: 79,
        injuryDate: "2023/10/10",
        fallHistory: "Yes",
        preInjuryADL: "Independent",
        fractureLevel: "T11",
        neuroSymptoms: "None",
        ofClassification: "Type 3",
        mriImage: "T11 fresh fracture",
        medicalHistory: "None",
        osteoporosisHistory: "None",
        remarks: "Observation",
        currentPain: "Severe",
        admissionDate: "2023/10/12",
        newFractures: "T11",
        timeToAdmission: "2 days",
        outcome: "Observation",
        surgeryDate: "",
        dischargeDate: "",
        hospitalizationPeriod: "",
        dischargeDestination: "",
        followUpStatus: "In Hospital",
    },
];

export const fetchPatients = async (): Promise<PatientRecord[]> => {
    const apiUrl = process.env.NEXT_PUBLIC_GAS_API_URL;

    if (!apiUrl) {
        console.warn("NEXT_PUBLIC_GAS_API_URL is not set. Using mock data.");
        // Return mock data if API URL is not set (for development)
        await new Promise((resolve) => setTimeout(resolve, 500));
        return MOCK_PATIENTS;
    }

    try {
        const response = await fetch(apiUrl, { next: { revalidate: 0 } }); // Disable cache for debugging
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching patient data:", error);
        return MOCK_PATIENTS; // Fallback to mock data on error
    }
};
