namespace bot { export namespace trader {

    const recordLimit = 100

    export class History {
        readonly history: {[symbol:string]:{
            price: number
            quantity: number
            actualPrice: number
            actualQuantity: number
            side: "buy" | "sell" | "want to buy"
            time: Date
        }[]} = {}

        buy( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number, actualPrice: number, actualQuantity: number, time?: Date ){
            const symbol = `${baseAsset}${quoteAsset}`
            const h = this.history[symbol] || (this.history[symbol] = []) 
            h.push({
                price: closePrice,
                quantity: quantity,
                actualPrice: actualPrice,
                actualQuantity: actualQuantity,
                side: "buy",
                time: time || new Date()
            })
            if(h.length>recordLimit)
                this.history[symbol] = h.slice(h.length-recordLimit)
        }

        sell( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number, actualPrice: number, actualQuantity: number, time?: Date ){
            const symbol = `${baseAsset}${quoteAsset}`
            const h = this.history[symbol] || (this.history[symbol] = []) 
            h.push({
                price: closePrice,
                quantity: quantity,
                actualPrice: actualPrice,
                actualQuantity: actualQuantity,
                side: "sell",
                time: time || new Date()
            })
            if(h.length>recordLimit)
                this.history[symbol] = h.slice(h.length-recordLimit)
        }

        wannaBuy( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number, time?: Date ){
            const symbol = `${baseAsset}${quoteAsset}`
            const h = this.history[symbol] || (this.history[symbol] = []) 
            h.push({
                price: closePrice,
                quantity: quantity,
                actualPrice: closePrice,
                actualQuantity: quantity,
                side: "want to buy",
                time: time || new Date()
            })
            if(h.length>recordLimit)
                this.history[symbol] = h.slice(h.length-recordLimit)
        }
    }

}}