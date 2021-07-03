namespace bot { export namespace helper {
    interface DataEntry {
        readonly price: number
        readonly time: number
    }

    function smoothingCurve( n: number ){
        const t = Math.pow(n,16)

        return Math.cos( (t-0.5)*Math.PI )
    }

    function smoothData( data: DataEntry[], iteration: number ){

        const smoothedData = data.map(function(d, idx){
            const start = Math.max(0,idx-iteration+1)
            let price = 0
            let totalWeight = 0
            for( let i=start; i<=idx; i++ ){
                const weight = smoothingCurve((i-start)/(idx-start))
                price += data[i].price*weight
                totalWeight += weight
            }

            return {
                price: price/totalWeight,
                time: d.time
            }
        })

        return smoothedData
    }

    function dDataDT( data: number[] ){
        return data.map( function(d,i){
            if( i>0){
                return d-data[i-1]
            }
            return 0
        })
    }

    function smooth( data: number[], amount: number ){
        return data.map( function(d,idx){
            const start = Math.max(0,idx-amount+1)
            let n = 0
            let totalWeight = 0

            for( let i=start; i<=idx; i++ ){
                const weight = smoothingCurve((i-start)/(idx-start))
                n += data[i]*weight
                totalWeight += weight
            }
            return totalWeight!=0?n/totalWeight:0
        })
    }

    export class TrendWatcher {

        data: DataEntry[]
        smoothedData: DataEntry[]
        dDataDt: number[]
        dDataDDt: number[]

        get high(){
            return this.data.reduce((a,b)=>Math.max(a,b.price), Number.MIN_VALUE)
        }

        get low(){
            return this.data.reduce((a,b)=>Math.min(a,b.price), Number.MAX_VALUE)
        }

        constructor(
            readonly baseAsset: string,
            data: DataEntry[],
            readonly smoothItr: number = 0
        ){
            this.data = data
            this.smoothedData = smoothData( this.data, this.smoothItr )

            this.dDataDt = smooth( dDataDT(this.smoothedData.map(d=>d.price)), Math.floor(this.smoothItr))
            this.dDataDDt = smooth( dDataDT(this.dDataDt), Math.floor(this.smoothItr))
        }

        isPeak( array: number[], index: number ){
            if( index>=0 && index<array.length){
                if( index-1>=0 && array[index-1]>array[index] )
                    return false
                if( index+1<array.length && array[index+1]>array[index] )
                    return false
                return true
            }
            return false
        }

        getLastPeak( index: number, endIndex: number ){
            let isPeak = false
            for( let i=index-1; i>=Math.max(0,endIndex); i-- ){
                if( this.isPeak(this.dDataDt,i) ){
                    return {
                        index: i,
                        value: this.dDataDt[i]
                    }
                }
            }
        }

        isDownTrend( index: number, range: number ){
            const lastPeak = this.getLastPeak(index, index-range)
            const lastPeak2 = lastPeak && this.getLastPeak(lastPeak.index, lastPeak.index-range)

            if( lastPeak && lastPeak2 ){
                return lastPeak.value<lastPeak2.value
            }

            return false
        }
    }

}}