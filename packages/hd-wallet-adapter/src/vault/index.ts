import { Types } from '@nixjs23n6/types'
import { BaseEnums } from '../enum'
import { VaultTypes } from './types'
import { BaseProvider } from './base'

export class Vault {
    provider: string
    private readonly _classes: Types.Class[]
    private _container: Types.Object<any> = {}
    private _currentType?: BaseEnums.Provider
    private _prevType?: BaseEnums.Provider
    private _mnemonic?: string

    constructor(args: Types.Class[], provider?: string, mnemonics?: string) {
        this.provider = provider || ''
        this._classes = args
        this._mnemonic = mnemonics
    }

    async generateHDWallets(): Promise<Record<string, VaultTypes.AccountObject & { path: string }> | null> {
        try {
            if (this._classes.length > 0 && this._mnemonic) {
                const accounts: Record<string, VaultTypes.AccountObject & { path: string }> = {}

                for (let index = 0; index < this._classes.length; index++) {
                    const Provider: Types.Class = this._classes[index]
                    const instance: BaseProvider = new Provider()
                    const account = await instance.getAccountFromMnemonic(0, this._mnemonic)
                    Object.assign(accounts, {
                        [Provider.prototype.type]: account,
                    })
                }
                return accounts
            }
            return null
        } catch (error) {
            return null
        }
    }

    static getAccountProviders(data: Types.Object<VaultTypes.AccountObject & { path: string }>): VaultTypes.AccountProviders {
        const ourData = Object.keys(data)
        const newOurData: VaultTypes.AccountProviders = {}
        for (let i = 0; i < ourData.length; i += 1) {
            const { address, publicKeyHex, path } = (data as any)[ourData[i]] as VaultTypes.AccountObject & { path: string }
            if (address) {
                const pathIndex = Number(path.split('/').slice(-1)[0].split('')[0])
                const account: VaultTypes.AccountInfo = {
                    address: address,
                    name: `Account ${pathIndex}`,
                    display: true,
                    index: pathIndex,
                    derivationPath: path,
                    publicKey: publicKeyHex,
                }
                Object.assign(newOurData, {
                    [ourData[i]]: {
                        accounts: {
                            [address]: account,
                        },
                        accountActivated: address,
                    },
                })
            }
        }
        return newOurData
    }

    connect(type: BaseEnums.Provider): void {
        if (!type) {
            throw new Error('Required parameter provider missing.')
        }
        if ((Object.values(BaseEnums.Provider) as string[]).includes(type) === false) {
            throw new Error('Parameter invalid.')
        }
        this._currentType = type
        if (this._prevType !== this._currentType) {
            this._prevType && this.destroy(this._prevType)
            for (let index = 0; index < this._classes.length; index++) {
                const Provider: Types.Class = this._classes[index]
                if (Provider.prototype.type && Provider.prototype.type === type) {
                    this._container[type] = Provider
                    break
                }
            }
            this._prevType = type
            console.log('» Connect new blockchain:  %c' + this._currentType, 'color: #FABB51; font-size:14px')
        } else {
            console.log('» Continue to connect the current provider:  %c' + this._prevType, 'color: #FABB51; font-size:14px')
        }
    }

    destroy(type?: BaseEnums.Provider): void {
        try {
            let t: Types.Undefined<BaseEnums.Provider> = this._currentType
            if (type) {
                t = type
            }
            if (!t) {
                throw new Error('Provider type not found')
            }
            delete this._container[t]
        } catch (error) {
            throw new Error('The instance is not found to delete.')
        }
    }

    get container(): Types.Object<any> {
        return this._container
    }

    get instance(): BaseProvider {
        return this._currentType ? new this._container[this._currentType]() : null
    }

    set prevType(v: Types.Undefined<BaseEnums.Provider>) {
        this._prevType = v
    }

    get prevType(): Types.Undefined<BaseEnums.Provider> {
        return (this._prevType as BaseEnums.Provider) || undefined
    }

    set currentType(v: Types.Undefined<BaseEnums.Provider>) {
        this._currentType = v
    }

    get currentType(): Types.Undefined<BaseEnums.Provider> {
        return (this._currentType as BaseEnums.Provider) || undefined
    }
}

export * from './base'
export * from './crypto'
export * from './types'
