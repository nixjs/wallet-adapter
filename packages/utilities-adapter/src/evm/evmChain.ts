export class EvmChain {
    /**
     * Returns EVM chain
     *
     * @example EvmChain.EVM
     */
    public static get EVM() {
        return EvmChain.create(1)
    }

    /**
     * Returns GOERLI chain
     *
     * @example EvmChain.GOERLI
     */
    public static get GOERLI() {
        return EvmChain.create(5)
    }

    /**
     * Returns SEPOLIA chain
     *
     * @example EvmChain.SEPOLIA
     */
    public static get SEPOLIA() {
        return EvmChain.create(11155111)
    }

    /**
     * Returns POLYGON chain
     *
     * @example EvmChain.POLYGON
     */
    public static get POLYGON() {
        return EvmChain.create(137)
    }

    /**
     * Returns MUMBAI chain
     *
     * @example EvmChain.MUMBAI
     */
    public static get MUMBAI() {
        return EvmChain.create(80001)
    }

    /**
     * Returns BSC chain
     *
     * @example EvmChain.BSC
     */
    public static get BSC() {
        return EvmChain.create(56)
    }

    /**
     * Returns BSC_TESTNET chain
     *
     * @example EvmChain.BSC_TESTNET
     */
    public static get BSC_TESTNET() {
        return EvmChain.create(97)
    }

    /**
     * Returns AVALANCHE chain
     *
     * @example EvmChain.AVALANCHE
     */
    public static get AVALANCHE() {
        return EvmChain.create(43114)
    }

    /**
     * Returns FUJI chain
     *
     * @example EvmChain.FUJI
     */
    public static get FUJI() {
        return EvmChain.create(43113)
    }

    /**
     * Returns FANTOM chain
     *
     * @example EvmChain.FANTOM
     */
    public static get FANTOM() {
        return EvmChain.create(250)
    }

    /**
     * Returns CRONOS chain
     *
     * @example EvmChain.CRONOS
     */
    public static get CRONOS() {
        return EvmChain.create(25)
    }

    /**
     * Returns CRONOS_TESTNET chain
     *
     * @example EvmChain.CRONOS_TESTNET
     */
    public static get CRONOS_TESTNET() {
        return EvmChain.create(338)
    }

    /**
     * Returns PALM chain
     *
     * @example EvmChain.PALM
     */
    public static get PALM() {
        return EvmChain.create(11297108109)
    }

    /**
     * Returns ARBITRUM chain
     *
     * @example EvmChain.ARBITRUM
     */
    public static get ARBITRUM() {
        return EvmChain.create(42161)
    }

    /**
     * Create a new instance of EvmChain from any valid address input.
     *
     * @example
     * ```ts
     * const chain = EvmChain.create(1)
     * const chain = EvmChain.create("0x3")
     * ```
     */
    public static create(chainId: number): string {
        return `0x${chainId.toString(16)}`
    }
}
