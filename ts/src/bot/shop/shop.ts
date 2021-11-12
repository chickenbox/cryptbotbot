namespace bot { export namespace shop {

    export class Shop {

        constructor(
            readonly binance: com.danborutori.cryptoApi.Binance,
            readonly markUp: number
        ){
        }

        async cancelAllOrder( symbols: string[] ){
            await Promise.all( symbols.map( async s=>{
                const resp = await this.binance.cancelAllOpenOrder()
            } ))
        }

        async markTradeRecord( symbols: com.danborutori.cryptoApi.ExchangeInfoSymbol[], performanceTracker: helper.PerformanceTracker, tradeHistory: trader.History ){
            await Promise.all( symbols.map( async s=>{
                let lastOrderId = tradeHistory.getLastOrderId( s.symbol )
                const orders = await this.binance.getAllOrders(s.symbol, lastOrderId)

                for( let o of orders ){
                    if( o.type=="TAKE_PROFIT" && o.orderId>lastOrderId ){
                        switch (o.status) {
                            case "FILLED":
                            case "PARTIALLY_FILLED":
                                console.log("markTradeRecord")
                                console.log(o)
                                performanceTracker.sell(s.symbol, Number.parseFloat(o.price), Number.parseFloat(o.executedQty))
                                tradeHistory.sell(s.baseAsset, s.quoteAsset, Number.parseFloat(o.price), Number.parseFloat(o.origQty), Number.parseFloat(o.stopPrice), Number.parseFloat( o.executedQty ), new Date(o.updateTime), o.orderId )
                                break
                        }
                    }
                }

            } ))
        }

        async placeOrders(
            balances: {[asset: string]: number},
            symbols: com.danborutori.cryptoApi.ExchangeInfoSymbol[],
            tradeHistory: trader.History,
            priceTracker: helper.PriceTracker
        ){

            await Promise.all( symbols.map( async s=>{                
                const prices = priceTracker.prices[s.symbol]
                const latestPrice = prices && prices.length>0 ? prices[prices.length-1].price : undefined
                const tradeInPrice = tradeHistory.getLastTradeInPrice(s.symbol) || latestPrice                
                const freeQuantity = balances[s.baseAsset]

                console.log({
                    latestPrice: latestPrice,
                    tradeInPrice: tradeInPrice,
                    freeQuantity: freeQuantity
                })

                if( latestPrice!==undefined && tradeInPrice!==undefined && freeQuantity!==undefined ){
                    const lotSize = helper.getLotSize(s)
                    const marketLotSize = helper.getMarketLotSize(s)
                    const quantity = Math.floor(freeQuantity/lotSize.stepSize)*lotSize.stepSize
                    if( quantity > Math.max(lotSize.minQty, marketLotSize.minQty) ){
                        const price = Math.max(tradeInPrice, latestPrice)*(1+this.markUp)
                        const resp = await this.binance.newOrder(s.symbol, "SELL", quantity, undefined, "TAKE_PROFIT", price )
                    }
                }
            }))
        }
    }

}}