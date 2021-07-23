namespace bot { export namespace trader {

    export interface TradeResponse {
        price: number
        quantity: number
    }

    export abstract class Trader {
        readonly performanceTracker: helper.PerformanceTracker = new helper.PerformanceTracker()

        abstract getBalances(): Promise<{[asset: string]: number}>

        abstract buy( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, quoteAssetQuantity: number, mockPrice?: number  ): Promise<TradeResponse>

        abstract sell( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, mockPrice?: number ): Promise<TradeResponse>
    }

}}