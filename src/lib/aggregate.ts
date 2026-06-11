// チャート用の軽量集計ヘルパー

export interface NamedCount {
    name: string;
    value: number;
    // Recharts の ChartDataInput が要求するインデックスシグネチャ
    [key: string]: string | number;
}

// accessor が null を返したレコードは集計から除外する
export function countBy<T>(
    items: readonly T[],
    accessor: (item: T) => string | null
): NamedCount[] {
    const map = new Map<string, number>();
    for (const item of items) {
        const key = accessor(item);
        if (key === null) continue;
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
}

export const nonNull = <T>(values: readonly (T | null)[]): T[] =>
    values.filter((v): v is T => v !== null);

// 日数の表示（整数はそのまま、小数は1桁）
export const formatDays = (v: number | null | undefined): string => {
    if (v === null || v === undefined || !isFinite(v)) return "—";
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
};
