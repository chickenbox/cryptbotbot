namespace bot { export namespace helper {

    function getMinNotional( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol ){
        const minNotional = symbol.filters.find(f=>f.filterType=="MIN_NOTIONAL") as com.danborutori.cryptoApi.FilterMinNotional
        if( minNotional && minNotional.applyToMarket ){
            return parseFloat( minNotional.minNotional )
        }
        return 0
    }

    export class TradeHelper {

        constructor(
            readonly trader: trader.Trader,
            readonly binance: com.danborutori.cryptoApi.Binance,
            readonly maxRetry: number = 3
        ){}

        async buy( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, quoteAssetQuantity: number, mockPrice?: number  ): Promise<trader.TradeResponse> {
            const price = (mockPrice!==undefined?mockPrice:parseFloat((await this.binance.getSymbolPriceTicker(symbol.symbol)).price))*(1+trader.marketPriceDiff)

            const response = {
                quantity: 0,
                price: 0
            }
            let remainQuantity = quantity
            let remainQuoteQuantity = quoteAssetQuantity
            for( let i=0; i<this.maxRetry; i++ ){
                const intermedia = await this.trader.buy(symbol, remainQuantity, remainQuoteQuantity, mockPrice)
                response.price = response.quantity*response.price+intermedia.quantity*intermedia.price
                response.quantity += intermedia.quantity
                if( response.quantity!=0 ) response.price /= response.quantity

                remainQuantity -= intermedia.quantity
                remainQuoteQuantity = remainQuantity*price

                const minNotional = getMinNotional(symbol)
                if( remainQuoteQuantity*0.9<=minNotional )
                    break
            }
            return response
        }

        async sell( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, mockPrice?: number ): Promise<trader.TradeResponse> {
            const price = (mockPrice!==undefined?mockPrice:parseFloat((await this.binance.getSymbolPriceTicker(symbol.symbol)).price))*(1-trader.marketPriceDiff)

            const response = {
                quantity: 0,
                price: 0
            }
            let remainQuantity = quantity
            for( let i=0; i<this.maxRetry; i++ ){
                const intermedia = await this.trader.sell(symbol, remainQuantity, mockPrice)
                response.price = response.quantity*response.price+intermedia.quantity*intermedia.price
                response.quantity += intermedia.quantity
                if( response.quantity!=0 ) response.price /= response.quantity

                remainQuantity -= intermedia.quantity

                const minNotional = getMinNotional(symbol)
                if( remainQuantity*price*0.9<=minNotional )
                    break
            }
            return response
        }


    }

}}