import { Helper, TransactionEnums, TransactionTypes } from '@nixjs23n6/utilities-adapter'
import BigNumber from 'bignumber.js'
import { utils } from 'ethers'

export namespace EmvGasUtil {
    const MedConst = 21428571428.571
    const MedMultiplier = 1.0714285714286
    const FastConst = 42857142857.145
    const FastMultiplier = 1.1428571428571
    // const FastestConst = 64285714285.7
    // const FastestMultiplier = 1.21828571429
    const LIMITER = 25_000_000_000
    export const BaseGasNativeLimit = 21_000
    export const BaseGasERC20Limit = 65_000
    export const BaseGasERC721TransferringLimit = 85_000

    export const NetworkCongestionThresholds = {
        NOT_BUSY: 0,
        STABLE: 0.33,
        BUSY: 0.66,
    }

    export const getBaseFeePerGas = (maxFeePerGas: string, maxPriorityFeePerGas: string) =>
        BigNumber(maxFeePerGas).minus(maxPriorityFeePerGas).toFixed(0)

    export const calculateFee = (gasPrice: string, gasLimit: string, toWei = false, extraGasForMemo = 0): string => {
        const fee = BigNumber(gasPrice).times(gasLimit).plus(extraGasForMemo)
        if (toWei) return fee.toFixed(0)
        return utils.formatUnits(fee.toFixed(0))
    }

    export const getSlow = (gasPrice: string): string => {
        return gasPrice
    }
    export const getAverage = (gasPrice: string): string => {
        const gpBN = BigNumber(gasPrice)
        if (gpBN.gt(BigNumber(LIMITER))) {
            let initialValue = gpBN.times(MedMultiplier)
            initialValue = initialValue.plus(MedConst)
            return initialValue.toFixed(0)
        }
        return gpBN.times(1.25).toFixed(0)
    }
    export const getFast = (gasPrice: string): string => {
        const gpBN = BigNumber(gasPrice)
        if (gpBN.gt(BigNumber(LIMITER))) {
            let initialValue = gpBN.times(FastMultiplier)
            initialValue = initialValue.plus(FastConst)
            return initialValue.toFixed(0)
        }
        return gpBN.times(1.5).toFixed(0)
    }

    // export const getInstant = (gasPrice: string): string => {
    //     const gpBN = BigNumber(gasPrice)
    //     if (gpBN.gt(BigNumber(LIMITER))) {
    //         let initialValue = gpBN.times(FastestMultiplier)
    //         initialValue = initialValue.plus(FastestConst)
    //         return initialValue.toFixed(0)
    //     }
    //     return gpBN.times(1.75).toFixed(0)
    // }

    /**
     * Get gas based by type
     * @param gasPrice baseFeePerGas or gasPrice
     * @param gasPriceType SLOW | AVERAGE | FAST
     */
    export const getGasBasedOnType = (gasPrice: string, gasPriceType: TransactionEnums.GasPriceTypes): string => {
        switch (gasPriceType) {
            case TransactionEnums.GasPriceTypes.SLOW:
                return getSlow(gasPrice)
            case TransactionEnums.GasPriceTypes.AVERAGE:
                return getAverage(gasPrice)
            case TransactionEnums.GasPriceTypes.FAST:
                return getFast(gasPrice)
            // case TransactionEnums.GasPriceTypes.INSTANT:
            //     return getInstant(gasPrice)
            default:
                return getSlow(gasPrice)
        }
    }

    /**
     * Get min priority fee
     */
    export const getMinPriorityFee = (): string => {
        return Helper.Decimal.toDecimal('1.25', 9)
    }

    /**
     * Get priority fee based by type
     * @param baseFeePerGas
     * @param gasPrice
     * @param gasPriceType SLOW | AVERAGE | FAST
     */
    export const getPriorityFeeBasedOnType = (
        baseFeePerGas: string,
        gasPrice: string,
        gasPriceType: TransactionEnums.GasPriceTypes
    ): string => {
        const gpBN = BigNumber(gasPrice)
        const priorityFee = gpBN.div(BigNumber(baseFeePerGas))
        const minFee = getMinPriorityFee()
        const mediumTip = priorityFee
        let returnVal
        switch (gasPriceType) {
            case TransactionEnums.GasPriceTypes.SLOW:
                returnVal = mediumTip.times(0.8)
                break
            case TransactionEnums.GasPriceTypes.AVERAGE:
                returnVal = mediumTip
                break
            case TransactionEnums.GasPriceTypes.FAST:
                returnVal = mediumTip.times(1.5)
                break
            // case TransactionEnums.GasPriceTypes.FAST:
            //     returnVal = mediumTip.times(1.25)
            //     break
            // case TransactionEnums.GasPriceTypes.INSTANT:
            //     returnVal = mediumTip.times(1.5)
            //     break
            default:
                returnVal = BigNumber(minFee)
        }
        if (BigNumber(returnVal).lt(minFee)) return minFee
        return returnVal.toFixed(0)
    }

    /**
     * Get fee based by type
     * @param baseFee
     * @param gasPriceType SLOW | AVERAGE | FAST
     */
    export const getBaseFeeBasedOnType = (baseFee: string, gasPriceType: TransactionEnums.GasPriceTypes): string => {
        const baseFeeBN = BigNumber(baseFee)
        switch (gasPriceType) {
            case TransactionEnums.GasPriceTypes.SLOW:
                return baseFeeBN.times(1).toFixed(0)
            case TransactionEnums.GasPriceTypes.AVERAGE:
                return baseFeeBN.times(1.25).toFixed(0)
            // case TransactionEnums.GasPriceTypes.FAST:
            //     return baseFeeBN.times(1.75).toFixed(0)
            case TransactionEnums.GasPriceTypes.FAST:
                return baseFeeBN.times(1.75).toFixed(0)
            // case TransactionEnums.GasPriceTypes.INSTANT:
            //     return baseFeeBN.times(2).toFixed(0)
            default:
                return baseFeeBN.toFixed(0)
        }
    }

    export const FeeDescriptions = () => {
        return {
            [TransactionEnums.GasPriceTypes.SLOW]: {
                title: 'Slow',
                description: 'Will likely go through unless activity increases',
                eta: '~15 mins',
            },
            [TransactionEnums.GasPriceTypes.AVERAGE]: {
                title: 'Average',
                description: 'Will likely go through unless activity increases',
                eta: '~3 min',
            },
            [TransactionEnums.GasPriceTypes.FAST]: {
                title: 'Rapid',
                description: 'Will likely go through unless activity increases',
                eta: '~1 mins',
            },
            // [TransactionEnums.GasPriceTypes.FAST]: {
            //     title: 'Higher priority',
            //     description: 'Will likely go through unless activity increases',
            //     eta: '~2 mins',
            // },
            // [TransactionEnums.GasPriceTypes.INSTANT]: {
            //     title: 'Highest priority',
            //     description: 'Will likely go through unless activity increases',
            //     eta: '~1 min',
            // },
        } as Record<TransactionEnums.GasPriceTypes, TransactionTypes.GasFeeInfo>
    }
}
