import { AlchemyProvider, MoralisProvider, ConfigData, EvmEnums } from '@nixjs23n6/evm'
import { BaseBlockTracker, PollingBlockTrackerOptions, Block } from './BaseBlockTracker'

const sec = 1000

export class PollingEvmTracker extends BaseBlockTracker {
    #address: string
    #nodeURL: string

    #pollingInterval: number

    #retryTimeout: number

    #keepEventLoopActive: boolean
    #evmConfig: Record<string, Record<string, ConfigData>>
    #chainId: string

    // #setSkipCacheFlag: boolean

    constructor(opts: PollingBlockTrackerOptions, config: Record<string, Record<string, ConfigData>>, chainId: string) {
        // parse + validate args
        if (!opts.address || !opts.nodeURL) {
            throw new Error('PollingBlockTracker - no address/nodeURL specified.')
        }

        super({
            blockResetDuration: opts.blockResetDuration ?? opts.pollingInterval,
        })

        // config
        this.#address = opts.address
        this.#nodeURL = opts.nodeURL
        this.#pollingInterval = opts.pollingInterval || 20 * sec
        this.#retryTimeout = opts.retryTimeout || this.#pollingInterval / 10
        this.#keepEventLoopActive = opts.keepEventLoopActive === undefined ? true : opts.keepEventLoopActive
        // this.#setSkipCacheFlag = opts.setSkipCacheFlag || false
        this.#evmConfig = config
        this.#chainId = chainId
    }

    // trigger block polling
    async checkForLatestBlock() {
        await this._updateLatestBlock()
        return await this.getLatestBlock()
    }

    protected async _start(): Promise<void> {
        this._synchronize()
    }

    protected async _end(): Promise<void> {
        // No-op
    }

    private async _synchronize(): Promise<void> {
        while (this._isRunning) {
            try {
                await this._updateLatestBlock()
                const promise = timeout(this.#pollingInterval, !this.#keepEventLoopActive)
                this.emit('_waitingForNextIteration')
                await promise
            } catch (err: any) {
                const newErr = new Error(
                    `PollingBlockTracker - encountered an error while attempting to update latest block:\n${err.stack ?? err}`
                )
                try {
                    this.emit('error', newErr)
                } catch (emitErr) {
                    console.error(newErr)
                }
                const promise = timeout(this.#retryTimeout, !this.#keepEventLoopActive)
                this.emit('_waitingForNextIteration')
                await promise
            }
        }
    }

    private async _updateLatestBlock(): Promise<void> {
        // fetch + set latest block
        const latestBlock = await this._fetchLatestBlock()
        this._newPotentialLatest(latestBlock)
    }

    private async _fetchLatestBlock(): Promise<Block> {
        const moralis = new MoralisProvider(this.#evmConfig[EvmEnums.Provider.MORALIS], this.#chainId)
        const moralistRes = await moralis.getTransactions(this.#address, 1)
        if (moralistRes.status === 'SUCCESS' && moralistRes.data && moralistRes.data?.length > 0) {
            const data = moralistRes.data[0]
            return {
                hash: data.hash,
                version: String(data.version),
            }
        } else {
            const alchemy = new AlchemyProvider(this.#evmConfig[EvmEnums.Provider.ALCHEMY], this.#chainId)
            const alchemyRes = await alchemy.getTransactions(this.#address, 1)
            if (alchemyRes.status === 'SUCCESS' && alchemyRes.data && alchemyRes.data?.length > 0) {
                const data = alchemyRes.data[0]
                return {
                    hash: data.hash,
                    version: String(data.version),
                }
            }
        }
        throw new Error(`PollingBlockTracker - encountered error fetching block:`)
    }
}

/**
 * Waits for the specified amount of time.
 *
 * @param duration - The amount of time in milliseconds.
 * @param unref - Assuming this function is run in a Node context, governs
 * whether Node should wait before the `setTimeout` has completed before ending
 * the process (true for no, false for yes). Defaults to false.
 * @returns A promise that can be used to wait.
 */
function timeout(duration: number, unref: boolean) {
    return new Promise((resolve) => {
        const timeoutRef = setTimeout(resolve, duration)
        // don't keep process open
        if (timeoutRef.unref && unref) {
            timeoutRef.unref()
        }
    })
}
