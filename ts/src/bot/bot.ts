namespace bot {

    function sleep( second: number ){
        return new Promise<void>( (resolve, reject)=>{
            setTimeout(function(){
                resolve()
            }, second*1000)
        })
    }

    type Action = "buy" | "sell" | "none"

    interface Decision {
        symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol
        price: number
        action: Action
        score: number
    }

    function getMinQty( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol ): number | undefined {
        const f = symbol.filters.find(function(f){return f.filterType=="LOT_SIZE"}) as com.danborutori.cryptoApi.FilterLotSize
        if( f ){
            return parseFloat( f.minQty )
        }
    }

    export class Bot {
        private binance: com.danborutori.cryptoApi.Binance
        readonly homingAsset: string
        private interval: com.danborutori.cryptoApi.Interval
        private minHLRation: number
        private smoothAmount: number
        private maxAllocation: number
        private holdingBalance: number
        private minimumOrderQuantity: number // in homingAsset
        private mockRun: boolean
        private whiteList: Set<string>
        private priceTracker: helper.PriceTracker
        readonly balanceTracker: helper.BalanceTracker
        readonly performanceTracker: helper.PerformanceTracker
        private trader: trader.Trader
        readonly tradeHistory = new trader.History()
        readonly trendWatchers: {[asset: string]: helper.TrendWatcher} = {}
        readonly cooldownHelper = new helper.CoolDownHelper()
        private logger: helper.Logger
        
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
                minHLRation: number
                smoothAmount: number
                maxAllocation: number
                logLength: number
                holdingBalance: number
                minimumOrderQuantity: number
                whiteList: string[]
                mockRun: boolean
                apiKey: string
                apiSecure: string
                environment: com.danborutori.cryptoApi.Environment
                trader: "BINANCE" | "MOCK"
            }
        ){
            this.binance = new com.danborutori.cryptoApi.Binance(config.apiKey, config.apiSecure, config.environment)
            switch( config.trader ){
            case "BINANCE":
                this.trader = new trader.BinanceTrader(this.binance)
                break
            default:
                this.trader = new trader.MockTrader(this.binance)
                break
            }
            this.priceTracker = new helper.PriceTracker(this.binance)
            this.balanceTracker = new helper.BalanceTracker()
            this.performanceTracker = new helper.PerformanceTracker()
            this.homingAsset = config.homingAsset
            this.interval = config.interval
            this.minHLRation = config.minHLRation
            this.smoothAmount = config.smoothAmount
            this.maxAllocation = config.maxAllocation
            this.holdingBalance = config.holdingBalance
            this.minimumOrderQuantity = config.minimumOrderQuantity
            this.whiteList = new Set(config.whiteList)
            this.mockRun = config.mockRun
            this.logger = new  helper.Logger(config.logLength)
        }

        async run(){

            if( this.mockRun ){
                let end = 0
                for( let t in this.priceTracker.prices ){
                    const p = this.priceTracker.prices[t]
                    end = Math.max(end, p[p.length-1].time)
                }

                end = helper.snapTime( end, this.timeInterval )
                const start = helper.snapTime( end-1000*60*60*24*7, this.timeInterval )

                this.logger.log("Start Mock")
                for( let t=start; t<end; t+=this.timeInterval ){
                    this.logger.log(`Mocking: ${new Date(t).toUTCString()}`)
                    await this.performTrade( t )
                }
                this.logger.log("End Mock")
            }

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

        getAction( baseAsset: string, trendWatcher: helper.TrendWatcher, index: number ): Action{
            const data = trendWatcher.data

            let action: Action = "none"
            
            if( trendWatcher.dDataDDt[index-1]<0 && trendWatcher.dDataDDt[index]>=0 ){
                if( this.allow.buy && this.cooldownHelper.canBuy(`${baseAsset}${this.homingAsset}`, trendWatcher.data[index].time))
                    action = "buy"
            }else{
                if( trendWatcher.dDataDDt[index-1]>0 && trendWatcher.dDataDDt[index]<=0 ){
                    if( this.allow.sell)
                        action = "sell"
                }
            }
            return action
        }

        private scoreDecision( trendWatcher: helper.TrendWatcher, lastIdx: number, balance: number ){
            return new helper.DecisionScorer().score( trendWatcher, lastIdx, balance )
        }

        private makeDecision( symbol: {baseAsset: string, symbol: string }, time: number){
            if( symbol.baseAsset==this.homingAsset ) return undefined

            try{
                const data = this.priceTracker.getConstantIntervalPrice( symbol.symbol, this.timeInterval )

                const index = data.findIndex(function(d, i){
                    return i+1<data.length ? data[i+1].time>time : true
                })

                // sell if no recent data
                if( data.length<10 ){
                    return {
                        symbol: symbol,
                        action: "sell",
                        score: 0
                    } as Decision
                }

                const trendWatcher = new helper.TrendWatcher(
                    symbol.baseAsset,
                    data,
                    this.smoothAmount
                )
                this.trendWatchers[symbol.baseAsset] = trendWatcher

                // missing candle
                const timeDiff = (time-data[index].time)
                if( timeDiff>5*60*1000 ){
                    return undefined
                }

                const high = data.reduce((a,b)=>Math.max(a,b.price), Number.NEGATIVE_INFINITY)
                const low = data.reduce((a,b)=>Math.min(a,b.price), Number.POSITIVE_INFINITY)

                if( high/low <= this.minHLRation )
                    return {
                        symbol: symbol,
                        action: "sell",
                        score: 0
                    } as Decision


                if( trendWatcher.data.length>2 ){
                    let action = this.getAction(symbol.baseAsset, trendWatcher, index)

                    return {
                        symbol: symbol,
                        price: trendWatcher.data[index].price,
                        action: action,
                        score: this.scoreDecision( trendWatcher, index, this.performanceTracker.balance(symbol.symbol, this.getRecentPrice(symbol.symbol, time)) )
                    } as Decision
                }
            }catch(e){
                this.logger.error(e)
            }

            return undefined
        }

        private async performTrade( mockTime?: number ){
            const isMock = mockTime!==undefined
            const now = new Date( mockTime )

            this.logger.log("=================================")
            this.logger.log(`Execution Log ${now}`)
            this.logger.log(`delta: ${(now.getTime()-helper.snapTime(now.getTime(),this.timeInterval))/1000}s`)
            this.logger.log("=================================")

            const whiteSymbols = new Set(Array.from(this.whiteList).map(asset=>`${asset}${this.homingAsset}`))

            const [exchangeInfo, _] = await Promise.all( [
                await this.binance.getExchangeInfo(),
                mockTime || await this.priceTracker.update(this.interval, whiteSymbols)
            ])
            
            let symbols = exchangeInfo.symbols
            symbols = symbols.filter(s=>{
                return s.quoteAsset == this.homingAsset &&
                        this.whiteList.has(s.baseAsset)
            })

            const decisions = symbols.map( symbol => {
                return this.makeDecision(symbol, now.getTime() )
            }).filter(a=>a)

            const balances = await this.trader.getBalances()
            for( let decision of decisions){
                switch(decision.action){
                case "sell":
                    const quantity = balances[decision.symbol.baseAsset] || 0
                    if( quantity>0 )
                        try{
                            const response = await this.trader.sell(decision.symbol, quantity, isMock?decision.price:undefined)
                            this.tradeHistory.sell(decision.symbol.baseAsset, this.homingAsset, decision.price, quantity, response.price, response.quantity, now )
                            this.performanceTracker.sell( `${decision.symbol.baseAsset}${this.homingAsset}`, response.price, response.quantity )
                            this.cooldownHelper.sell( decision.symbol.symbol, response.price, response.quantity, now.getTime() )
                            if( !isMock )
                                await sleep(0.1)
                        }catch(e){
                            this.logger.error(e)
                        }
                    break
                }
            }

            const homingTotal = this.getHomingTotal(balances, now.getTime())
            let buyDecisions = decisions.filter(function(a){ return a.action=="buy"}).sort(function(a,b){
                return b.score-a.score
            })
            const availableHomingAsset = Math.max(0,((await this.trader.getBalances())[this.homingAsset] || 0)-this.holdingBalance)
            const maxAllocation = (homingTotal-this.holdingBalance)*this.maxAllocation
            const maxOrder = Math.max(0,Math.floor(maxAllocation/this.minimumOrderQuantity))
            if( buyDecisions.length>maxOrder ){
                for( let i=maxOrder; i<buyDecisions.length; i++ ){
                    const decision = buyDecisions[i]
                    this.tradeHistory.wannaBuy(decision.symbol.baseAsset, this.homingAsset, decision.price, 0, now )
                }
                buyDecisions.length = maxOrder
            }
            const averageHomingAsset = Math.min(availableHomingAsset/buyDecisions.length, maxAllocation)

            for( let decision of buyDecisions ){
                let quantity = averageHomingAsset/decision.price
                const newAmount = ((balances[decision.symbol.baseAsset] || 0)+quantity)*decision.price                
                const minQuantity =  (getMinQty(decision.symbol) || this.minimumOrderQuantity)

                if( newAmount>maxAllocation ){
                    quantity -= (newAmount-maxAllocation)/decision.price
                }

                if( quantity>minQuantity )
                    try{
                        const response = await this.trader.buy(decision.symbol, quantity, quantity*decision.price, isMock?decision.price:undefined )
                        this.tradeHistory.buy(decision.symbol.baseAsset, this.homingAsset, decision.price, quantity, response.price, response.quantity, now )
                        this.performanceTracker.buy( decision.symbol.symbol, response.price, response.quantity )
                        this.cooldownHelper.buy( decision.symbol.symbol, response.price, response.quantity )
                        if( !isMock )
                            await sleep(0.1)
                    }catch(e){
                        this.logger.error(e)
                    }
                else{
                    this.tradeHistory.wannaBuy(decision.symbol.baseAsset, this.homingAsset, decision.price, quantity, now )
                }
            }

            this.performanceTracker.save()

            await this.logTrader(now.getTime())
            this.logger.log("=================================")
        }

        async logTrader( time: number ){
            this.logger.log("*****")
            this.logger.log( "Log" )
            this.logger.log("*****")
            for( let symbol in this.tradeHistory.history ){
                this.logger.log("======")
                this.logger.log(symbol)
                const rs = this.tradeHistory.history[symbol]
                for( let r of rs ){
                    this.logger.log( `${r.side} price: ${r.price}(${r.actualPrice}) quantity: ${r.quantity}(${r.actualQuantity}) at ${r.time.toString()}` )
                }
                this.logger.log("======")
            }
            const balances = await this.trader.getBalances()
            this.logger.log(`balance: ${JSON.stringify(balances, null, 2)}`)

            const homingTotal = this.getHomingTotal(balances, time)
            this.balanceTracker.add(homingTotal, time)

            this.logger.log(`Total in ${this.homingAsset}: ${homingTotal}`)
            this.logger.log("*****")
        }
   }

}