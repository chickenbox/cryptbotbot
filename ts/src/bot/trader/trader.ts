namespace bot { export namespace trader {

    interface TradeResponse {
        price: number
        quantity: number
    }

    export abstract class Trader {
        abstract getBalances(): Promise<{[asset: string]: number}>

        abstract buy( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ): Promise<TradeResponse>

        abstract sell( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ): Promise<TradeResponse>
    }

}}