namespace bot { export namespace helper {
    interface DataEntry {
        readonly price: number
        readonly time: number
    }

    function movAvg( data: DataEntry[], iteration: number ){

        const smoothedData = data.map(function(d, idx){
            const start = Math.max(0,idx-iteration+1)
            let price = 0
            let totalWeight = 0
            if(idx!=start)
                for( let i=start; i<=idx; i++ ){
                    const weight = 1
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

    export class TrendWatcher {

        data: DataEntry[]
        ma1: number[]
        ma2: number[]

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
            this.ma1 = movAvg( this.data, this.smoothItr ).map(a=>a.price)
            this.ma2 = movAvg( this.data, this.smoothItr*4 ).map(a=>a.price)
        }
    }

}}