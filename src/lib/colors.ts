// チャート配色の単一ソース。Recharts は SVG の fill/stroke に Tailwind クラスを
// 使えないため hex 定数で持つ。globals.css の @theme に同じ値をミラーしている
// （surgery / conservative / accent）。変更時は両方を更新すること。

export const COLOR = {
    surgery: "#fb7185", // rose-400  手術
    conservative: "#38bdf8", // sky-400   保存的治療
    other: "#94a3b8", // slate-400 その他/不明
    accent: "#22d3ee", // cyan-400  アクセント（単系列チャート）
    male: "#60a5fa", // blue-400  男性
    female: "#f472b6", // pink-400  女性
} as const;

// 円グラフ・多カテゴリ棒グラフ用パレット
export const CATEGORICAL_PALETTE = [
    "#22d3ee", // cyan-400
    "#a78bfa", // violet-400
    "#34d399", // emerald-400
    "#fbbf24", // amber-400
    "#fb7185", // rose-400
    "#38bdf8", // sky-400
    "#f472b6", // pink-400
    "#a3e635", // lime-400
] as const;

// チャートの基調色（ダークテーマ）
export const CHART = {
    grid: "#1e293b", // slate-800
    axisLine: "#334155", // slate-700
    tick: "#94a3b8", // slate-400
    label: "#cbd5e1", // slate-300
    tooltipBg: "#0f172a", // slate-900
    tooltipBorder: "#334155", // slate-700
    referenceLine: "#e2e8f0", // slate-200（回帰直線・ゲート線）
    cursorFill: "rgba(148, 163, 184, 0.08)",
} as const;

export const treatmentColor = (group: "surgery" | "conservative" | "other"): string =>
    group === "surgery" ? COLOR.surgery : group === "conservative" ? COLOR.conservative : COLOR.other;
