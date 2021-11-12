namespace bot { export namespace shop {

    export class Shop {

        constructor(
            readonly binance: com.danborutori.cryptoApi.Binance,
            readonly markUp: number,
            readonly logger: helper.Logger            
        ){
        }

        async checkOpenedOrders(
            symbols: com.danborutori.cryptoApi.ExchangeInfoSymbol[],
            performanceTracker: helper.PerformanceTracker,
            tradeHistory: trader.History
        ){
            let numTradeRecords = 0
            this.logger.log("Checking Opened Orders")
            tradeHistory.openedOrderIds.map(async o=>{

                const order = await this.binance.queryOrder(o.symbol,o.orderId)

                switch (order.status) {
                    case "FILLED":
                    case "PARTIALLY_FILLED":
                        const sym = symbols.find(s=>{ return s.symbol==order.symbol })
                        performanceTracker.sell(order.symbol, parseFloat(order.price), parseFloat(order.executedQty))
                        tradeHistory.sell(sym.baseAsset, sym.quoteAsset, parseFloat(order.price), parseFloat(order.origQty), parseFloat(order.price), parseFloat( order.executedQty ), new Date(order.updateTime) )
                        numTradeRecords++
                        break
                }

            })

            const cancelledOrders = await this.binance.cancelAllOpenOrders()

            this.logger.log( `created ${numTradeRecords} new records from latest orders.` )            
            this.logger.log(`Cancel ${cancelledOrders.length} orders`)
            this.logger.log("Checking Opened Orders completed")
        }

        async placeOrders(
            balances: {[asset: string]: number},
            symbols: com.danborutori.cryptoApi.ExchangeInfoSymbol[],
            tradeHistory: trader.History,
            priceTracker: helper.PriceTracker
        ){
            this.logger.log("placing orders")

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
                                tradeHistory.openedOrderIds.push({
                                   symbol: resp.symbol,
                                   orderId:  resp.orderId
                                })
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