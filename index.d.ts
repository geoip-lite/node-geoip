declare module 'geoip-lite2' {
    export const cmp: number | null;

    interface GeoIp2Location {
        range: [number, number];
        country: string;
        region: string;
        eu: '0' | '1';
        timezone: string;
        city: string;
        ll: [number, number];
        metro: number;
        area: number;
    }

    function lookup(ip: string): GeoIp2Location | null;
    function pretty(ip: string | number): string;

    function reloadDataSync(): void;
    function reloadData(callback: () => void): void;
    function startWatchingDataUpdate(): void;

    export {
        lookup,
        pretty,
        reloadDataSync,
        reloadData,
        startWatchingDataUpdate,
    };
}