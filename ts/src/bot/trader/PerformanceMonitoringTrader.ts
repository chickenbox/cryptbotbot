
namespace bot { export namespace trader {

    export class PerformanceMonitoringTrader<T extends Trader> extends Trader {

        private mockTrader: MockTrader

        constructor( private actualTrader: T, binance: com.danborutori.cryptoApi.Binance ){
            super( actualTrader.performanceTracker )
            this.mockTrader = new MockTrader( binance, "mock" )
        }

        getBalances(): Promise<{[asset: string]: number}> {
            return this.actualTrader.getBalances()
        }

        async beginTrade(){
            await this.mockTrader.beginTrade()
            await this.actualTrader.beginTrade()
        }

        async buy( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, quoteAssetQuantity: number, mockPrice?: number  ) {
            await this.mockTrader.buy( symbol, quantity, quoteAssetQuantity)
            return this.actualTrader.buy( symbol, quantity, quoteAssetQuantity)
        }

        async sell( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, mockPrice?: number ){
            await this.mockTrader.sell(symbol, quantity, mockPrice)
            return this.actualTrader.sell(symbol, quantity, mockPrice)
        }

        async endTrade(){
            await this.mockTrader.endTrade()
            await this.actualTrader.endTrade()
        }
    }

}}