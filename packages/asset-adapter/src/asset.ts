import { Types } from '@nixjs23n6/types'
import { ProviderEnums } from '@nixjs23n6/utilities-adapter'
import { BaseProvider } from './base'

export class Asset {
    readonly #classes: Types.Class[]
    #container: Types.Object<any> = {}
    #currentType?: ProviderEnums.Provider
    #prevType?: ProviderEnums.Provider

    constructor(args: Types.Class[]) {
        this.#classes = args
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
            console.log('» [Asset]Connect new provider:  %c' + this.#currentType, 'color: #FABB51; font-size:14px')
        } else {
            console.log('» [Asset]Continue to connect the current provider:  %c' + this.#prevType, 'color: #FABB51; font-size:14px')
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
