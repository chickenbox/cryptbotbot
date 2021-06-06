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
        private trader = new MockTrader()

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
                apiKey: string,
                apiSecure: string
            }
        ){
            this.binance = new com.danborutori.cryptoApi.Binance(config.apiKey, config.apiSecure)
            this.homingAsset = config.homingAsset
            this.interval = config.interval
            this.minHLRation = config.minHLRation
        }

        run(){
            try{
                this.performTrade()
            }catch(e){
                log(e)
            }
            setInterval(()=>{
                try{
                    this.performTrade()
                }catch(e){
                    log(e)
                }
            }, this.timeInterval)
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

            const currentPrices: {[key:string]: number} = {}

            const decisions = (await Promise.all(symbols.map( async symbol => {

                if( symbol.baseAsset==this.homingAsset ) return undefined

                try{
                    const data = await this.binance.getKlineCandlestickData(
                        symbol.symbol,
                        this.interval)

                    const high = data.reduce((a,b)=>Math.max(a,b.high), Number.NEGATIVE_INFINITY)
                    const low = data.reduce((a,b)=>Math.min(a,b.low), Number.POSITIVE_INFINITY)

                    if( high/low <= this.minHLRation )
                        return undefined

                    const trendWatcher = new helper.TrendWatcher(
                        symbol.baseAsset,
                        data.map(d=>{
                            return {
                                price: d.close,
                                time: d.closeTime,
                                open: d.openTime,
                                close: d.closeTime
                            }
                        }),
                        10,
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

                        currentPrices[symbol.baseAsset] = data[data.length-1].close

                        return {
                            baseAsset: symbol.baseAsset,
                            price: trendWatcher.data[lastIdx].price,
                            action: valley ? "buy" : dropping || peak ? "sell" : "none"
                        } as Decision
                    }
                }catch(e){
                    // silent error
                }

                return undefined
            }))).filter(a=>a)

            let toBuyCnt = decisions.reduce((a,b)=>a+(b.action=="buy"?1:0),0)

            for( let decision of decisions ){
                switch(decision.action){
                case "buy":
                    this.trader.buy(decision.baseAsset, this.homingAsset, decision.price, 1/toBuyCnt )
                    toBuyCnt--
                    break
                case "sell":
                    this.trader.sell(decision.baseAsset, this.homingAsset, decision.price )
                    break
                }
            }

            this.trader.printLog(log, this.homingAsset, currentPrices)
            log("=================================")
        }

    }

}