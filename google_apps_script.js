// Helper to parse flexible date formats (MM/DD or YYYY/MM/DD)
function parseFlexibleDate(dateValue, baseYear) {
    if (!dateValue) return null;

    // If already a Date object
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        return dateValue;
    }

    var str = String(dateValue).trim();
    if (!str) return null;

    // Check for MM/DD or MM-DD format
    var mmDdMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (mmDdMatch) {
        var month = parseInt(mmDdMatch[1]) - 1; // 0-indexed
        var day = parseInt(mmDdMatch[2]);
        return new Date(baseYear, month, day);
    }

    // Try standard parsing
    var d = new Date(str);
    if (!isNaN(d.getTime())) {
        // If year is 2001 (default for some date parsing), use baseYear instead
        if (d.getFullYear() === 2001) {
            d.setFullYear(baseYear);
        }
        return d;
    }

    return null;
}

// Calculate hospitalization days from dates, handling year boundary
function calculateDaysFromDates(admissionDate, dischargeDate, timestamp) {
    if (!admissionDate || !dischargeDate) return null;

    var baseYear = new Date().getFullYear();
    if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
        baseYear = timestamp.getFullYear();
    } else if (timestamp) {
        var ts = new Date(timestamp);
        if (!isNaN(ts.getFullYear())) {
            baseYear = ts.getFullYear();
        }
    }

    var startDate = parseFlexibleDate(admissionDate, baseYear);
    var endDate = parseFlexibleDate(dischargeDate, baseYear);

    if (!startDate || !endDate) return null;

    // Handle year boundary: if admission > discharge (e.g., Dec -> Jan)
    if (startDate > endDate) {
        startDate.setFullYear(baseYear - 1);
    }

    var diffTime = endDate.getTime() - startDate.getTime();
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 ? diffDays : null;
}

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

        // Handle negative hospitalization period (year boundary issue)
        // If hospitalizationPeriod is a negative number, recalculate from dates
        if (typeof record.hospitalizationPeriod === 'number' && record.hospitalizationPeriod < 0) {
            var recalculated = calculateDaysFromDates(record.admissionDate, record.dischargeDate, record.timestamp);
            if (recalculated !== null) {
                record.hospitalizationPeriod = recalculated;
            }
        }

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
