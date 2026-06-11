// 柔軟な日付形式（MM/DD・YYYY/MM/DD）と年跨ぎ問題を扱うヘルパー群。
// Dashboard.tsx から挙動を変えずに移設したもの。MM-DD 入力時の Chrome の
// 2001年デフォルト、12月入院→1月退院の年跨ぎ、シート計算が負値を返すケース
// など実データの癖に対応しているため、ロジックを「修正」しないこと。

// Helper to parse "MM-DD" or "YYYY-MM-DD" flexibly
export const parseFlexibleDate = (dateStr: string, fallbackYear: number): Date | null => {
    const cleanStr = String(dateStr).trim();
    if (!cleanStr) return null;

    // Check for MM-DD format (e.g. "02-17" or "2/17")
    const mmDdMatch = cleanStr.match(/^(\d{1,2})[^\d](\d{1,2})$/);
    if (mmDdMatch) {
        const month = parseInt(mmDdMatch[1]) - 1; // 0-indexed
        const day = parseInt(mmDdMatch[2]);
        return new Date(fallbackYear, month, day);
    }

    // Otherwise try standard parsing
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
        // If year is 2001 (default for Chrome/v8 on Mac for "MM-DD"), update it
        if (d.getFullYear() === 2001) {
            d.setFullYear(fallbackYear);
        }
        return d;
    }

    return null;
};

// Extract base year from timestamp
export const extractBaseYear = (timestamp: string): number => {
    let baseYear = new Date().getFullYear();
    if (timestamp) {
        const tsDate = new Date(timestamp);
        if (!isNaN(tsDate.getFullYear())) {
            baseYear = tsDate.getFullYear();
        }
    }
    return baseYear;
};

// Calculate hospitalization days from admission and discharge dates directly
export const calculateFromDates = (admissionStr: string, dischargeStr: string, timestamp: string): number | null => {
    if (!admissionStr || !dischargeStr) return null;

    const baseYear = extractBaseYear(timestamp);
    const startDate = parseFlexibleDate(admissionStr, baseYear);
    const endDate = parseFlexibleDate(dischargeStr, baseYear);

    if (!startDate || !endDate) return null;

    // Year boundary handling: if admission > discharge, assume year boundary crossing
    // (e.g., admission in December, discharge in January)
    if (startDate > endDate) {
        startDate.setFullYear(baseYear - 1);
    }

    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 ? diffDays : null;
};

export const calculateHospitalizationDays = (
    admission: string,
    dischargeOrPeriod: string | number,
    timestamp: string,
    dischargeDate?: string  // Optional: explicit discharge date for fallback calculation
): number | null => {
    if (dischargeOrPeriod === null || dischargeOrPeriod === undefined || dischargeOrPeriod === "") return null;

    const valStr = String(dischargeOrPeriod).trim();

    // Case 1: It's a number (e.g. "14" or 14 or -350)
    // We assume any number with absolute value < 1000 is a day count, not a year/date
    const numericVal = Number(valStr);
    if (!isNaN(numericVal) && Math.abs(numericVal) < 1000) {
        // If positive, return as-is
        if (numericVal >= 0) {
            return Math.floor(numericVal);
        }

        // If negative, attempt to recalculate from admission and discharge dates
        // This handles the case where Google Sheets calculation returned a negative value
        // due to year boundary issues (e.g., admission 12/25, discharge 1/10)
        if (admission && dischargeDate) {
            const recalculated = calculateFromDates(admission, dischargeDate, timestamp);
            if (recalculated !== null) {
                return recalculated;
            }
        }

        // If we can't recalculate, return null rather than the negative value
        return null;
    }

    // Case 2: It looks like a date (e.g. "2025-03-03..." or "03-03")
    // If admission is empty, it's an outpatient (or invalid), so return null (display "-")
    if (!admission) return null;

    // Optimization: if strings are identical, 0 days
    if (valStr === String(admission).trim()) return 0;

    // Case 3: It looks like a date AND admission exists
    const isDate = !isNaN(Date.parse(valStr)) || valStr.includes("-") || valStr.includes("/");

    if (isDate) {
        const baseYear = extractBaseYear(timestamp);

        const startDate = parseFlexibleDate(admission, baseYear);
        const endDate = parseFlexibleDate(valStr, baseYear);

        // Handle year boundary: if Admission > Discharge (e.g. Adm: Dec, Dis: Jan),
        // and assuming timestamp is close to discharge/current,
        // then Admission was likely previous year.
        if (startDate && endDate) {
            if (startDate > endDate) {
                startDate.setFullYear(baseYear - 1);
            }

            const diffTime = endDate.getTime() - startDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0) {
                return diffDays;
            }
        }
    }

    // Fallback: try parsing integer from string if it contains "days"
    const parsed = parseInt(valStr.replace(/[^0-9]/g, ''));
    return (!isNaN(parsed) && parsed < 1000) ? parsed : null;
};

// 表示用: "MM/DD" や "MM-DD" を timestamp の年を補って "YYYY/MM/DD" に整形する。
// 旧テーブルの手術日セル内ロジックを関数化したもの。
export const formatDateJa = (dateStr: string, timestamp: string): string => {
    if (!dateStr) return "-";

    const valStr = String(dateStr).trim();
    const match = valStr.match(/^(\d{1,2})[\/\-](\d{1,2})$/);

    const year = extractBaseYear(timestamp);

    if (match) {
        const month = match[1].padStart(2, "0");
        const day = match[2].padStart(2, "0");
        return `${year}/${month}/${day}`;
    }

    const date = new Date(valStr);
    if (!isNaN(date.getTime())) {
        if (date.getFullYear() === 2001) {
            date.setFullYear(year);
        }
        return date.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
    }

    return valStr;
};
