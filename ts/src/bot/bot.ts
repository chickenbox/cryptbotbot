namespace bot {

    function sleep( second: number ){
        return new Promise<void>( (resolve, reject)=>{
            setTimeout(function(){
                resolve()
            }, second*1000)
        })
    }

    class Logger {

        private logs: {
            time: string
            tag: string
            message: any
        }[] = []
        private timeout: number

        constructor(
            readonly logLength: number
        ){
            const s = localStorage.getItem(logLocalStorageKey)
            if( s )
                this.logs = JSON.parse(s)
        }

        writeLog( message: any, tag: string ){

            this.logs.push({
                time: new Date().toString(),
                tag: tag,
                message: message
            })

            if( this.logs.length>this.logLength ){
                this.logs = this.logs.slice(this.logs.length-this.logLength)
            }

            if(this.timeout){
                clearTimeout( this.timeout)
                this.timeout = undefined
            }

            this.timeout = setTimeout(()=>{
                localStorage.setItem(logLocalStorageKey, JSON.stringify(this.logs,null,2))
            }, 10)
        }

        log( message: any ){
            if( typeof(message) == "string" ) {
                console.log( message )

                this.writeLog(message, "v")
            }else{
                console.log( JSON.stringify( message, null, 2 ) )

                this.writeLog(message, "v")
            }
        }

        error( e: Error ){
            console.error(e)
            this.writeLog( e,"e")
        }
    }

    interface Decision {
        baseAsset: string
        price: number
        action: "buy" | "sell" | "none"
        score: number
    }

    const recentPricesLocalStorageKey = "Bot.recentPrices"
    const logLocalStorageKey = "Bot.log"

    export class Bot {
        private binance: com.danborutori.cryptoApi.Binance
        readonly homingAsset: string
        private interval: com.danborutori.cryptoApi.Interval
        private minHLRation: number
        private smoothAmount: number
        private maxAllocation: number
        private holdingBalance: number
        private minimumOrderQuantity: number // in homingAsset
        private whiteList: Set<string>
        private trader = new trader.MockTrader()
        readonly tradeHistory = new trader.History()
        private recentPrices: {[key:string]: number} = function(){
            const s = localStorage.getItem(recentPricesLocalStorageKey)
            if( s )
                return JSON.parse(s)

            return {}
        }()
        readonly trendWatchers: {[asset: string]: helper.TrendWatcher} = {}
        private logger: Logger
        
        readonly allow = {
            buy: true,
            sell: true
        }

        get log(){
            return localStorage.getItem(logLocalStorageKey)
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

        private getHomingTotal( balances: {[key:string]:number} ){
            let homingTotal = balances[this.homingAsset]
            for( let b in balances ){
                let currentPrice = this.recentPrices[b]
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
                apiKey: string
                apiSecure: string
            }
        ){
            this.binance = new com.danborutori.cryptoApi.Binance(config.apiKey, config.apiSecure)
            this.homingAsset = config.homingAsset
            this.interval = config.interval
            this.minHLRation = config.minHLRation
            this.smoothAmount = config.smoothAmount
            this.maxAllocation = config.maxAllocation
            this.holdingBalance = config.holdingBalance
            this.minimumOrderQuantity = config.minimumOrderQuantity
            this.whiteList = new Set(config.whiteList)
            this.logger = new Logger(config.logLength)
        }

        run(){
            try{
                this.performTrade()
            }catch(e){
                this.logger.error(e)
            }
            setInterval(()=>{
                try{
                    this.performTrade()
                }catch(e){
                    this.logger.error(e)
                }
            }, this.timeInterval)
        }

        private async makeDecision( symbol: {baseAsset: string, symbol: string }){
            if( symbol.baseAsset==this.homingAsset ) return undefined

            try{
                const data = await this.binance.getKlineCandlestickData(
                    symbol.symbol,
                    this.interval,
                    {
                        startTime: Date.now()-1000*60*60*24*2,
                        endTime: Date.now()
                    })

                // sell if not recent data
                if( data.length<10 ){
                    return {
                        baseAsset: symbol.baseAsset,
                        price: this.recentPrices[symbol.baseAsset],
                        action: "sell",
                        score: 0
                    } as Decision
                }

                // missing candle
                if( Date.now()-data[data.length-1].closeTime.getTime()>this.timeInterval+5000 ){
                    return undefined
                }

                const high = data.reduce((a,b)=>Math.max(a,b.high), Number.NEGATIVE_INFINITY)
                const low = data.reduce((a,b)=>Math.min(a,b.low), Number.POSITIVE_INFINITY)

                if( high/low <= this.minHLRation )
                    return {
                        baseAsset: symbol.baseAsset,
                        price: this.recentPrices[symbol.baseAsset],
                        action: "sell",
                        score: 0
                    } as Decision

                const trendWatcher = await helper.TrendWatcher.create(
                    symbol.baseAsset,
                    data.map(d=>{
                        return {
                            price: d.close,
                            time: d.closeTime,
                            open: d.openTime,
                            close: d.closeTime
                        }
                    }),
                    this.smoothAmount,
                    1
                )

                this.trendWatchers[symbol.baseAsset] = trendWatcher

                if( trendWatcher.data.length>2 ){
                    const lastIdx = trendWatcher.data.length-1
                    const secLastIdx = trendWatcher.data.length-2
                    this.recentPrices[symbol.baseAsset] = data[data.length-1].close

                    let action = "none"
                    const blendLimit = 0.01

                    if( trendWatcher.dDataDDt[lastIdx]>Math.abs(trendWatcher.dDataDt[secLastIdx])*blendLimit ){
                        if( this.allow.buy)
                            action = "buy"
                    }else{
                        if( trendWatcher.dDataDDt[lastIdx]<-Math.abs(trendWatcher.dDataDt[secLastIdx])*blendLimit )
                            if( this.allow.sell)
                                action = "sell"
                    }

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
            this.logger.log("=================================")

            const exchangeInfo = await this.binance.getExchangeInfo()
            
            let symbols = exchangeInfo.symbols
            symbols = symbols.filter(s=>{
                return s.quoteAsset == this.homingAsset &&
                        this.whiteList.has(s.baseAsset)
            })

            const decisions = (await Promise.all(symbols.map( symbol => {

                return this.makeDecision(symbol)
            }))).filter(a=>a)

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

            this.saveRecentPrices()

            await this.logTrader()
            this.logger.log("=================================")
        }

        private saveRecentPrices(){

            localStorage.setItem( recentPricesLocalStorageKey, JSON.stringify( this.recentPrices ) )

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