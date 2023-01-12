import { TransactionTypes, TransactionEnums } from '@nixjs23n6/utilities-adapter'

export interface GasFeeType {
    [TransactionEnums.GasPriceTypes.SLOW]: TransactionTypes.GasFeeInfo
    [TransactionEnums.GasPriceTypes.AVERAGE]: TransactionTypes.GasFeeInfo
    [TransactionEnums.GasPriceTypes.FAST]: TransactionTypes.GasFeeInfo
    // [GasPriceTypes.INSTANT]: TransactionTypes.GasFeeInfo
}
