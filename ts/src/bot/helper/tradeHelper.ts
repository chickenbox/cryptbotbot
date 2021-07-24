namespace bot { export namespace helper {

    function getMinNotional( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol ){
        const minNotional = symbol.filters.find(f=>f.filterType=="MIN_NOTIONAL") as com.danborutori.cryptoApi.FilterMinNotional
        if( minNotional && minNotional.applyToMarket ){
            return parseFloat( minNotional.minNotional )
        }
        return 0
    }

    function getMarketLotSize( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol ){
        const filter = symbol.filters.find(f=>f.filterType=="MARKET_LOT_SIZE") as com.danborutori.cryptoApi.FilterMarketLotSize
        if( filter ){
            return {
                minQty: parseFloat( filter.minQty ),
                maxQty: parseFloat( filter.maxQty )
            }
        }
        return {
            minQty: Number.NEGATIVE_INFINITY,
            maxQty: Number.POSITIVE_INFINITY
        }
    }

    export class TradeHelper {

        constructor(
            readonly trader: trader.Trader,
            readonly binance: com.danborutori.cryptoApi.Binance,
            readonly maxRetry: number = 3
        ){}

        async buy( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, price: number, quantity: number, mockPrice?: number  ): Promise<trader.TradeResponse> {
            const marketLotSize = getMarketLotSize(symbol)

            const response = {
                quantity: 0,
                price: 0
            }
            let remainQuantity = quantity
            for( let i=0; i<this.maxRetry;){
                const tradeQuantity = Math.min( remainQuantity, marketLotSize.maxQty )
                if( tradeQuantity<marketLotSize.minQty )
                    break

                const intermedia = await this.trader.buy(symbol, tradeQuantity, tradeQuantity*price, mockPrice)
                response.price = response.quantity*response.price+intermedia.quantity*intermedia.price
                response.quantity += intermedia.quantity
                if( response.quantity!=0 ) response.price /= response.quantity

                remainQuantity -= intermedia.quantity

                const minNotional = getMinNotional(symbol)
                if( remainQuantity*price*0.9<=minNotional )
                    break

                if( intermedia.quantity==0 ) i++
            }
            return response
        }

        async sell( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, price: number, quantity: number, mockPrice?: number ): Promise<trader.TradeResponse> {
            const marketLotSize = getMarketLotSize(symbol)

            const response = {
                quantity: 0,
                price: 0
            }
            let remainQuantity = quantity
            for( let i=0; i<this.maxRetry;){
                const tradeQuantity = Math.min( remainQuantity, marketLotSize.maxQty )
                if( tradeQuantity<marketLotSize.minQty )
                    break

                const intermedia = await this.trader.sell(symbol, tradeQuantity, mockPrice)
                response.price = response.quantity*response.price+intermedia.quantity*intermedia.price
                response.quantity += intermedia.quantity
                if( response.quantity!=0 ) response.price /= response.quantity

                remainQuantity -= intermedia.quantity

                const minNotional = getMinNotional(symbol)
                if( remainQuantity*price*0.9<=minNotional )
                    break

                if( intermedia.quantity==0 ) i++
            }
            return response
        }


    }

}}