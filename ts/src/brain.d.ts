declare const brain: {
    readonly NeuralNetwork: {
        new (config?: {
            binaryThresh?: number
            hiddenLayers?: number[] // array of ints for the sizes of the hidden layers in the network
            activation?: 'sigmoid' | 'relu' | 'leaky-relu' | 'tanh' // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh'],
            leakyReluAlpha?: number
        }): NeuralNetwork
    }
}

interface NeuralNetworkTrainConfiguration {
    iterations?: number // the maximum times to iterate the training data --> number greater than 0
    errorThresh?: number // the acceptable error percentage from training data --> number between 0 and 1
    log?: boolean // true to use console.log, when a function is supplied it is used --> Either true or a function
    logPeriod?: number // iterations between logging out --> number greater than 0
    learningRate?: number // scales with delta to effect training rate --> number between 0 and 1
    momentum?: number // scales with next layer's change value --> number between 0 and 1
    callback?: Function // a periodic call back that can be triggered while training --> null or function
    callbackPeriod?: number // the number of iterations through the training data between callback calls --> number greater than 0
    timeout?: number // the max number of milliseconds to train for --> number greater than 0
    keepNetworkIntact?: boolean
  }

interface NeuralNetworkTrainStatus {
    readonly error: number
    readonly interations: number
}

interface NeuralNetworkTrainData {
    readonly input: number[]
    readonly output: number[]
}

interface NeuralNetwork{
    train( data: NeuralNetworkTrainData[], options?: NeuralNetworkTrainConfiguration ): NeuralNetworkTrainStatus

    // trainAsync( data: NeuralNetworkTrainData[], options?: NeuralNetworkTrainConfiguration ): Promise<NeuralNetworkTrainStatus>

    run( data: number[] ): number[]

    toJSON(): any
    fromJSON(json:any)
}