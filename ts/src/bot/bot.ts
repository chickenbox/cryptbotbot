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
    }

    const recentPricesLocalStorageKey = "Bot.recentPrices"
    const logLocalStorageKey = "Bot.log"

    export class Bot {
        private binance: com.danborutori.cryptoApi.Binance
        private homingAsset: string
        private interval: com.danborutori.cryptoApi.Interval
        private minHLRation: number
        private smoothAmount: number
        private maxAllocation: number
        private holdingBalance: number
        private minimumOrderQuantity: number // in homingAsset
        private trader = new trader.MockTrader()
        private recentPrices: {[key:string]: number} = function(){
            const s = localStorage.getItem(recentPricesLocalStorageKey)
            if( s )
                return JSON.parse(s)

            return {}
        }()
        private logger: Logger
        
        readonly allow = {
            buy: true,
            sell: true
        }

        get log(){
            return localStorage.getItem(logLocalStorageKey)
        }

        private get timeInterval() {
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
                    this.interval)

                const high = data.reduce((a,b)=>Math.max(a,b.high), Number.NEGATIVE_INFINITY)
                const low = data.reduce((a,b)=>Math.min(a,b.low), Number.POSITIVE_INFINITY)

                if( high/low <= this.minHLRation )
                    return undefined

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

                if( trendWatcher.data.length>2 ){

                    const lastIdx = trendWatcher.data.length-1
                    const secLastIdx = trendWatcher.data.length-2
                    
                    let valley = false
                    let localPeak = false
                    let dropping = false
                    let peak = false

                    if( trendWatcher.dDataDt[secLastIdx]<0 && trendWatcher.dDataDt[lastIdx]>=0 ){
                        valley = true
                    }
                    if( trendWatcher.data[secLastIdx].price<trendWatcher.data[lastIdx].price){
                        localPeak = true
                    }
                    if( trendWatcher.dDataDt[secLastIdx]>0 && trendWatcher.dDataDt[lastIdx]<=0 ){
                        peak = true
                    }
                    if( trendWatcher.dDataDt[lastIdx]<0 ){
                        dropping = true
                    }

                    this.recentPrices[symbol.baseAsset] = data[data.length-1].close

                    let action = "none"

                    if( valley && !localPeak ){
                        

                        if( this.allow.buy)
                            action = "buy"
                    }else{
                        if( dropping || peak )
                            if( this.allow.sell)
                                action = "sell"
                    }

                    return {
                        baseAsset: symbol.baseAsset,
                        price: trendWatcher.data[lastIdx].price,
                        action: action
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
                        !(s.baseAsset.endsWith("DOWN") || s.baseAsset.endsWith("UP"))
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
                            await sleep(0.1)
                        }catch(e){
                            this.logger.error(e)
                        }
                    break
                }
            }

            const homingTotal = this.getHomingTotal(balances)
            const toBuyCnt = decisions.reduce((a,b)=>a+(b.action=="buy"?1:0),0)
            const availableHomingAsset = Math.max(0,((await this.trader.getBalances())[this.homingAsset] || 0)-this.holdingBalance)
            const maxAllocation = (homingTotal-this.holdingBalance)*this.maxAllocation
            const averageHomingAsset = Math.min(availableHomingAsset/toBuyCnt, maxAllocation)

            for( let decision of decisions ){
                switch(decision.action){
                case "buy":
                    let quantity = averageHomingAsset/decision.price

                    const newAmount = (balances[decision.baseAsset]+quantity)*decision.price
                    const minQuantity = this.minimumOrderQuantity/decision.price

                    if( newAmount>maxAllocation ){
                        quantity -= (newAmount-maxAllocation)/decision.price
                    }

                    if( quantity>minQuantity )
                        try{
                            await this.trader.buy(decision.baseAsset, this.homingAsset, decision.price, quantity )
                            await sleep(0.1)
                        }catch(e){
                            this.logger.error(e)
                        }
                    break
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
            for( let baseAsset in this.trader.history ){
                this.logger.log("======")
                this.logger.log(baseAsset)
                const rs = this.trader.history[baseAsset]
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