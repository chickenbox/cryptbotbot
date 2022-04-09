namespace bot { export namespace helper {
    const candleSample = 4

    interface DataEntry {
        readonly price: number
        readonly high: number
        readonly low: number
        readonly time: number
    }

    export interface Candle {
        timeStart: number
        timeEnd: number
        high: number
        low: number
        trend: "up" | "down"
    }

    function ma( data: number[], iteration: number ){

        const smoothedData: number[] = data.map( function( d, idx ){
            let price = d
            let weight = 1 
            for( let i = Math.max(0,idx-iteration); i<idx; i++ ){
                price += data[i]
                weight++
            }

            return price/weight
        })

        return smoothedData
    }

    function ema( data: number[], iteration: number ){

        const smoothedData: number[] = new Array(data.length)
        for( let i=0; i<smoothedData.length; i++ ){
            if( i>0 ){
                const tmp = 2/(1+iteration)
                smoothedData[i] = data[i]*tmp+smoothedData[i-1]*(1-tmp)
            }else{
                smoothedData[i] = data[i]
            }
        }

        return smoothedData
    }

    function thicken( data: number[], iteration: number ){
        const smoothedData: number[] = data.map( function( d, idx ){
            let price = d
            for( let i = Math.max(0,idx-iteration); i<idx; i++ ){
                price = Math.max(price,data[i])
            }

            return price
        })
        return smoothedData
    }

    function differentiate( arr: number[] ){
        return arr.map(function(a,i){
            return i>0 ? a-arr[i-1] : 0
        })
    }

    function sign( n: number ){
        return n>=0?1:-1
    }

    export class TrendWatcher {

        data: DataEntry[]
        ma14: number[]
        ma24: number[]
        ma84: number[]
        lastCrossIndex: number[]
        ratio: number[]
        candles: Candle[] = []

        get high(){
            return this.data.reduce((a,b)=>Math.max(a,b.price), Number.MIN_VALUE)
        }

        get low(){
            return this.data.reduce((a,b)=>Math.min(a,b.price), Number.MAX_VALUE)
        }

        constructor(
            readonly baseAsset: string,
            data: DataEntry[],
            interval: number
        ){
            const smoothItr14 = 14*24*60*60*1000/interval
            this.data = data
            this.ma14 = ema( this.data.map(a=>a.price), smoothItr14 )
            this.ma24 = ma( this.data.map(a=>a.price), smoothItr14*2 )
            this.ma84 = ma( this.data.map(a=>a.price), smoothItr14*6 )
            let lastCrossIndex = 0
            this.lastCrossIndex = data.map((_, idx)=>{

                if(
                    idx>0 &&
                    sign(this.ma14[idx-1]-this.ma24[idx-1]) != sign(this.ma14[idx]-this.ma24[idx])
                ){
                    lastCrossIndex = idx
                }

                return lastCrossIndex
            })
            lastCrossIndex = 0
            this.ratio = data.map(function(a,idx){
                let high = a.price
                let low = a.price

                for( let i=Math.max(0,idx-smoothItr14); i<idx; i++ ){
                    high = Math.max(high,data[i].price)
                    low = Math.min(low,data[i].price)
                }

                return high/low
            })

            for( let i=0; i<data.length; i+=candleSample){                        
                const startIdx = i
                const endIdx = Math.min(i+candleSample,data.length)
                const lastIdx = Math.min(endIdx,data.length-1)
                let high = data[startIdx].high
                let low = data[startIdx].low
                for( let j=startIdx+1; j<endIdx; j++ ){
                    high = Math.max( high, data[j].high)
                    low = Math.min( low, data[j].low)
                }
                this.candles.push({
                    timeStart: data[startIdx].time,
                    timeEnd: data[lastIdx].time,
                    high: high,
                    low: low,
                    trend: data[startIdx].price<data[lastIdx].price?"up":"down"
                })
            }
        }
    }

}}