namespace bot { export namespace helper {

    const brain = require("brain.js")
    const LocalStorage = require("node-localstorage").LocalStorage
    const localStorage = new LocalStorage('./scratch')

    export class Brain {
        constructor(
            readonly baseAsset: string,
            readonly sampleLimit,
            readonly minimumSample,
        ) {

        }

        async predict( data: number[], lookback: number, predict: number ){
            if( data.length>this.sampleLimit+predict+lookback ) { // limit data size
                data = data.slice(-this.sampleLimit-predict-lookback)
            }
    
            const trainingDataLen = data.length-predict-lookback
    
            const max = data.reduce((a,b)=>Math.max(a,b), Number.NEGATIVE_INFINITY)
            const min = data.reduce((a,b)=>Math.min(a,b), Number.POSITIVE_INFINITY)
            const range = max-min
            data = data.map( a=>(a-min)/range )
    
            if( trainingDataLen>=this.minimumSample ){
    
                const trainingData: NeuralNetworkTrainData[] = new Array(trainingDataLen)
                for( let i=0; i<trainingDataLen; i++ ){
                    trainingData[i] = {
                        input: data.slice(i,i+lookback),
                        output: data.slice(i+lookback,i+lookback+predict)
                    }
                }
    
                const net = new brain.NeuralNetwork()
                const key = `brain.net.${this.baseAsset}`
                let keepNetworkIntact = false

                const json = localStorage.getItem(key)
                if( json ){
                    net.fromJSON( JSON.parse(json) )
                    keepNetworkIntact = true
                }

                await net.trainAsync(trainingData)
    
                const r = net.run( data.slice( -lookback ) )
                const forecast = new Array<number>(predict);
                for( let i=0; i< predict; i++){
                    forecast[i] = r[i]*range+min
                }

                localStorage.setItem(key, JSON.stringify(net.toJSON()))
    
                return forecast
            }else{
                return []
            }
        }
    }

}}