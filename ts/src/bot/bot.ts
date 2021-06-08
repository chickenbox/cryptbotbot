namespace bot {

    function log( message: any ){
        if( typeof(message) == "string" ) {
            console.log( message )
        }else{
            console.log( JSON.stringify( message, null, 2 ) )
        }
    }

    interface Decision {
        baseAsset: string
        price: number
        action: "buy" | "sell" | "none"
    }

    export class Bot {
        private binance: com.danborutori.cryptoApi.Binance
        private homingAsset: string
        private interval: com.danborutori.cryptoApi.Interval
        private minHLRation: number
        private smoothAmount: number
        private trader = new trader.MockTrader()
        private recentPrices: {[key:string]: number} = {}

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

        constructor(
            config: {
                homingAsset: string,
                interval: com.danborutori.cryptoApi.Interval,
                minHLRation: number
                smoothAmount: number
                apiKey: string,
                apiSecure: string
            }
        ){
            this.binance = new com.danborutori.cryptoApi.Binance(config.apiKey, config.apiSecure)
            this.homingAsset = config.homingAsset
            this.interval = config.interval
            this.minHLRation = config.minHLRation
            this.smoothAmount = config.smoothAmount
        }

        run(){
            try{
                this.performTrade()
            }catch(e){
                console.error(e)
            }
            setInterval(()=>{
                try{
                    this.performTrade()
                }catch(e){
                    console.error(e)
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
                    let dropping = false
                    let peak = false

                    if( trendWatcher.dDataDt[secLastIdx]<0 && trendWatcher.dDataDt[lastIdx]>=0 ){
                        valley = true
                    }
                    if( trendWatcher.dDataDt[secLastIdx]>0 && trendWatcher.dDataDt[lastIdx]<=0 ){
                        peak = true
                    }
                    if( trendWatcher.dDataDt[lastIdx]<0 ){
                        dropping = true
                    }

                    this.recentPrices[symbol.baseAsset] = data[data.length-1].close

                    return {
                        baseAsset: symbol.baseAsset,
                        price: trendWatcher.data[lastIdx].price,
                        action: valley ? "buy" : dropping || peak ? "sell" : "none"
                    } as Decision
                }
            }catch(e){
                console.error(e)
            }

            return undefined
        }

        private async performTrade(){
            log("=================================")
            log(`Execution Log ${new Date()}`)
            log("=================================")

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
            await Promise.all(decisions.map( async decision=>{
                switch(decision.action){
                case "sell":
                    const quality = balances[decision.baseAsset] || 0
                    if( quality>0 )
                        try{
                            await this.trader.sell(decision.baseAsset, this.homingAsset, decision.price, quality )
                        }catch(e){console.error(e)}
                    break
                }
            }))

            const toBuyCnt = decisions.reduce((a,b)=>a+(b.action=="buy"?1:0),0)
            const availableHomingAsset = (await this.trader.getBalances())[this.homingAsset] || 0
            const averageHomingAsset = availableHomingAsset/toBuyCnt

            await Promise.all(decisions.map( async decision=>{
                switch(decision.action){
                case "buy":
                    const quality = averageHomingAsset/decision.price
                    if( quality>0 )
                        try{
                            await this.trader.buy(decision.baseAsset, this.homingAsset, decision.price, quality )
                        }catch(e){console.error(e)}
                    break
                }
            }))

            await this.logTrader()
            log("=================================")
        }

        async logTrader(){
            log("*****")
            log( "Log" )
            log("*****")
            for( let baseAsset in this.trader.history ){
                log("======")
                log(baseAsset)
                const rs = this.trader.history[baseAsset]
                for( let r of rs ){
                    log( `${r.side} price: ${r.price} quantity: ${r.quantity} at ${r.time.toString()}` )
                }
                log("======")
            }
            const balances = await this.trader.getBalances()
            log(`balance: ${JSON.stringify(balances, null, 2)}`)

            let homingTotal = balances[this.homingAsset]
            for( let b in balances ){
                let currentPrice = this.recentPrices[b]
                if( currentPrice!==undefined ){
                    homingTotal += balances[b]*currentPrice
                }
            }

            log(`Total in ${this.homingAsset}: ${homingTotal}`)
            log("*****")
        }
   }

}