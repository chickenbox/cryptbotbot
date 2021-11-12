namespace bot { export namespace shop {

    export class Shop {

        constructor(
            readonly binance: com.danborutori.cryptoApi.Binance,
            readonly markUp: number,
            readonly logger: helper.Logger            
        ){
        }

        async cancelAllOrder(){
            try{
                const resp = await this.binance.cancelAllOpenOrders()
                this.logger.log(`Cancel ${resp.length} orders`)
            }catch(e){
                this.logger.error(new Error("error occur while cancelAllOrder"))
                this.logger.error(e)
            }
        }

        async markTradeRecord( symbols: com.danborutori.cryptoApi.ExchangeInfoSymbol[], performanceTracker: helper.PerformanceTracker, tradeHistory: trader.History ){
            let numTradeRecords = 0
            const startTime = Date.now()-1000*60*60*24*2

            await Promise.all( symbols.map( async s=>{
                let lastOrderId = tradeHistory.getLastOrderId( s.symbol )
                const orders = await this.binance.getAllOrders(s.symbol, startTime)

                const largestOrderId = orders.reduce((a,b)=>{return Math.max(a,b.orderId)}, 0)

                for( let o of orders ){
                    if( o.type=="TAKE_PROFIT_LIMIT" && o.orderId>lastOrderId ){
                        switch (o.status) {
                            case "FILLED":
                            case "PARTIALLY_FILLED":
                                performanceTracker.sell(s.symbol, Number.parseFloat(o.price), Number.parseFloat(o.executedQty))
                                tradeHistory.sell(s.baseAsset, s.quoteAsset, Number.parseFloat(o.price), Number.parseFloat(o.origQty), Number.parseFloat(o.stopPrice), Number.parseFloat( o.executedQty ), new Date(o.updateTime), o.orderId )
                                numTradeRecords++
                                break
                        }
                    }
                }
                tradeHistory.setLastOrderId( s.symbol, largestOrderId )
            } ))

            this.logger.log( `created ${numTradeRecords} new records from latest orders.` )
            
        }

        async placeOrders(
            balances: {[asset: string]: number},
            symbols: com.danborutori.cryptoApi.ExchangeInfoSymbol[],
            tradeHistory: trader.History,
            priceTracker: helper.PriceTracker
        ){
            let numOrders = 0
            
            await Promise.all( symbols.map( async s=>{     
                if( s.orderTypes.indexOf("TAKE_PROFIT_LIMIT")>=0 ){
                    const prices = priceTracker.prices[s.symbol]
                    const latestPrice = prices && prices.length>0 ? prices[prices.length-1].price : undefined
                    const tradeInPrice = tradeHistory.getLastTradeInPrice(s.symbol) || latestPrice                
                    const freeQuantity = balances[s.baseAsset]

                    if( latestPrice!==undefined && tradeInPrice!==undefined && freeQuantity!==undefined ){
                        const lotSize = helper.getLotSize(s)
                        const marketLotSize = helper.getMarketLotSize(s)
                        const priceFilter = helper.getPriceFilter(s)
                        const maxNumOrders = helper.getExchangeMaxNumOrdersFilter(s).maxNumOrders
                        const maxNumAlgoOrders = helper.getExchangeMaxNumAlgoOrdersFilter(s).maxNumAlgoOrders

                        let quantity = freeQuantity
                        let price = Math.max(tradeInPrice, latestPrice)*(1+this.markUp)
                        price = Math.max(priceFilter.minPrice, Math.min(priceFilter.maxPrice, price))
                        price = Math.floor(price/priceFilter.tickSize)*priceFilter.tickSize
                        price = parseFloat(price.toPrecision(s.baseAssetPrecision))

                        let algoNum = 0

                        while(
                            quantity > Math.max(lotSize.minQty, marketLotSize.minQty) &&
                            algoNum<maxNumAlgoOrders && 
                            numOrders<maxNumOrders
                        ){
                            let orderQty = Math.min( lotSize.maxQty, quantity )
                            orderQty = Math.floor(orderQty/lotSize.stepSize)*lotSize.stepSize
                            orderQty = parseFloat( orderQty.toPrecision(s.baseAssetPrecision) )
                            
                            try{
                                const resp = await this.binance.newOrder(s.symbol, "SELL", orderQty, undefined, "TAKE_PROFIT_LIMIT", price )
                                algoNum++
                                numOrders++
                            }catch(e){
                                this.logger.error(new Error(`place sell order ${s.symbol} at price ${price} quantity: ${orderQty}`))
                                this.logger.error(e)
                                break
                            }

                            quantity -= orderQty
                        }
                    }
                }
            }))
             
            this.logger.log(`placed ${numOrders} orders.`)
        }
    }

}}