namespace bot {

    function sleep( second: number ){
        return new Promise<void>( (resolve, reject)=>{
            setTimeout(function(){
                resolve()
            }, second*1000)
        })
    }

    type Action = "buy" | "sell" | "none"
    type Trend = "up" | "side" | "down"

    interface Decision {
        symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol
        price: number
        index: number
        action: Action
        trend: Trend
        score: number
    }

    function getMinQty( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol ): number | undefined {
        const f = symbol.filters.find(function(f){return f.filterType=="LOT_SIZE"}) as com.danborutori.cryptoApi.FilterLotSize
        if( f ){
            return parseFloat( f.minQty )
        }
    }

    function getTrend( trendWatcher: helper.TrendWatcher, index: number ){
        let trend: Trend = "side"

        if( index>0 ){
            const lastCrossIndex = trendWatcher.lastCrossIndex[index-1]

            const upRate = 0.0001
            const s = 1+(index-lastCrossIndex)*upRate

            if( trendWatcher.ma14[index] > trendWatcher.ma14[lastCrossIndex]*s &&
                trendWatcher.ma24[index] > trendWatcher.ma24[lastCrossIndex]*s ){
                trend = "up"
            }else if( trendWatcher.ma14[index] < trendWatcher.ma14[lastCrossIndex] &&
                trendWatcher.ma24[index] < trendWatcher.ma24[lastCrossIndex] ){
                trend = "down"
            }
        }

        return trend
    }

    export class Bot {
        readonly binance: com.danborutori.cryptoApi.Binance
        readonly homingAsset: string
        private interval: com.danborutori.cryptoApi.Interval
        private maxAllocation: number
        private maxAbsoluteAllocation: number
        private holdingBalance: number
        private minimumOrderQuantity: number // in homingAsset
        private whiteList: Set<string>
        private blackList: Set<string>
        private priceTracker: helper.PriceTracker
        readonly balanceTracker: helper.BalanceTracker
        readonly trader: trader.Trader
        readonly tradeHistory = new trader.History()
        readonly trendWatchers: {[asset: string]: helper.TrendWatcher} = {}
        readonly logger: helper.Logger
        
        readonly allow = {
            buy: true,
            sell: true
        }

        get log(){
            return this.logger.logString
        }

        get timeInterval() {
            return helper.intervalToMilliSec(this.interval)
        }

        async init(){
            const exchangeInfo = await this.binance.getExchangeInfo()
            this.updateWhiteList(exchangeInfo)
        }

        private updateWhiteList(exchangeInfo: com.danborutori.cryptoApi.ExchangeInfoResponse){
            const filteredSymbols =  exchangeInfo.symbols.filter(s=>{
                return s.quoteAsset==this.homingAsset &&
                    s.status=="TRADING" &&
                    s.orderTypes.indexOf("MARKET")>=0 &&
                    s.permissions.indexOf("SPOT")>=0 &&
                    s.isSpotTradingAllowed
            })

            for( let baseAsset of filteredSymbols.map(s=>s.baseAsset))
                this.whiteList.add( baseAsset )
        }


        getRecentPrice( symbol: string, time: number ): number | undefined{
            const p = this.priceTracker.prices[symbol]
            if( p ){
                let index = p.findIndex(function(e,idx){
                    return idx+1<p.length ? p[idx+1].time>time : true
                })
                if( index>=0 )
                return p[index].price
            }
            
        }

        private getHomingTotal( balances: {[key:string]:number}, time: number ){
            let homingTotal = balances[this.homingAsset]
            for( let b in balances ){
                let currentPrice = this.getRecentPrice(`${b}${this.homingAsset}`, time)
                if( currentPrice!==undefined ){
                    homingTotal += balances[b]*currentPrice
                }        
            }
            return homingTotal
        }


        constructor(
            config: {
                homingAsset: string
                interval: com.danborutori.cryptoApi.Interval
                maxAllocation: number
                maxAbsoluteAllocation: number
                logLength: number
                holdingBalance: number
                minimumOrderQuantity: number
                blackList: string[]
                apiKey: string
                apiSecure: string
                environment: com.danborutori.cryptoApi.Environment
                trader: "BINANCE" | "MOCK"
            }
        ){
            this.binance = new com.danborutori.cryptoApi.Binance(config.apiKey, config.apiSecure, config.environment)
            this.logger = new  helper.Logger(config.logLength)
            switch( config.trader ){
            case "BINANCE":
                this.trader = new trader.BinanceTrader(this.binance, this.logger)
                break
            default:
                this.trader = new trader.MockTrader(this.binance)
                break
            }
            this.priceTracker = new helper.PriceTracker(this.binance)
            this.balanceTracker = new helper.BalanceTracker()
            this.homingAsset = config.homingAsset
            this.interval = config.interval
            this.maxAllocation = config.maxAllocation
            this.maxAbsoluteAllocation = config.maxAbsoluteAllocation
            this.holdingBalance = config.holdingBalance
            this.minimumOrderQuantity = config.minimumOrderQuantity
            this.whiteList = new Set()
            this.blackList = new Set(config.blackList)
        }

        async mock(){
            const whiteSymbols = new Set(Array.from(this.whiteList).map(asset=>`${asset}${this.homingAsset}`))
            await this.priceTracker.update(this.interval, whiteSymbols)
            this.trader.performanceTracker.reset()
            const balances = await this.trader.getBalances()
            for( let k in balances ){
                delete balances[k]
            }
            balances[this.homingAsset] = 10000
            const history = await this.tradeHistory.history
            for( let k in history ){
                delete history[k]
            }
            this.balanceTracker.balances.length = 0

            let end = 0
            for( let t in this.priceTracker.prices ){
                const p = this.priceTracker.prices[t]
                end = Math.max(end, p[p.length-1].time)
            }

            end = helper.snapTime( end, this.timeInterval )
            const start = helper.snapTime( end-graphInterval, this.timeInterval )

            this.logger.log("Start Mock")
            for( let t=start; t<end; t+=this.timeInterval ){
                this.logger.log(`Mocking: ${new Date(t).toUTCString()}`)
                await this.performTrade( t )
            }
            this.logger.log("End Mock")
        }

        async run(){
            const now = Date.now()

            try{
                try{
                    await this.performTrade()
                }catch(e){
                    this.logger.error(e)
                }
            }catch(e){
                this.logger.error(e)
            }

            // align data time slot
            const nextTime = helper.snapTime( now, this.timeInterval )+this.timeInterval
            const timeout = nextTime-now

            setTimeout(async ()=>{
                try{
                    await this.run()
                }catch(e){
                    this.logger.error(e)
                }
            }, timeout)
        }

        getAction( baseAsset: string, trendWatcher: helper.TrendWatcher, index: number ): [Action, Trend]{
            const data = trendWatcher.data

            let action: Action = "none"

            let trend = getTrend(trendWatcher,index)

            if(
                index>=100 // long enough history
                &&
                trendWatcher.ratio[index] > 1.1 // filter low profit asset
                &&
                trendWatcher.data[index].price<trendWatcher.ma14[index]*1.1 // filter impulse
                &&
                this.allow.buy
            ){
                switch(trend){
                case "up":
                    {
                        if(
                            index>0 &&
                            trendWatcher.ma14[index-1]<trendWatcher.ma24[index-1] &&
                            trendWatcher.ma14[index]>=trendWatcher.ma24[index]
                        ){

                            const lastCIdx = trendWatcher.lastCrossIndex[index-1]
                            if(lastCIdx>=1){
                                const lastlastCIdx = trendWatcher.lastCrossIndex[lastCIdx-1]
                                const trendSlope0 = (trendWatcher.ma14[index]-trendWatcher.ma14[lastCIdx])/(index-lastCIdx)
                                const trendSlope1 = (trendWatcher.ma14[lastCIdx]-trendWatcher.ma14[lastlastCIdx])/(lastCIdx-lastlastCIdx)

                                if(trendSlope0>trendSlope1*0.8)
                                    action = "buy"
                            }
                        }
                    }
                    break
                }
            }
            
            if(action=="none" && this.allow.sell){
                if(index>=2 && trendWatcher.data[index].price/trendWatcher.data[index-2].price > 1.5){  // raise cutoff
                    action = "sell"
                }else if( trendWatcher.data[index].price<trendWatcher.ma24[index]*0.95 ) // drop cutoff
                    action = "sell"
                else{

                    if(
                        trendWatcher.ma14[index]<=trendWatcher.ma24[index]
                    ){
                        action = "sell"
                    }                        
                }
            }
            return [action, trend]
        }

        private scoreDecision( trendWatcher: helper.TrendWatcher, lastIdx: number, balance: number ){
            return new helper.DecisionScorer().score( trendWatcher, lastIdx, balance )
        }

        private makeDecision(
            trader: trader.Trader,
            symbol: {baseAsset: string, symbol: string },
            time: number,
            isMock: boolean
        ){
            if( symbol.baseAsset==this.homingAsset ) return undefined

            try{
                let trendWatcher: helper.TrendWatcher

                if( isMock ){
                    trendWatcher = this.trendWatchers[symbol.baseAsset]
                }

                const data = trendWatcher?
                    trendWatcher.data:
                    this.priceTracker.getConstantIntervalPrice( symbol.symbol, this.timeInterval )

                const index = data.findIndex(function(d, i){
                    return i+1<data.length ? data[i+1].time>time : true
                })

                // sell if no recent data
                if( data.length<10 ){
                    return {
                        symbol: symbol,
                        action: "sell",
                        trend: "side",
                        score: 0
                    } as Decision
                }

                if(!trendWatcher){
                    trendWatcher = new helper.TrendWatcher(
                        symbol.baseAsset,
                        data,
                        this.timeInterval
                    )
                }
                this.trendWatchers[symbol.baseAsset] = trendWatcher

                // missing candle
                const timeDiff = (time-data[index].time)
                if( timeDiff>this.timeInterval*1.1 ){
                    return undefined
                }

                const high = data.reduce((a,b)=>Math.max(a,b.price), Number.NEGATIVE_INFINITY)
                const low = data.reduce((a,b)=>Math.min(a,b.price), Number.POSITIVE_INFINITY)

                if( this.blackList.has(symbol.baseAsset) )
                    return {
                        symbol: symbol,
                        action: "sell",
                        trend: "side",
                        score: 0
                    } as Decision


                if( trendWatcher.data.length>2 ){
                    let [action, trend] = this.getAction(symbol.baseAsset, trendWatcher, index)

                    return {
                        symbol: symbol,
                        price: trendWatcher.data[index].price,
                        index: index,
                        action: action,
                        trend: trend,
                        score: this.scoreDecision( trendWatcher, index, trader.performanceTracker.balance(symbol.symbol, this.getRecentPrice(symbol.symbol, time)) )
                    } as Decision
                }
            }catch(e){
                this.logger.error(e)
            }

            return undefined
        }

        private exchangeInfoCache?: com.danborutori.cryptoApi.ExchangeInfoResponse
        private async performTrade( mockTime?: number ){
            const isMock = mockTime!==undefined
            const now = mockTime===undefined?new Date():new Date( mockTime )

            this.logger.log("=================================")
            this.logger.log(`Execution Log ${now}`)
            this.logger.log(`delta: ${(now.getTime()-helper.snapTime(now.getTime(),this.timeInterval))/1000}s`)
            this.logger.log("=================================")

            const exchangeInfo = isMock && this.exchangeInfoCache ? this.exchangeInfoCache : await this.binance.getExchangeInfo()
            this.exchangeInfoCache = exchangeInfo
            if( !isMock )
                this.updateWhiteList(exchangeInfo)

            const whiteSymbols = new Set(Array.from(this.whiteList).map(asset=>`${asset}${this.homingAsset}`))

            isMock || await this.priceTracker.update(this.interval, whiteSymbols)

            
            let symbols = exchangeInfo.symbols
            symbols = symbols.filter(s=>{
                return s.quoteAsset == this.homingAsset &&
                        this.whiteList.has(s.baseAsset)
            })

            const decisions = symbols.map( symbol => {
                return this.makeDecision(this.trader, symbol, now.getTime(), isMock)
            }).filter(a=>a)

            const tradeHelper = new helper.TradeHelper(this.trader, this.binance)

            const balances = await this.trader.getBalances()
            await Promise.all(decisions.map(async decision=>{
                switch(decision.action){
                case "sell":
                    const quantity = balances[decision.symbol.baseAsset] || 0
                    if( quantity>0 )
                        try{
                            const response = await tradeHelper.sell(decision.symbol, decision.price, quantity, isMock?decision.price:undefined)
                            if( response.quantity!=0 ){
                                this.tradeHistory.sell(decision.symbol.baseAsset, this.homingAsset, decision.price, quantity, response.price, response.quantity, now )
                                this.trader.performanceTracker.sell( `${decision.symbol.baseAsset}${this.homingAsset}`, response.price, response.quantity )
                            }else{
                                this.logger.warn(new Error(`zero quality selling ${decision.symbol.baseAsset} at ${decision.price} quality ${quantity} fail. time ${now.toString()}`))
                            }
                        }catch(e){
                            this.logger.error(e)
                        }
                    break
                }
            }))

            const homingTotal = this.getHomingTotal(balances, now.getTime())
            let buyDecisions = decisions.filter(function(a){ return a.action=="buy"}).sort(function(a,b){
                const c = b.score-a.score
                if( c!=0 )
                    return c
                else
                    return Math.random() //shuffle
            })
            const availableHomingAsset = Math.max(0,((await this.trader.getBalances())[this.homingAsset] || 0)-this.holdingBalance)
            const maxAllocation = Math.min(
                (homingTotal-this.holdingBalance)*this.maxAllocation,
                this.maxAbsoluteAllocation
            )
            const maxOrder = Math.max(0,Math.floor(maxAllocation/this.minimumOrderQuantity))
            if( buyDecisions.length>maxOrder ){
                for( let i=maxOrder; i<buyDecisions.length; i++ ){
                    const decision = buyDecisions[i]
                    this.tradeHistory.wannaBuy(decision.symbol.baseAsset, this.homingAsset, decision.price, 0, now )
                }
                buyDecisions.length = maxOrder
            }
            const averageHomingAsset = Math.min(availableHomingAsset/buyDecisions.length, maxAllocation)

            await Promise.all( buyDecisions.map(async decision=>{
                let quantity = averageHomingAsset/decision.price
                const newAmount = ((balances[decision.symbol.baseAsset] || 0)+quantity)*decision.price                
                const minQuantity =  (getMinQty(decision.symbol) || this.minimumOrderQuantity)

                if( newAmount>maxAllocation ){
                    quantity -= (newAmount-maxAllocation)/decision.price
                }

                if( quantity>minQuantity )
                    try{
                        const response = await tradeHelper.buy(decision.symbol, decision.price,  quantity, isMock?decision.price:undefined )
                        if( response.quantity!=0 ){
                            this.tradeHistory.buy(decision.symbol.baseAsset, this.homingAsset, decision.price, quantity, response.price, response.quantity, now )
                            this.trader.performanceTracker.buy( decision.symbol.symbol, response.price, response.quantity )
                        }
                    }catch(e){
                        this.logger.error(e)
                    }
                else{
                    this.tradeHistory.wannaBuy(decision.symbol.baseAsset, this.homingAsset, decision.price, quantity, now )
                }
            }))

            if( !isMock ){
                this.trader.performanceTracker.save()
                this.tradeHistory.save()
            }else{
                this.logTrader(now.getTime())
            }

            {
                const balances = await this.trader.getBalances()
                this.logger.log(`balance: ${JSON.stringify(balances, null, 2)}`)

                const homingTotal = this.getHomingTotal(balances, now.getTime())
                this.balanceTracker.add(homingTotal, now.getTime())

                this.logger.log(`Total in ${this.homingAsset}: ${homingTotal}`)
                this.logger.log("*****")
            }
            if( !isMock )this.balanceTracker.save()
            this.logger.log("=================================")
        }

        private logTrader( time: number ){
            this.logger.log("*****")
            this.logger.log( "Log" )
            this.logger.log("*****")
            for( let symbol in this.tradeHistory.history ){
                this.logger.log("======")
                this.logger.log(symbol)
                const rs = this.tradeHistory.history[symbol]
                for( let r of rs ){
                    this.logger.log( `${r.side} price: ${r.price}(${r.actualPrice}) quantity: ${r.quantity}(${r.actualQuantity}) at ${new Date(r.time).toString()}` )
                }
                this.logger.log("======")
            }
        }
   }

}