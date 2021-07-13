namespace bot { export namespace helper {
    interface DataEntry {
        readonly price: number
        readonly time: number
    }

    const curveCache = new Map<number,number>()
    function smoothingCurve( n: number ){
        if( curveCache.has(n) ){
            return curveCache.get(n)
        }

        const t = Math.pow(n,16)
        const v = Math.cos( (t-0.5)*Math.PI )

        curveCache.set(n,v)

        return v
    }

    function smoothData( data: DataEntry[], iteration: number ){

        const smoothedData = data.map(function(d, idx){
            const start = Math.max(0,idx-iteration+1)
            let price = 0
            let totalWeight = 0
            if(idx!=start)
                for( let i=start; i<=idx; i++ ){
                    const weight = smoothingCurve((i-start)/(idx-start))
                    price += data[i].price*weight
                    totalWeight += weight
                }

            return {
                price: totalWeight!=0?price/totalWeight:0,
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

            if(idx!=start)
                for( let i=start; i<=idx; i++ ){
                    const weight = smoothingCurve((i-start)/(idx-start))
                    n += data[i]*weight
                    totalWeight += weight
                }
            return totalWeight!=0?n/totalWeight:0
        })
    }

    function noisyness( data: number[] ){
        return data.map( (d,index)=>{
            let noisyness = 0

            const sampleCnt = 10
            for( let i=Math.max(0,index-sampleCnt); i<index; i++ ){
                if( i-1 >= 0 )
                    noisyness += Math.abs( data[i]-data[i-1] )
            }
            noisyness /= sampleCnt

            return noisyness
        })
    }

    function mean( data: number[], range: number ){
        return data.map(function(d,index){
            let m = 0
            for( let i=Math.max(0,index-range); i<=index; i++ ){
                m += data[i]
            }
            return m/range
        })
    }

    export class TrendWatcher {

        data: DataEntry[]
        smoothedData: DataEntry[]
        dDataDt: number[]
        dDataDDt: number[]
        noisyness: number[]
        noisynessMean: number[]

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
            // this.noisyness = smooth( noisyness(data.map(d=>d.price)), Math.floor(this.smoothItr))
            this.noisyness = noisyness(data.map(d=>d.price))
            this.noisynessMean = mean(this.noisyness,this.smoothItr)
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

    }

}}