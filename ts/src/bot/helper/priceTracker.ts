namespace bot { export namespace helper {

    const pricesLocalStorageKey = "PriceTracker.prices"
    const recordLimit = 10000

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

        async update(){

            const time = Date.now()
            const prices = await this.binance.getSymbolPriceTicker()

            for( let price of prices ){
                const records = this.prices[price.symbol] || (this.prices[price.symbol] = [])
                records.push({
                    time: time,
                    price: parseFloat(price.price)
                })

                if(records.length>recordLimit){
                    records.splice(records.length-recordLimit)
                }
            }

            localStorage.setItem( pricesLocalStorageKey, JSON.stringify(this.prices, null, 2) )
        }

        getConstantIntervalPrice( symbol: string, interval: number ){

            const prices = this.prices[symbol] || []

            if( prices.length>0 ){

                const startTime = snapTime( prices[0].time, interval )
                const endTime = snapTime( prices[prices.length-1].time, interval )

                const recordLen = (endTime-startTime)/interval

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
                    const mix = (priceA.time-rt)/td
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