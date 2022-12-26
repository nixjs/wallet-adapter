import { Types } from '@nixjs23n6/types'
import { ProviderEnums, VaultTypes } from '@nixjs23n6/utilities-adapter'
import { BaseProvider } from './base'

export class Vault {
    readonly #classes: Types.Class[]
    #container: Types.Object<any> = {}
    #currentType?: ProviderEnums.Provider
    #prevType?: ProviderEnums.Provider
    #mnemonic?: string

    constructor(args: Types.Class[], mnemonics?: string) {
        this.#classes = args
        this.#mnemonic = mnemonics
    }

    async generateHDWallets(): Promise<Record<string, VaultTypes.AccountObject & { path: string }> | null> {
        try {
            if (this.#classes.length > 0 && this.#mnemonic) {
                const accounts: Record<string, VaultTypes.AccountObject & { path: string }> = {}

                for (let index = 0; index < this.#classes.length; index++) {
                    const Provider: Types.Class = this.#classes[index]
                    const instance: BaseProvider = new Provider()
                    const account = await instance.getAccountFromMnemonic(0, this.#mnemonic)
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

    connect(type: ProviderEnums.Provider): void {
        if (!type) {
            throw new Error('Required parameter provider missing.')
        }
        if ((Object.values(ProviderEnums.Provider) as string[]).includes(type) === false) {
            throw new Error('Parameter invalid.')
        }
        this.#currentType = type
        if (this.#prevType !== this.#currentType) {
            this.#prevType && this.destroy(this.#prevType)
            for (let index = 0; index < this.#classes.length; index++) {
                const Provider: Types.Class = this.#classes[index]
                if (Provider.prototype.type && Provider.prototype.type === type) {
                    this.#container[type] = Provider
                    break
                }
            }
            this.#prevType = type
            console.log('» [Vault]Connect new provider:  %c' + this.#currentType, 'color: #FABB51; font-size:14px')
        } else {
            console.log('» [Vault]Continue to connect the current provider:  %c' + this.#prevType, 'color: #FABB51; font-size:14px')
        }
    }

    destroy(type?: ProviderEnums.Provider): void {
        try {
            let t: Types.Undefined<ProviderEnums.Provider> = this.#currentType
            if (type) {
                t = type
            }
            if (!t) {
                throw new Error('Provider type not found')
            }
            delete this.#container[t]
        } catch (error) {
            throw new Error('The instance is not found to delete.')
        }
    }

    get container(): Types.Object<any> {
        return this.#container
    }

    get instance(): BaseProvider {
        return this.#currentType ? new this.#container[this.#currentType]() : null
    }

    set prevType(v: Types.Undefined<ProviderEnums.Provider>) {
        this.#prevType = v
    }

    get prevType(): Types.Undefined<ProviderEnums.Provider> {
        return (this.#prevType as ProviderEnums.Provider) || undefined
    }

    set currentType(v: Types.Undefined<ProviderEnums.Provider>) {
        this.#currentType = v
    }

    get currentType(): Types.Undefined<ProviderEnums.Provider> {
        return (this.#currentType as ProviderEnums.Provider) || undefined
    }
}

export * from './base'
export * from './crypto'
