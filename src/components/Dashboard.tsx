"use client";

import React, { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import {
    Activity,
    Users,
    AlertCircle,
    Clock,
    Search,
    Filter,
} from "lucide-react";
import { PatientRecord } from "@/types/patient";
import { fetchPatients } from "@/services/dataService";
import { logout } from "@/app/actions/auth";

// Simple UI components (since we don't have the full shadcn/ui library installed via CLI yet, 
// I'll implement basic versions or use raw HTML/Tailwind for now to avoid dependency issues 
// if the user didn't want full shadcn setup. 
// Wait, I can just use standard Tailwind classes for layout.)

// Helper to calculate hospitalization days
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const calculateHospitalizationDays = (admission: string, dischargeOrPeriod: string | number, timestamp: string): number | null => {
    if (dischargeOrPeriod === null || dischargeOrPeriod === undefined || dischargeOrPeriod === "") return null;

    const valStr = String(dischargeOrPeriod).trim();

    // Case 1: It's a number (e.g. "14" or 14)
    // We assume any number < 1000 is a day count, not a year/date
    const numericVal = Number(valStr);
    if (!isNaN(numericVal) && numericVal < 1000) {
        return Math.floor(numericVal);
    }

    // Case 2: It looks like a date (e.g. "2025-03-03..." or "03-03")
    // If admission is empty, it's an outpatient (or invalid), so return null (display "-")
    if (!admission) return null;

    // Optimization: if strings are identical, 0 days
    if (valStr === String(admission).trim()) return 0;

    // Case 3: It looks like a date AND admission exists
    const isDate = !isNaN(Date.parse(valStr)) || valStr.includes("-") || valStr.includes("/");

    if (isDate) {
        // Extract year from timestamp (e.g. "2025/02/17 18:15:17")
        let baseYear = new Date().getFullYear();
        if (timestamp) {
            const tsDate = new Date(timestamp);
            if (!isNaN(tsDate.getFullYear())) {
                baseYear = tsDate.getFullYear();
            }
        }

        // Helper to parse "MM-DD" or "YYYY-MM-DD"
        const parseDate = (dateStr: string, year: number): Date => {
            const cleanStr = String(dateStr).trim();
            // Check for MM-DD format (e.g. "02-17" or "2/17")
            // Broaden regex to allow any non-digit separator
            const mmDdMatch = cleanStr.match(/^(\d{1,2})[^\d](\d{1,2})$/);
            if (mmDdMatch) {
                const month = parseInt(mmDdMatch[1]) - 1; // 0-indexed
                const day = parseInt(mmDdMatch[2]);
                return new Date(year, month, day);
            }
            // Otherwise try standard parsing
            const d = new Date(cleanStr);
            // If year is 2001 (default for Chrome/v8 on Mac for "MM-DD"), update it
            if (!isNaN(d.getTime()) && d.getFullYear() === 2001) {
                d.setFullYear(year);
            }
            return d;
        };

        let startDate = parseDate(admission, baseYear);
        let endDate = parseDate(valStr, baseYear);

        // Handle year boundary: if Admission > Discharge (e.g. Adm: Dec, Dis: Jan), 
        // and assuming timestamp is close to discharge/current, 
        // then Admission was likely previous year.
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
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

export default function Dashboard({ patients }: { patients: PatientRecord[] }) {
    const [filter, setFilter] = useState("");
    const [selectedYear, setSelectedYear] = useState<string>("All");

    // Extract available years from timestamp
    const years = Array.from(new Set(patients.map(p => {
        const date = new Date(p.timestamp);
        return isNaN(date.getFullYear()) ? null : String(date.getFullYear());
    }).filter((y): y is string => y !== null))).sort().reverse();

    // Filter patients by year
    const yearFilteredPatients = selectedYear === "All"
        ? patients
        : patients.filter(p => String(new Date(p.timestamp).getFullYear()) === selectedYear);

    // Aggregations based on yearFilteredPatients
    const totalPatients = yearFilteredPatients.length;
    const surgeryCandidates = yearFilteredPatients.filter((p) =>
        p.outcome.includes("Surgery") ||
        p.outcome.includes("手術") ||
        p.remarks.toLowerCase().includes("surgery")
    ).length;
    const observationPatients = yearFilteredPatients.filter((p) =>
        p.outcome.includes("Observation") ||
        p.outcome.includes("Conservative") ||
        p.outcome.includes("保存") ||
        p.outcome.includes("経過観察")
    ).length;

    // Chart Data
    const outcomeData = yearFilteredPatients.reduce((acc: any[], curr) => {
        const name = curr.outcome ? curr.outcome : "Unknown"; // Label empty as Unknown
        const existing = acc.find((item) => item.name === name);
        if (existing) {
            existing.value++;
        } else {
            acc.push({ name: name, value: 1 });
        }
        return acc;
    }, []);

    const fractureLevelData = yearFilteredPatients.reduce((acc: any[], curr) => {
        // Use newFractures instead of fractureLevel as requested
        const rawLevel = String(curr.newFractures || "Unknown");

        // Split by comma or space to handle multiple fractures (e.g., "L1, L2")
        const levels = rawLevel.split(/[,、\s]+/).filter(Boolean);

        if (levels.length === 0) levels.push("Unknown");

        levels.forEach(level => {
            const existing = acc.find((item) => item.name === level);
            if (existing) {
                existing.value++;
            } else {
                acc.push({ name: level, value: 1 });
            }
        });
        return acc;
    }, []).sort((a: any, b: any) => {
        const getLevelVal = (name: string) => {
            const n = name.toUpperCase();
            if (n.startsWith("T")) return 100 + (parseInt(n.substring(1)) || 0); // T1-T12 -> 101-112
            if (n.startsWith("L")) return 200 + (parseInt(n.substring(1)) || 0); // L1-L5 -> 201-205
            if (n === "UNKNOWN") return 999;
            return 300; // Others
        };
        return getLevelVal(a.name) - getLevelVal(b.name);
    });

    // Calculate Average Hospitalization Period (Surgery Only)
    const surgeryHospitalizationDays = yearFilteredPatients
        .filter(p => p.outcome.includes("Surgery") || p.outcome.includes("手術"))
        .map(p => calculateHospitalizationDays(p.admissionDate, p.hospitalizationPeriod || p.followUpStatus, p.timestamp))
        .filter((d): d is number => d !== null);

    const avgHospitalizationSurgery = surgeryHospitalizationDays.length > 0
        ? Math.round(surgeryHospitalizationDays.reduce((a, b) => a + b, 0) / surgeryHospitalizationDays.length)
        : 0;

    // Calculate Average Hospitalization Period (Conservative Only)
    const conservativeHospitalizationDays = yearFilteredPatients
        .filter(p => !p.outcome.includes("Surgery") && !p.outcome.includes("手術"))
        .map(p => calculateHospitalizationDays(p.admissionDate, p.hospitalizationPeriod || p.followUpStatus, p.timestamp))
        .filter((d): d is number => d !== null);

    const avgHospitalizationConservative = conservativeHospitalizationDays.length > 0
        ? Math.round(conservativeHospitalizationDays.reduce((a, b) => a + b, 0) / conservativeHospitalizationDays.length)
        : 0;

    // Calculate Average Post-op Days
    const postOpDaysList = yearFilteredPatients
        .filter(p => p.outcome.includes("Surgery") || p.outcome.includes("手術"))
        .map(p => {
            const dischargeVal = p.hospitalizationPeriod || p.followUpStatus;
            const isTotalDays = !isNaN(Number(dischargeVal)) && Number(dischargeVal) < 1000;

            if (isTotalDays) {
                const preOpDays = calculateHospitalizationDays(p.admissionDate, p.surgeryDate, p.timestamp);
                if (preOpDays !== null) {
                    return Number(dischargeVal) - preOpDays;
                }
            }
            return calculateHospitalizationDays(p.surgeryDate, dischargeVal, p.timestamp);
        })
        .filter((d): d is number => d !== null && d >= 0); // Filter out null and negative values

    const avgPostOpDays = postOpDaysList.length > 0
        ? Math.round(postOpDaysList.reduce((a, b) => a + b, 0) / postOpDaysList.length)
        : 0;

    // Calculate Avg Post-op Days by Procedure
    const procedurePostOpData = yearFilteredPatients
        .filter(p => (p.outcome.includes("Surgery") || p.outcome.includes("手術")) && p.procedure)
        .reduce((acc: any[], curr) => {
            const dischargeVal = curr.hospitalizationPeriod || curr.followUpStatus;
            let days: number | null = null;

            const isTotalDays = !isNaN(Number(dischargeVal)) && Number(dischargeVal) < 1000;
            if (isTotalDays) {
                const preOpDays = calculateHospitalizationDays(curr.admissionDate, curr.surgeryDate, curr.timestamp);
                if (preOpDays !== null) {
                    days = Number(dischargeVal) - preOpDays;
                }
            } else {
                days = calculateHospitalizationDays(curr.surgeryDate, dischargeVal, curr.timestamp);
            }

            if (days !== null && days >= 0) {
                const existing = acc.find((item) => item.name === curr.procedure);
                if (existing) {
                    existing.totalDays += days;
                    existing.count++;
                    existing.value = Math.round(existing.totalDays / existing.count);
                } else {
                    acc.push({ name: curr.procedure, totalDays: days, count: 1, value: days });
                }
            }
            return acc;
        }, [])
        .sort((a: any, b: any) => b.value - a.value);

    // Calculate Average Time-to-Surgery (Injury Date to Surgery Date)
    const timeToSurgeryList = yearFilteredPatients
        .filter(p => p.outcome.includes("Surgery") || p.outcome.includes("手術"))
        .map(p => {
            const days = calculateHospitalizationDays(p.injuryDate, p.surgeryDate, p.timestamp);
            return days;
        })
        .filter((d): d is number => d !== null && d >= 0);

    const avgTimeToSurgery = timeToSurgeryList.length > 0
        ? Math.round(timeToSurgeryList.reduce((a, b) => a + b, 0) / timeToSurgeryList.length)
        : 0;

    const filteredPatients = yearFilteredPatients.filter((p) =>
        String(p.id).toLowerCase().includes(filter.toLowerCase()) ||
        String(p.outcome).toLowerCase().includes(filter.toLowerCase()) ||
        String(p.newFractures).toLowerCase().includes(filter.toLowerCase())
    );

    // Data for new comparison chart
    const hospitalizationComparisonData = [
        { name: "Surgery", value: avgHospitalizationSurgery, fill: "#ef4444" }, // Red
        { name: "Conservative", value: avgHospitalizationConservative, fill: "#f59e0b" }, // Amber
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                        Spinal OVF Consult Dashboard
                    </h1>
                    <p className="text-sm md:text-base text-gray-500 mt-2">Overview of patient consults and surgical status</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Year:</span>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="All">All Years</option>
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => logout()}
                        className="ml-4 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Consults</p>
                        <h3 className="text-2xl font-bold text-gray-900">{totalPatients}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Surgery Candidates</p>
                        <h3 className="text-2xl font-bold text-gray-900">{surgeryCandidates}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 rounded-full bg-amber-100 text-amber-600 mr-4">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Observation / Conservative</p>
                        <h3 className="text-2xl font-bold text-gray-900">{observationPatients}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Avg. Total Stay (Surgery)</p>
                        <h3 className="text-2xl font-bold text-gray-900">{avgHospitalizationSurgery} days</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 rounded-full bg-teal-100 text-teal-600 mr-4">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Avg. Total Stay (Conservative)</p>
                        <h3 className="text-2xl font-bold text-gray-900">{avgHospitalizationConservative} days</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Avg. Post-op Days</p>
                        <h3 className="text-2xl font-bold text-gray-900">{avgPostOpDays} days</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Avg. Time-to-Surgery</p>
                        <h3 className="text-2xl font-bold text-gray-900">{avgTimeToSurgery} days</h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Treatment Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={outcomeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {outcomeData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Fracture Levels</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={fractureLevelData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Avg Post-op Days by Procedure</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={procedurePostOpData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Days" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Hospitalization: Surgery vs Conservative</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hospitalizationComparisonData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Days">
                                    {hospitalizationComparisonData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Patient Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">Patient List</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search patients..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                            <tr>
                                <th className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">ID</th>
                                <th className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">Age / Gender</th>
                                <th className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">Admission Date</th>
                                <th className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">Hospitalization</th>
                                <th className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">Procedure</th>
                                <th className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">Post-op Days</th>
                                <th className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">MRI</th>
                                <th className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">Outcome</th>
                                <th className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">OF Classification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPatients.map((patient) => (
                                <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 py-3 md:px-6 md:py-4 font-medium text-gray-900 whitespace-nowrap">{patient.id}</td>
                                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">{patient.age} / {patient.gender}</td>
                                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">{patient.admissionDate}</td>
                                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">
                                        {patient.hospitalizationPeriod ? (
                                            /\d/.test(String(patient.hospitalizationPeriod)) ?
                                                // If it has a number, chances are it's days. If just a number "14", add " days".
                                                // If string "14 days", just show it.
                                                (String(patient.hospitalizationPeriod).includes("day") || String(patient.hospitalizationPeriod).includes("日")
                                                    ? patient.hospitalizationPeriod
                                                    : `${patient.hospitalizationPeriod} days`)
                                                : patient.hospitalizationPeriod
                                        ) : "-"}
                                    </td>
                                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">
                                        {patient.procedure || "-"}
                                    </td>
                                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">
                                        {(() => {
                                            // Only show for surgery patients
                                            if (!patient.outcome.includes("Surgery") && !patient.outcome.includes("手術")) return "-";

                                            // Use followUpStatus as fallback for discharge date (same as hospitalization logic)
                                            const dischargeVal = patient.hospitalizationPeriod || patient.followUpStatus;

                                            // Check if dischargeVal is a number (total days)
                                            const isTotalDays = !isNaN(Number(dischargeVal)) && Number(dischargeVal) < 1000;

                                            if (isTotalDays) {
                                                // Calculate pre-op days (Surgery - Admission)
                                                // Note: calculateHospitalizationDays handles date parsing for both
                                                const preOpDays = calculateHospitalizationDays(patient.admissionDate, patient.surgeryDate, patient.timestamp);

                                                if (preOpDays !== null) {
                                                    const postOp = Number(dischargeVal) - preOpDays;
                                                    return `${postOp} days`;
                                                }
                                            }

                                            // If dischargeVal is a date, or fallback if pre-op calc failed
                                            // Calculate days from Surgery Date to Discharge Date
                                            const days = calculateHospitalizationDays(patient.surgeryDate, dischargeVal, patient.timestamp);

                                            if (days !== null) return `${days} days`;
                                            return "-";
                                        })()}
                                    </td>
                                    <td className="px-3 py-3 md:px-6 md:py-4 min-w-[120px]">
                                        {patient.mriImage ? (
                                            <div className="flex flex-col gap-1">
                                                {patient.mriImage.split(/[,、\s]+/).filter(url => url.trim().startsWith('http')).map((url, index) => (
                                                    <a
                                                        key={index}
                                                        href={url.trim()}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                    >
                                                        <Search size={16} />
                                                        <span className="text-xs">View {index + 1}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${patient.outcome.includes("Surgery") || patient.outcome.includes("手術")
                                            ? "bg-red-100 text-red-800"
                                            : "bg-green-100 text-green-800"
                                            }`}>
                                            {patient.outcome}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 md:px-6 md:py-4 text-gray-500 whitespace-nowrap">
                                        {patient.ofClassification || "-"}
                                    </td>
                                </tr>
                            ))}
                            {filteredPatients.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-6 py-8 text-center text-gray-400">
                                        No patients found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
