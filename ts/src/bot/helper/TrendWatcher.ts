namespace bot { export namespace helper {
    interface DataEntry {
        readonly price: number
        readonly time: number
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

    function differentiate( arr: number[] ){
        return arr.map(function(a,i){
            return i>0 ? a-arr[i-1] : 0
        })
    }

    export class TrendWatcher {

        data: DataEntry[]
        ma1: number[]
        ma2: number[]
        ma3: number[]

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
            this.ma2 = ema( this.data.map(a=>a.price), this.smoothItr*2 )
            this.ma3 = ema( this.data.map(a=>a.price), Math.floor( this.smoothItr/2 ))
        }
    }

}}