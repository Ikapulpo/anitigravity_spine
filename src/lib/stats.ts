// 統計エンジン（外部依存なしの純 TypeScript 実装）。
// p 値は正則化不完全ベータ/ガンマ関数（Numerical Recipes の定式化）で計算する。
// 入力が縮退している場合（n 不足・分散 0 など）は null を返し、UI 側で
// 「—」「データ不足」と表示する。ここの検定はあくまで探索的解析用であり、
// 多重比較の補正は行わない（RESEARCH.md 参照）。

// ---------------------------------------------------------------------------
// 記述統計
// ---------------------------------------------------------------------------

export function mean(xs: readonly number[]): number {
    if (xs.length === 0) return NaN;
    let s = 0;
    for (const x of xs) s += x;
    return s / xs.length;
}

// 標本標準偏差（n−1）。n<2 は NaN
export function sd(xs: readonly number[]): number {
    const n = xs.length;
    if (n < 2) return NaN;
    const m = mean(xs);
    let ss = 0;
    for (const x of xs) ss += (x - m) * (x - m);
    return Math.sqrt(ss / (n - 1));
}

// 分位点（R type-7: 線形補間）。0 <= q <= 1
export function quantile(xs: readonly number[], q: number): number {
    const n = xs.length;
    if (n === 0) return NaN;
    const sorted = [...xs].sort((a, b) => a - b);
    const h = (n - 1) * q;
    const lo = Math.floor(h);
    const hi = Math.ceil(h);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

export function median(xs: readonly number[]): number {
    return quantile(xs, 0.5);
}

// [Q1, Q3]
export function iqr(xs: readonly number[]): [number, number] {
    return [quantile(xs, 0.25), quantile(xs, 0.75)];
}

// ---------------------------------------------------------------------------
// 特殊関数（p 値計算の基盤）
// ---------------------------------------------------------------------------

// Lanczos 近似 (g=7, 9係数)
export function logGamma(x: number): number {
    const g = 7;
    const c = [
        0.99999999999980993, 676.5203681218851, -1259.1392167224028,
        771.32342877765313, -176.61502916214059, 12.507343278686905,
        -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (x < 0.5) {
        // 反射公式
        return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    }
    const z = x - 1;
    let a = c[0];
    const t = z + g + 0.5;
    for (let i = 1; i < g + 2; i++) a += c[i] / (z + i);
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

// 不完全ベータの連分数（modified Lentz 法）
function betacf(x: number, a: number, b: number): number {
    const MAXIT = 300;
    const EPS = 3e-14;
    const FPMIN = 1e-300;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
        const m2 = 2 * m;
        let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        h *= d * c;
        aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < EPS) break;
    }
    return h;
}

// 正則化不完全ベータ関数 I_x(a, b)
export function incompleteBeta(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const lnFront = logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x);
    const front = Math.exp(lnFront);
    // 収束の速い側で評価し、対称性で補完
    if (x < (a + 1) / (a + b + 2)) {
        return (front * betacf(x, a, b)) / a;
    }
    return 1 - (front * betacf(1 - x, b, a)) / b;
}

// 正則化下側不完全ガンマ関数 P(s, x)
export function lowerGammaP(s: number, x: number): number {
    if (s <= 0 || x < 0 || !isFinite(x)) return NaN;
    if (x === 0) return 0;
    if (x < s + 1) {
        // 級数展開
        let term = 1 / s;
        let sum = term;
        let n = s;
        for (let i = 0; i < 1000; i++) {
            n += 1;
            term *= x / n;
            sum += term;
            if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
        }
        return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
    }
    // 上側 Q(s,x) の連分数（modified Lentz 法）→ P = 1 − Q
    const FPMIN = 1e-300;
    let b = x + 1 - s;
    let c = 1 / FPMIN;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i <= 1000; i++) {
        const an = -i * (i - s);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = b + an / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        const del = d * c;
        h *= del;
        if (Math.abs(del - 1) < 1e-15) break;
    }
    const q = Math.exp(-x + s * Math.log(x) - logGamma(s)) * h;
    return 1 - q;
}

// 標準正規分布 CDF（Abramowitz & Stegun 26.2.17、|誤差| < 7.5e-8）
export function normalCdf(z: number): number {
    if (!isFinite(z)) return z > 0 ? 1 : 0;
    const az = Math.abs(z);
    const t = 1 / (1 + 0.2316419 * az);
    const poly =
        t *
        (0.31938153 +
            t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    const tail = (Math.exp(-0.5 * az * az) / Math.sqrt(2 * Math.PI)) * poly;
    return z >= 0 ? 1 - tail : tail;
}

// t 分布 CDF
export function tCdf(t: number, df: number): number {
    if (df <= 0) return NaN;
    if (!isFinite(t)) return t > 0 ? 1 : 0;
    const x = df / (df + t * t);
    const p = 0.5 * incompleteBeta(x, df / 2, 0.5);
    return t >= 0 ? 1 - p : p;
}

// カイ二乗分布 CDF
export function chiSquareCdf(x: number, df: number): number {
    return lowerGammaP(df / 2, x / 2);
}

const twoSidedTP = (t: number, df: number): number => {
    const p = 2 * (1 - tCdf(Math.abs(t), df));
    return Math.min(Math.max(p, 0), 1);
};

// ---------------------------------------------------------------------------
// 相関・回帰
// ---------------------------------------------------------------------------

export type Pair = readonly [number, number];

export interface PearsonResult {
    n: number;
    r: number;
    p: number;
    ci: [number, number] | null; // Fisher z 変換による 95%CI（n<4 は null）
}

export function pearson(pairs: ReadonlyArray<Pair>): PearsonResult | null {
    const n = pairs.length;
    if (n < 3) return null;
    let sx = 0, sy = 0;
    for (const [x, y] of pairs) {
        sx += x;
        sy += y;
    }
    const mx = sx / n;
    const my = sy / n;
    let cov = 0, vx = 0, vy = 0;
    for (const [x, y] of pairs) {
        cov += (x - mx) * (y - my);
        vx += (x - mx) * (x - mx);
        vy += (y - my) * (y - my);
    }
    if (vx === 0 || vy === 0) return null;
    let r = cov / Math.sqrt(vx * vy);
    r = Math.min(Math.max(r, -1), 1);

    const p = Math.abs(r) === 1 ? 0 : twoSidedTP(r * Math.sqrt((n - 2) / (1 - r * r)), n - 2);

    let ci: [number, number] | null = null;
    if (n >= 4 && Math.abs(r) < 1) {
        const z = Math.atanh(r);
        const se = 1 / Math.sqrt(n - 3);
        ci = [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)];
    }
    return { n, r, p, ci };
}

// 中央ランク（タイは平均順位）
export function rankWithTies(xs: readonly number[]): number[] {
    const indexed = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(xs.length);
    let i = 0;
    while (i < indexed.length) {
        let j = i;
        while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
        const avgRank = (i + j) / 2 + 1;
        for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
        i = j + 1;
    }
    return ranks;
}

export interface SpearmanResult {
    n: number;
    rho: number;
    p: number; // t 近似（n<10 では参考値として扱う）
}

export function spearman(pairs: ReadonlyArray<Pair>): SpearmanResult | null {
    const n = pairs.length;
    if (n < 3) return null;
    const rx = rankWithTies(pairs.map((p) => p[0]));
    const ry = rankWithTies(pairs.map((p) => p[1]));
    const res = pearson(rx.map((x, i) => [x, ry[i]] as const));
    if (!res) return null;
    return { n, rho: res.r, p: res.p };
}

export interface RegressionResult {
    n: number;
    slope: number;
    intercept: number;
    r2: number;
}

// 最小二乗法による単回帰
export function linearRegression(pairs: ReadonlyArray<Pair>): RegressionResult | null {
    const n = pairs.length;
    if (n < 2) return null;
    let sx = 0, sy = 0;
    for (const [x, y] of pairs) {
        sx += x;
        sy += y;
    }
    const mx = sx / n;
    const my = sy / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (const [x, y] of pairs) {
        sxy += (x - mx) * (y - my);
        sxx += (x - mx) * (x - mx);
        syy += (y - my) * (y - my);
    }
    if (sxx === 0) return null;
    const slope = sxy / sxx;
    const intercept = my - slope * mx;
    const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
    return { n, slope, intercept, r2 };
}

// ---------------------------------------------------------------------------
// 群間比較
// ---------------------------------------------------------------------------

export interface WelchResult {
    n1: number;
    n2: number;
    mean1: number;
    mean2: number;
    sd1: number;
    sd2: number;
    t: number;
    df: number; // Welch–Satterthwaite
    p: number;
}

export function welchTTest(a: readonly number[], b: readonly number[]): WelchResult | null {
    const n1 = a.length;
    const n2 = b.length;
    if (n1 < 2 || n2 < 2) return null;
    const m1 = mean(a);
    const m2 = mean(b);
    const s1 = sd(a);
    const s2 = sd(b);
    const se1 = (s1 * s1) / n1;
    const se2 = (s2 * s2) / n2;
    const se = se1 + se2;
    if (se === 0) return null; // 両群とも分散 0
    const t = (m1 - m2) / Math.sqrt(se);
    const df = (se * se) / ((se1 * se1) / (n1 - 1) + (se2 * se2) / (n2 - 1));
    return { n1, n2, mean1: m1, mean2: m2, sd1: s1, sd2: s2, t, df, p: twoSidedTP(t, df) };
}

export interface MannWhitneyResult {
    n1: number;
    n2: number;
    u: number;
    z: number;
    p: number; // タイ補正+連続性補正の正規近似（n<8 では参考値として扱う）
    median1: number;
    median2: number;
}

export function mannWhitneyU(a: readonly number[], b: readonly number[]): MannWhitneyResult | null {
    const n1 = a.length;
    const n2 = b.length;
    if (n1 === 0 || n2 === 0) return null;
    const nTotal = n1 + n2;
    const ranks = rankWithTies([...a, ...b]);
    let r1 = 0;
    for (let i = 0; i < n1; i++) r1 += ranks[i];
    const u1 = r1 - (n1 * (n1 + 1)) / 2;
    const u2 = n1 * n2 - u1;
    const u = Math.min(u1, u2);

    // タイ補正付き分散: σ²U = n1·n2/12 · [(N+1) − Σ(t³−t)/(N(N−1))]
    const tieCounts = new Map<number, number>();
    const combined = [...a, ...b];
    for (const v of combined) tieCounts.set(v, (tieCounts.get(v) ?? 0) + 1);
    let tieSum = 0;
    for (const t of tieCounts.values()) tieSum += t * t * t - t;
    const sigma2 =
        ((n1 * n2) / 12) * (nTotal + 1 - tieSum / (nTotal * (nTotal - 1)));
    if (sigma2 <= 0) return null; // 全値タイ

    const mu = (n1 * n2) / 2;
    // 連続性補正（|U−μ| を 0.5 だけ 0 方向へ縮める）
    const z = Math.max(0, Math.abs(u - mu) - 0.5) / Math.sqrt(sigma2);
    const p = Math.min(1, 2 * (1 - normalCdf(z)));
    return { n1, n2, u, z, p, median1: median(a), median2: median(b) };
}

export interface ChiSquareResult {
    chi2: number;
    df: number;
    p: number;
    n: number;
    minExpected: number;
    warning?: string; // 期待度数 < 5 のセルがある場合
}

// r×c 分割表の Pearson カイ二乗検定
export function chiSquareTest(table: ReadonlyArray<ReadonlyArray<number>>): ChiSquareResult | null {
    const rows = table.length;
    if (rows < 2) return null;
    const cols = table[0]?.length ?? 0;
    if (cols < 2) return null;

    const rowSums = table.map((r) => r.reduce((s, v) => s + v, 0));
    const colSums = Array.from({ length: cols }, (_, j) => table.reduce((s, r) => s + r[j], 0));
    const n = rowSums.reduce((s, v) => s + v, 0);
    if (n === 0 || rowSums.some((v) => v === 0) || colSums.some((v) => v === 0)) return null;

    let chi2 = 0;
    let minExpected = Infinity;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const expected = (rowSums[i] * colSums[j]) / n;
            minExpected = Math.min(minExpected, expected);
            const d = table[i][j] - expected;
            chi2 += (d * d) / expected;
        }
    }
    const df = (rows - 1) * (cols - 1);
    const p = Math.min(Math.max(1 - chiSquareCdf(chi2, df), 0), 1);
    return {
        chi2,
        df,
        p,
        n,
        minExpected,
        warning: minExpected < 5 ? "期待度数5未満のセルあり（Fisher正確検定を推奨）" : undefined,
    };
}

// ---------------------------------------------------------------------------
// 表示ヘルパー
// ---------------------------------------------------------------------------

// p 値の表示形式（p<0.001 / p=0.023 など）
export function formatP(p: number | null | undefined): string {
    if (p === null || p === undefined || !isFinite(p)) return "—";
    if (p < 0.001) return "p<0.001";
    return `p=${p.toFixed(3)}`;
}

export function formatNumber(v: number | null | undefined, digits = 1): string {
    if (v === null || v === undefined || !isFinite(v)) return "—";
    return v.toFixed(digits);
}
