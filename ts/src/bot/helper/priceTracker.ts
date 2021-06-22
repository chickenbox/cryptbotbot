namespace bot { export namespace helper {

    const pricesLocalStorageKey = "PriceTracker.prices"
    const recordLimit = 500

    export class PriceTracker {

        readonly prices: {[symbol: string]: {time: number, price: number}[]} = function(){
            const s = localStorage.getItem(pricesLocalStorageKey)
            if( s ){
                return JSON.parse(s)
            }
            return {}
        }()

        constructor(
            readonly binance: com.danborutori.cryptoApi.Binance
        ){}

        async update( interval: com.danborutori.cryptoApi.Interval, whiteSymbols: Set<string> ){

            const time = Date.now()
            const prices = (await this.binance.getSymbolPriceTicker()).filter(function(p){
                return whiteSymbols.has(p.symbol)
            })

            await Promise.all(prices.map(async price=>{
                try{
                    let records = this.prices[price.symbol] || (this.prices[price.symbol] = [])

                    let startTime = records.length>0 ? records[records.length-1].time : undefined

                    if( !startTime || (Date.now()-startTime)>intervalToMilliSec(interval) ){
                        const data = await this.binance.getKlineCandlestickData(
                            price.symbol,
                            interval,
                            {
                                startTime: startTime
                            })
                        for( let d of data ){
                            records.push( {
                                price: d.close,
                                time: d.closeTime.getTime()
                            } )
                        }
                    }

                    records.push({
                        time: time,
                        price: parseFloat(price.price)
                    })

                    if(records.length>recordLimit){
                        records.splice(0, records.length-recordLimit)
                    }
                }catch(e){
                    console.error(e)
                }
            }))

            localStorage.setItem( pricesLocalStorageKey, JSON.stringify(this.prices, null, 2) )
        }

        getConstantIntervalPrice( symbol: string, interval: number ){

            const prices = this.prices[symbol] || []

            if( prices.length>0 ){

                const startTime = snapTime( prices[0].time, interval )
                const endTime = snapTime( prices[prices.length-1].time, interval )

                const recordLen = (endTime-startTime)/interval+1

                const result: {time: number, price: number}[] = new Array(recordLen)
                for( let i=0; i<result.length; i++ ){

                    const rt = startTime+i*interval
                    const idxB = prices.findIndex(function(a){
                        return a.time>=rt
                    })
                    const idxA = Math.max(0,idxB-1)
                    const priceA = prices[idxA]
                    const priceB = prices[idxB]
                    const td = priceB.time-priceA.time
                    const mix = td!=0 ? (priceA.time-rt)/td : 0
                    const price = priceA.price*(1-mix)+priceB.price*mix

                    result[i] = {
                        price: price,
                        time: rt
                    }
                }
                return result
            }
        }
    }

}}