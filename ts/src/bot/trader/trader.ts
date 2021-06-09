namespace bot { export namespace trader {

    const recordLimit = 100

    export abstract class Trader {
        readonly history: {[symbol:string]:{
            price: number
            quantity: number
            side: "buy" | "sell"
            time: Date
        }[]} = {}

        abstract getBalances(): Promise<{[asset: string]: number}>

        async buy( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ){
            const symbol = `${baseAsset}${quoteAsset}`
            const h = this.history[symbol] || (this.history[symbol] = []) 
            h.push({
                price: closePrice,
                quantity: quantity,
                side: "buy",
                time: new Date()
            })
            if(h.length>recordLimit)
                this.history[symbol] = h.slice(h.length-recordLimit)
        }

        async sell( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ){
            const symbol = `${baseAsset}${quoteAsset}`
            const h = this.history[symbol] || (this.history[symbol] = []) 
            h.push({
                price: closePrice,
                quantity: quantity,
                side: "sell",
                time: new Date()
            })
            if(h.length>recordLimit)
                this.history[symbol] = h.slice(h.length-recordLimit)
        }
    }

}}