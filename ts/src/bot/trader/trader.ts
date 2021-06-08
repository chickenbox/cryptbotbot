namespace bot { export namespace trader {

    export interface Trader {
        getBalances(): Promise<{[asset: string]: number}>
        buy( baseAsset: string, quoteAsset: string, closePrice: number, quality: number ): Promise<void>
        sell( baseAsset: string, quoteAsset: string, closePrice: number, quality: number ): Promise<void>
    }

}}