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
        baseAsset: string
        price: number
        action: Action
        score: number
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
        private trader = new trader.MockTrader()
        readonly tradeHistory = new trader.History()
        readonly trendWatchers: {[asset: string]: helper.TrendWatcher} = {}
        private logger: helper.Logger
        
        readonly allow = {
            buy: true,
            sell: true
        }

        get log(){
            return this.logger.logString
        }

        get timeInterval() {
            switch( this.interval ){
            case "1m":
                return 1000*60
            case "3m":
                return 1000*60*3
            case "5m":
                return 1000*60*5
            case "15m":
                return 1000*60*15
            case "30m":
                return 1000*60*30
            case "1h":
                return 1000*60*60
            case "2h":
                return 1000*60*60*2
            case "4h":
                return 1000*60*60*4
            case "6h":
                return 1000*60*60*6
            case "8h":
                return 1000*60*60*8
            case "12h":
                return 1000*60*60*12
            case "1d":
                return 1000*60*60*24
            case "3d":
                return 1000*60*60*24*3
            case "1w":
                return 1000*60*60*24*7
            case "1M":
                return 1000*60*60*24*30
            }
        }


        getRecentPrice( symbol: string ){
            const p = this.priceTracker.prices[symbol]
            return p && p.length>0 && p[p.length-1].price
        }

        private getHomingTotal( balances: {[key:string]:number} ){
            let homingTotal = balances[this.homingAsset]
            for( let b in balances ){
                let currentPrice = this.getRecentPrice(`${b}${this.homingAsset}`)
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
            }
        ){
            this.binance = new com.danborutori.cryptoApi.Binance(config.apiKey, config.apiSecure)
            this.priceTracker = new helper.PriceTracker(this.binance)
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
            const now = Date.now()

            try{
                try{
                    await this.performTrade()
                }catch(e){
                    this.logger.error(e)
                }
    
                if( this.mockRun ){
                    new test.TestMarker().test(this, new Date( now-1000*60*60*24*2 ))
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
            
            if( trendWatcher.dDataDt[index]<=0 && trendWatcher.dDataDt[index]+trendWatcher.dDataDDt[index]>=0 ){
                if( this.allow.buy)
                    action = "buy"
            }else{
                if( trendWatcher.dDataDt[index]+trendWatcher.dDataDDt[index]<=0 )
                    if( this.allow.sell)
                        action = "sell"
            }
            return action
        }

        private makeDecision( symbol: {baseAsset: string, symbol: string }){
            if( symbol.baseAsset==this.homingAsset ) return undefined

            try{
                const data = this.priceTracker.getConstantIntervalPrice( symbol.symbol, this.timeInterval )

                // sell if no recent data
                if( data.length<10 ){
                    return {
                        baseAsset: symbol.baseAsset,
                        price: this.getRecentPrice(symbol.symbol),
                        action: "sell",
                        score: 0
                    } as Decision
                }

                // missing candle
                const timeDiff = (Date.now()-data[data.length-1].time)-(5*60*1000)
                if( timeDiff>0 ){
                    return undefined
                }

                const high = data.reduce((a,b)=>Math.max(a,b.price), Number.NEGATIVE_INFINITY)
                const low = data.reduce((a,b)=>Math.min(a,b.price), Number.POSITIVE_INFINITY)

                if( high/low <= this.minHLRation )
                    return {
                        baseAsset: symbol.baseAsset,
                        price: this.getRecentPrice(symbol.symbol),
                        action: "sell",
                        score: 0
                    } as Decision

                const trendWatcher = new helper.TrendWatcher(
                    symbol.baseAsset,
                    data,
                    this.smoothAmount,
                    1
                )

                this.trendWatchers[symbol.baseAsset] = trendWatcher

                if( trendWatcher.data.length>2 ){
                    const lastIdx = trendWatcher.data.length-1

                    let action = this.getAction(symbol.baseAsset, trendWatcher, lastIdx)

                    return {
                        baseAsset: symbol.baseAsset,
                        price: trendWatcher.data[lastIdx].price,
                        action: action,
                        score: trendWatcher.dDataDDt[lastIdx]
                    } as Decision
                }
            }catch(e){
                this.logger.error(e)
            }

            return undefined
        }

        private async performTrade(){
            this.logger.log("=================================")
            this.logger.log(`Execution Log ${new Date()}`)
            this.logger.log(`delta: ${(Date.now()-helper.snapTime(Date.now(),this.timeInterval))/1000}s`)
            this.logger.log("=================================")

            const whiteSymbols = new Set(Array.from(this.whiteList).map(asset=>`${asset}${this.homingAsset}`))

            const [exchangeInfo, _] = await Promise.all( [
                await this.binance.getExchangeInfo(),
                await this.priceTracker.update(this.interval, whiteSymbols)
            ])
            
            let symbols = exchangeInfo.symbols
            symbols = symbols.filter(s=>{
                return s.quoteAsset == this.homingAsset &&
                        this.whiteList.has(s.baseAsset)
            })

            const decisions = symbols.map( symbol => {
                return this.makeDecision(symbol)
            }).filter(a=>a)

            const balances = await this.trader.getBalances()
            for( let decision of decisions){
                switch(decision.action){
                case "sell":
                    const quality = balances[decision.baseAsset] || 0
                    if( quality>0 )
                        try{
                            await this.trader.sell(decision.baseAsset, this.homingAsset, decision.price, quality )
                            this.tradeHistory.sell(decision.baseAsset, this.homingAsset, decision.price, quality )
                            await sleep(0.1)
                        }catch(e){
                            this.logger.error(e)
                        }
                    break
                }
            }

            const homingTotal = this.getHomingTotal(balances)
            let buyDecisions = decisions.filter(function(a){ return a.action=="buy"}).sort(function(a,b){
                return b.score-a.score
            })
            const availableHomingAsset = Math.max(0,((await this.trader.getBalances())[this.homingAsset] || 0)-this.holdingBalance)
            const maxAllocation = (homingTotal-this.holdingBalance)*this.maxAllocation
            const maxOrder = Math.max(0,Math.floor(maxAllocation/this.minimumOrderQuantity))
            if( buyDecisions.length>maxOrder ){
                for( let i=maxOrder; i<buyDecisions.length; i++ ){
                    const decision = buyDecisions[i]
                    this.tradeHistory.wannaBuy(decision.baseAsset, this.homingAsset, decision.price, 0 )
                }
                buyDecisions.length = maxOrder
            }
            const averageHomingAsset = Math.min(availableHomingAsset/buyDecisions.length, maxAllocation)

            for( let decision of buyDecisions ){
                let quantity = averageHomingAsset/decision.price

                const newAmount = ((balances[decision.baseAsset] || 0)+quantity)*decision.price
                const minQuantity = this.minimumOrderQuantity/decision.price

                if( newAmount>maxAllocation ){
                    quantity -= (newAmount-maxAllocation)/decision.price
                }

                if( quantity>minQuantity )
                    try{
                        await this.trader.buy(decision.baseAsset, this.homingAsset, decision.price, quantity )
                        this.tradeHistory.buy(decision.baseAsset, this.homingAsset, decision.price, quantity )
                        await sleep(0.1)
                    }catch(e){
                        this.logger.error(e)
                    }
                else{
                    this.tradeHistory.wannaBuy(decision.baseAsset, this.homingAsset, decision.price, quantity )
                }
            }

            await this.logTrader()
            this.logger.log("=================================")
        }

        async logTrader(){
            this.logger.log("*****")
            this.logger.log( "Log" )
            this.logger.log("*****")
            for( let baseAsset in this.tradeHistory.history ){
                this.logger.log("======")
                this.logger.log(baseAsset)
                const rs = this.tradeHistory.history[baseAsset]
                for( let r of rs ){
                    this.logger.log( `${r.side} price: ${r.price} quantity: ${r.quantity} at ${r.time.toString()}` )
                }
                this.logger.log("======")
            }
            const balances = await this.trader.getBalances()
            this.logger.log(`balance: ${JSON.stringify(balances, null, 2)}`)

            const homingTotal = this.getHomingTotal(balances)

            this.logger.log(`Total in ${this.homingAsset}: ${homingTotal}`)
            this.logger.log("*****")
        }
   }

}