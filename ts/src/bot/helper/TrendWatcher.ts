namespace bot { export namespace helper {
    interface DataEntry {
        readonly price: number
        readonly time: Date
        readonly open: Date
        readonly close: Date
    }

    function downSample( data: DataEntry[], amount: number ){ 

        const downSampled: DataEntry[] = []

        for( let i=0; i<data.length; i+=amount ){
            const end = Math.min(i+amount,data.length)
            let price = 0
            let time = 0
            for( let j=i; j<end; j++ ){
                const d = data[j]
                price += d.price
                time += d.time.getTime()
            }
            price /= end-i
            time /= end-i

            downSampled.push({
                price: price,
                time: new Date(time),
                open: data[i].open,
                close: data[end-1].close
            })
        }

        return downSampled
    }

    function normalizeData( data: DataEntry[] ){
        if( data.length>0 ){
            const min = data.reduce( (a,b)=>Math.min(a, b.price), data[0].price )
            const max = data.reduce( (a,b)=>Math.max(a, b.price), data[0].price )

            return data.map( d=>{
                return {
                    price: (d.price-min)/(max-min),
                    time: d.time,
                    open: d.open,
                    close: d.close
                }
            })
        }else{
            return data
        }

    }

    function smoothData( baseAsset: string, data: DataEntry[], iteration: number ){

        const smoothedData = data.map(function(d, idx){
            const start = Math.max(0,idx-iteration+1)
            let price = 0
            let weight = 1
            let totalWeight = 0
            for( let i=start; i<=idx; i++ ){
                price += data[i].price*weight
                totalWeight += weight
                weight *= 2
            }

            return {
                price: price/totalWeight,
                time: d.time,
                open: d.open,
                close: d.close
            }
        })

        return smoothedData
    }

    function dDataDT( data: number[] ){
        return data.map( (d,i,arr)=>{
            let dd = 0
            let cnt = 0
            if( i>0){
                dd += d-data[i-1]
                cnt++
            }
            if( i+1<data.length ){
                dd += data[i+1]-d
                cnt++
            }
            return cnt!=0?dd/cnt:0
        })
    }

    export class TrendWatcher {

        private _rawData: DataEntry[]
        data: DataEntry[]
        normalized: {
            data: DataEntry[]
            smoothedData: DataEntry[]
        }
        dDataDt: number[]
        dDataDDt: number[]

        get high(){
            return this.data.reduce((a,b)=>Math.max(a,b.price), Number.MIN_VALUE)
        }

        get low(){
            return this.data.reduce((a,b)=>Math.min(a,b.price), Number.MAX_VALUE)
        }

        private _downSampling: number
        get downSampling(){
            return this._downSampling
        }
        set downSampling( n: number ){
            if( this._downSampling!=n ){
                this._downSampling = n
                this.resampling()
            }
        }

        static async create(
            baseAsset: string,
            data: DataEntry[],
            smoothItr: number = 0,
            downSample: number
        ){
            const t = new TrendWatcher(baseAsset, data, smoothItr, downSample)

            t.resampling()

            return t
        }

        private constructor(
            readonly baseAsset: string,
            data: DataEntry[],
            readonly smoothItr: number = 0,
            downSample: number
        ){
            this._downSampling = downSample
            this._rawData = data
        }

        private resampling(){
            const data = downSample(this._rawData, this._downSampling)
            this.data = data
            const normalizedData = normalizeData(data)
            this.normalized = {
                data: normalizedData,
                smoothedData: smoothData( this.baseAsset, normalizedData, this.smoothItr )
            }

            this.dDataDt = dDataDT(this.normalized.smoothedData.map(d=>d.price))
            this.dDataDDt = dDataDT(this.dDataDt)
        }

        get lastDDataDt(){
            if( this.dDataDt.length>0 )
                return this.dDataDt[this.dDataDt.length-1]
        }
    }

}}