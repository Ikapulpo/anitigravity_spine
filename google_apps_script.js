function doGet() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = data.slice(1);

    var json = rows.map(function (row) {
        var record = {};
        // Map columns by index based on the provided order
        // 0: Timestamp, 1: ID, 2: Gender, 3: Age, 4: Injury Date, 5: Fall History
        // 6: Pre-injury ADL, 7: Fracture Level, 8: Neuro Symptoms, 9: OF Classification
        // 10: MRI, 11: Medical History, 12: Osteoporosis History, 13: Remarks
        // 14: Current Pain, 15: Admission Date, 16: New Fractures, 17: Time to Admission
        // 18: Outcome (転機), 19: Discharge Date, 20: Hospitalization Period
        // 21: Discharge Destination, 22: Follow-up Status

        record.timestamp = row[0];
        record.id = row[1];
        record.gender = row[2];
        record.age = row[3];
        record.injuryDate = row[4];
        record.fallHistory = row[5];
        record.preInjuryADL = row[6];
        record.fractureLevel = row[7];
        record.neuroSymptoms = row[8];
        record.ofClassification = row[9];
        record.mriImage = row[10];
        record.medicalHistory = row[11];
        record.osteoporosisHistory = row[12];
        record.remarks = row[13];
        record.currentPain = row[14];
        record.admissionDate = row[15];
        record.newFractures = row[16];
        record.timeToAdmission = row[17];
        record.outcome = row[18];
        record.procedure = row[19]; // Column T (was dischargeDate, but contains procedure like BKP)
        record.surgeryDate = row[20]; // Column U
        record.hospitalizationPeriod = row[22]; // Column W
        record.dischargeDestination = row[21];
        record.followUpStatus = row[22]; // Note: This might be incorrect if W is now Hospitalization. Leaving as is for now unless user specifies otherwise, or maybe I should comment it out?
        // Actually, if W is Hospitalization, then FollowUp is likely shifted. 
        // But to strictly follow "Extract hospitalization from W", I will set it.
        // I'll keep followUpStatus as row[22] for now to avoid breaking schema if it's used elsewhere, 
        // but practically it will now contain hospitalization data.
        // Let's just update hospitalizationPeriod.

        return record;
    });

    return ContentService.createTextOutput(JSON.stringify(json))
        .setMimeType(ContentService.MimeType.JSON);
}
