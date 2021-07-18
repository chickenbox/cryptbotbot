namespace bot { export namespace helper {
    interface DataEntry {
        readonly price: number
        readonly time: number
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

    export class TrendWatcher {

        data: DataEntry[]
        ma1: number[]
        ma2: number[]
        check1: number[]

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
            this.ma1 = ema( this.data.map(a=>a.price), this.smoothItr )
            this.ma2 = ma( this.data.map(a=>a.price), this.smoothItr*2 )
            this.check1 = data.map( (a,idx)=>{
                if( idx>=7 ){
                    const m1 = (data[idx-7].price+
                        data[idx-6].price+
                        data[idx-5].price+
                        data[idx-4].price)
                    const m2 = (data[idx-3].price+
                        data[idx-2].price+
                        data[idx-1].price+
                        data[idx-0].price)
                    return (m2-m1)/m1
                }
                return 0
            })
        }
    }

}}