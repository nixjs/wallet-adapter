import { EvmUtil, AssetTypes, PrimitiveHexString } from '@nixjs23n6/utilities-adapter'
import { EvmNativeConfig } from '../evmNativeConfig'

export class EvmAsset {
    public static assets(chainId: PrimitiveHexString): AssetTypes.Asset[] {
        const assets = EvmUtil.Erc20Tokens.filter((t) => t.chainId === Number(chainId)).map(
            ({ address, decimals, logoURI, name, symbol }) => {
                const isNative = EvmNativeConfig[chainId].native.assetId.toLowerCase() === symbol.toLowerCase()
                return {
                    assetId: isNative ? symbol : address,
                    decimals,
                    isNative,
                    logoUrl: logoURI,
                    name,
                    symbol,
                } as AssetTypes.Asset
            }
        )
        if (!assets) return []
        return assets
    }
    public static getTokenInfo(assetId: PrimitiveHexString, chainId: PrimitiveHexString) {
        return EvmUtil.Erc20Tokens.find((t) => t.address.toLowerCase() === assetId.toLowerCase() && Number(t.chainId) === Number(chainId))
    }
}
