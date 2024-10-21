declare module 'geoip-lite2' {
    export const cmp: number | null;

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

    function lookup(ip: string | number): GeoIp2Location | null;
    function pretty(n: string | number | any[]): string;

    function reloadDataSync(): void;
    function reloadData(callback: (err?: Error | null) => void): Promise<void>;
    function startWatchingDataUpdate(callback: () => void): void;
    function stopWatchingDataUpdate(): void;
    function clear(): void;

    export {
        lookup,
        pretty,
        reloadDataSync,
        reloadData,
        startWatchingDataUpdate,
        stopWatchingDataUpdate,
        clear
    };
}