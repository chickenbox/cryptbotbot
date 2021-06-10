namespace bot { export namespace trader {

    export abstract class Trader {
        abstract getBalances(): Promise<{[asset: string]: number}>

        abstract buy( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ): Promise<void>

        abstract sell( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ): Promise<void>
    }

}}