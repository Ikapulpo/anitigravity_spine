function doGet() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = data.slice(1);

    var json = rows.map(function (row) {
        var record = {};
        // Map columns by index based on the new order provided
        // 0: Timestamp, 1: ID, 2: Gender, 3: Age, 4: Injury Date, 5: Fall
        // 6: ADL, 7: Neuro, 8: OF Class, 9: MRI, 10: Medical History, 11: Osteoporosis History
        // 12: Others/Remarks, 13: Pain, 14: Admission, 15: New Fractures, 16: Time to Admission
        // 17: Outcome, 18: Procedure, 19: Surgery Date, 20: Discharge Date, 21: Hospitalization Period
        // 22: Height, 23: Weight, 24: BMI, 25: Discharge Destination, 26: Follow-up Status, 27: Remarks 2

        record.timestamp = row[0];
        record.id = row[1];
        record.gender = row[2];
        record.age = row[3];
        record.injuryDate = row[4];
        record.fallHistory = row[5];
        record.preInjuryADL = row[6];
        // record.fractureLevel = row[7]; // REMOVED
        record.neuroSymptoms = row[7]; // Shifted
        record.ofClassification = row[8];
        record.mriImage = row[9];
        record.medicalHistory = row[10];
        record.osteoporosisHistory = row[11];
        record.remarks = row[12]; // "Others"
        record.currentPain = row[13];
        record.admissionDate = row[14];
        record.newFractures = row[15];
        record.timeToAdmission = row[16];
        record.outcome = row[17];
        record.procedure = row[18];
        record.surgeryDate = row[19];
        record.dischargeDate = row[20];
        record.hospitalizationPeriod = row[21]; // Explicit column
        record.height = row[22];
        record.weight = row[23];
        record.bmi = row[24];
        record.dischargeDestination = row[25];
        record.followUpStatus = row[26];
        // record.dischargeDestination = row[21]; // Replaced above
        // record.followUpStatus = row[22]; // Replaced above

        return record;
    });

    return ContentService.createTextOutput(JSON.stringify(json))
        .setMimeType(ContentService.MimeType.JSON);
}
