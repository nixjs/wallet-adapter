import { AssetTypes } from '../types'

export function groupBy<T = any>(array: T[], predicate: (value: T, index: number, array: T[]) => string) {
    return array.reduce((acc, value, index, array) => {
        // eslint-disable-next-line @typescript-eslint/no-extra-semi
        ;(acc[predicate(value, index, array)] ||= []).push(value)
        return acc
    }, {} as { [key: string]: T[] })
}

export function reduceNativeCoin(assets: AssetTypes.Asset[], assetId: string) {
    if (assets.length === 0) return []
    const ourAssets = assets.reduce<AssetTypes.Asset[]>((acc, element, _idx) => {
        if (element.assetId === assetId) {
            return [element, ...acc]
        }
        return [...acc, element]
    }, [])
    return ourAssets
}
