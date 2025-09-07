interface GeoIp2Location {
    range: [number | null, number | null];
    country: string;
    region: string;
    eu: '0' | '1';
    timezone: string;
    city: string;
    ll: [number | null, number | null];
    metro: number;
    area: number;
}

export function lookup(ip: string | number): GeoIp2Location | null;
export function pretty(n: string | number | any[]): string;
export function reloadDataSync(): void;
export function reloadData(callback?: (err?: Error | null) => void): Promise<void>;
export function startWatchingDataUpdate(callback: () => void): void;
export function stopWatchingDataUpdate(): void;
export function clear(): void;
export const version: string;