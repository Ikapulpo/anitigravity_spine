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

const calculateHospitalizationDays = (admission: string, dischargeOrPeriod: string | number): number | null => {
    if (!dischargeOrPeriod) return null;

    const valStr = String(dischargeOrPeriod);

    // Case 1: It's a number (e.g. "14" or 14)
    // We assume any number < 1000 is a day count, not a year/date
    const numericVal = Number(valStr);
    if (!isNaN(numericVal) && numericVal < 1000) {
        return Math.floor(numericVal);
    }

    // Case 2: It looks like a date (e.g. "2025-03-03...")
    // This happens if the spreadsheet formula =V-P returned a date (e.g. because P was empty/zero)
    // In this case, we try to calculate the diff ourselves if we have a valid admission date.
    const isDate = !isNaN(Date.parse(valStr)) && (valStr.includes("-") || valStr.includes("/"));

    if (isDate && admission) {
        const startDate = new Date(admission);
        const endDate = new Date(valStr);

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const diffTime = endDate.getTime() - startDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Sanity check: 0 to 365 days
            if (diffDays >= 0 && diffDays <= 365) {
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
        const existing = acc.find((item) => item.name === curr.outcome);
        if (existing) {
            existing.value++;
        } else {
            acc.push({ name: curr.outcome, value: 1 });
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
    }, []).sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Calculate Average Hospitalization Period
    const hospitalizationDays = yearFilteredPatients
        .map(p => calculateHospitalizationDays(p.admissionDate, p.hospitalizationPeriod))
        .filter((d): d is number => d !== null);

    const avgHospitalization = hospitalizationDays.length > 0
        ? Math.round(hospitalizationDays.reduce((a, b) => a + b, 0) / hospitalizationDays.length)
        : 0;

    const filteredPatients = yearFilteredPatients.filter((p) =>
        String(p.id).toLowerCase().includes(filter.toLowerCase()) ||
        String(p.outcome).toLowerCase().includes(filter.toLowerCase()) ||
        String(p.fractureLevel).toLowerCase().includes(filter.toLowerCase()) ||
        String(p.newFractures).toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Spinal OVF Consult Dashboard
                    </h1>
                    <p className="text-gray-500 mt-2">Overview of patient consults and surgical status</p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                        <p className="text-sm text-gray-500 font-medium">Avg. Hospitalization</p>
                        <h3 className="text-2xl font-bold text-gray-900">{avgHospitalization} days</h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Outcome Distribution</h3>
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
            </div>

            {/* Patient Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">Patient List</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search ID, Outcome..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full sm:w-64"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Age / Gender</th>
                                <th className="px-6 py-4">Fracture Level</th>
                                <th className="px-6 py-4">Admission Date</th>
                                <th className="px-6 py-4">Hospitalization</th>
                                <th className="px-6 py-4">MRI</th>
                                <th className="px-6 py-4">Outcome</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPatients.map((patient) => (
                                <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{patient.id}</td>
                                    <td className="px-6 py-4">{patient.age} / {patient.gender}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {patient.newFractures || "-"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{patient.admissionDate}</td>
                                    <td className="px-6 py-4">
                                        {calculateHospitalizationDays(patient.admissionDate, patient.hospitalizationPeriod)
                                            ? `${calculateHospitalizationDays(patient.admissionDate, patient.hospitalizationPeriod)} days`
                                            : "-"
                                        }
                                    </td>
                                    <td className="px-6 py-4">
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
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${patient.outcome.includes("Surgery")
                                            ? "bg-red-100 text-red-800"
                                            : "bg-green-100 text-green-800"
                                            }`}>
                                            {patient.outcome}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{patient.followUpStatus}</td>
                                </tr>
                            ))}
                            {filteredPatients.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
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
