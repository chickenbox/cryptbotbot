namespace bot { export namespace trader {

    interface TradeResponse {
        price: number
        quantity: number
    }

    export abstract class Trader {
        abstract getBalances(): Promise<{[asset: string]: number}>

        abstract buy( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, closePrice: number, quantity: number ): Promise<TradeResponse>

        abstract sell( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, closePrice: number, quantity: number ): Promise<TradeResponse>
    }

}}