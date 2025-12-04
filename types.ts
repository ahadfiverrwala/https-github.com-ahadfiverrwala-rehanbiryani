export interface CampusInfo {
    name: string;
    principal: string;
    phone: string;
}

export enum ConnectionState {
    DISCONNECTED = 'DISCONNECTED',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    ERROR = 'ERROR',
}

export interface AudioVolumeState {
    inputVolume: number;
    outputVolume: number;
}
