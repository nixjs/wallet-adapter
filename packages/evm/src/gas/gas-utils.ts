import { Helper } from '@nixjs23n6/utilities-adapter'
import BigNumber from 'bignumber.js'
import { utils } from 'ethers'
import { GasPriceTypes } from './types'

export namespace EmvGasUtil {
    const MedConst = 21428571428.571
    const MedMultiplier = 1.0714285714286
    const FastConst = 42857142857.145
    const FastMultiplier = 1.1428571428571
    const FastestConst = 64285714285.7
    const FastestMultiplier = 1.21828571429
    const LIMITER = 25_000_000_000
    export const BaseGasNativeLimit = 21_000
    export const BaseGasERC20Limit = 60_000

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
    export const getInstant = (gasPrice: string): string => {
        const gpBN = BigNumber(gasPrice)
        if (gpBN.gt(BigNumber(LIMITER))) {
            let initialValue = gpBN.times(FastestMultiplier)
            initialValue = initialValue.plus(FastestConst)
            return initialValue.toFixed(0)
        }
        return gpBN.times(1.75).toFixed(0)
    }

    export const getGasBasedOnType = (gasPrice: string, gasPriceType: GasPriceTypes): string => {
        switch (gasPriceType) {
            case GasPriceTypes.SLOW:
                return getSlow(gasPrice)
            case GasPriceTypes.AVERAGE:
                return getAverage(gasPrice)
            case GasPriceTypes.FAST:
                return getFast(gasPrice)
            case GasPriceTypes.INSTANT:
                return getInstant(gasPrice)
            default:
                return getSlow(gasPrice)
        }
    }

    export const getMinPriorityFee = (): string => {
        return Helper.Decimal.toDecimal('1.25', 9)
    }

    export const getPriorityFeeBasedOnType = (baseFeePerGas: string, gasPrice: string, gasPriceType: GasPriceTypes): string => {
        const gpBN = BigNumber(gasPrice)
        const priorityFee = gpBN.div(BigNumber(baseFeePerGas))
        const minFee = getMinPriorityFee()
        const mediumTip = priorityFee
        let returnVal
        switch (gasPriceType) {
            case GasPriceTypes.SLOW:
                returnVal = mediumTip.times(0.8)
                break
            case GasPriceTypes.AVERAGE:
                returnVal = mediumTip
                break
            case GasPriceTypes.FAST:
                returnVal = mediumTip.times(1.25)
                break
            case GasPriceTypes.INSTANT:
                returnVal = mediumTip.times(1.5)
                break
            default:
                returnVal = BigNumber(minFee)
        }
        if (BigNumber(returnVal).lt(minFee)) return minFee
        return returnVal.toFixed(0)
    }
    export const getBaseFeeBasedOnType = (baseFee: string, gasPriceType: GasPriceTypes): string => {
        const baseFeeBN = BigNumber(baseFee)
        switch (gasPriceType) {
            case GasPriceTypes.SLOW:
                return baseFeeBN.times(1.25).toFixed(0)
            case GasPriceTypes.AVERAGE:
                return baseFeeBN.times(1.5).toFixed(0)
            case GasPriceTypes.FAST:
                return baseFeeBN.times(1.75).toFixed(0)
            case GasPriceTypes.INSTANT:
                return baseFeeBN.times(2).toFixed(0)
            default:
                return baseFeeBN.toFixed(0)
        }
    }

    export const FeeDescriptions = {
        [GasPriceTypes.SLOW]: {
            title: 'Slow',
            description: 'Will likely go through unless activity increases',
            eta: '~15 mins',
        },
        [GasPriceTypes.AVERAGE]: {
            title: 'Average',
            description: 'Will reliably go through in most scenarios',
            eta: '~5 min',
        },
        [GasPriceTypes.FAST]: {
            title: 'Higher priority',
            description: 'Will go through even if there is a sudden activity increase',
            eta: '~2 mins',
        },
        [GasPriceTypes.INSTANT]: {
            title: 'Highest priority',
            description: 'Will go through, fast, in 99.99% of the cases',
            eta: '~1 min',
        },
    }
}
