import { BaseErrors, Errors } from '@nixjs23n6/types'

export const baseCode = 10010000
export const mergeCode = (num: number, base = baseCode) => String(base + num)
export const ERROR_TYPE = BaseErrors.enumify({
    AN_ERROR_OCCURRED: mergeCode(0),
    PROVIDER_NOT_FOUND: mergeCode(1),
    DATA_NOT_FOUND: mergeCode(3),
    INVALID_PARAMETERS: mergeCode(4),
})

export type ErrorType = keyof typeof ERROR_TYPE

export type Error<T> = {
    type: T
    code: number
    stringify: Errors.ErrorStringifier
    format: Errors.ErrorFormatter
}

export const ErrorConfigs: Record<string, Error<ErrorType>> = {
    [ERROR_TYPE.AN_ERROR_OCCURRED]: {
        type: 'AN_ERROR_OCCURRED',
        code: Number(ERROR_TYPE.AN_ERROR_OCCURRED),
        stringify: () => 'An error occurred',
        format: (params?: any) => ({
            code: ErrorConfigs[ERROR_TYPE.AN_ERROR_OCCURRED as ErrorType].code,
            message: ErrorConfigs[ERROR_TYPE.AN_ERROR_OCCURRED as ErrorType].stringify(params),
        }),
    },
    [ERROR_TYPE.PROVIDER_NOT_FOUND]: {
        type: 'PROVIDER_NOT_FOUND',
        code: Number(ERROR_TYPE.PROVIDER_NOT_FOUND),
        stringify: (params: any) => `Provider or node url not found ${JSON.stringify(params)}`,
        format: (params?: any) => ({
            code: ErrorConfigs[ERROR_TYPE.PROVIDER_NOT_FOUND as ErrorType].code,
            message: ErrorConfigs[ERROR_TYPE.PROVIDER_NOT_FOUND as ErrorType].stringify(params),
        }),
    },
    [ERROR_TYPE.DATA_NOT_FOUND]: {
        type: 'DATA_NOT_FOUND',
        code: Number(ERROR_TYPE.DATA_NOT_FOUND),
        stringify: (params: any) => `Data not found ${JSON.stringify(params)}`,
        format: (params?: any) => ({
            code: ErrorConfigs[ERROR_TYPE.DATA_NOT_FOUND as ErrorType].code,
            message: ErrorConfigs[ERROR_TYPE.DATA_NOT_FOUND as ErrorType].stringify(params),
        }),
    },
    [ERROR_TYPE.INVALID_PARAMETERS]: {
        type: 'INVALID_PARAMETERS',
        code: Number(ERROR_TYPE.INVALID_PARAMETERS),
        stringify: (params: any) => `Invalid parameters ${JSON.stringify(params)}`,
        format: (params?: any) => ({
            code: ErrorConfigs[ERROR_TYPE.INVALID_PARAMETERS as ErrorType].code,
            message: ErrorConfigs[ERROR_TYPE.INVALID_PARAMETERS as ErrorType].stringify(params),
        }),
    },
}
