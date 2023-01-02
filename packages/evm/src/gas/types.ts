export interface GasFeeInfo {
    nativeValue: string
    fiatValue: string
    nativeSymbol: string
    fiatSymbol: string
}
export enum GasPriceTypes {
    SLOW = 'SLOW',
    AVERAGE = 'AVERAGE',
    FAST = 'FAST',
    INSTANT = 'INSTANT',
}
export interface GasFeeType {
    [GasPriceTypes.SLOW]: GasFeeInfo
    [GasPriceTypes.AVERAGE]: GasFeeInfo
    [GasPriceTypes.FAST]: GasFeeInfo
    [GasPriceTypes.INSTANT]: GasFeeInfo
}
