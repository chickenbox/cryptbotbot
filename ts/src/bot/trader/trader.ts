namespace bot { export namespace trader {

    interface TradeResponse {
        price: number
        quantity: number
    }

    export abstract class Trader {
        readonly performanceTracker: helper.PerformanceTracker

        constructor( performanceTracker?: helper.PerformanceTracker ){
            this.performanceTracker = performanceTracker || new helper.PerformanceTracker()
        }

        abstract getBalances(): Promise<{[asset: string]: number}>

        abstract buy( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, quoteAssetQuantity: number, mockPrice?: number  ): Promise<TradeResponse>

        abstract sell( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, mockPrice?: number ): Promise<TradeResponse>
    }

}}