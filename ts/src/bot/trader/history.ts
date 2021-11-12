namespace bot { export namespace trader {

    const recordLimit = 100
    const localStorageKey = "bot.trader.History"

    export class History {
        private _history: {[symbol:string]:{
            price: number
            quantity: number
            actualPrice: number
            actualQuantity: number
            side: "buy" | "sell" | "want to buy"
            time: number,
            orderId?: number
        }[]} = {}

        private lastOrderId: {[symbol: string]: number} = {}

        get history(){
            return this._history
        }

        constructor(){
            this.load()
        }

        getLastOrderId( symbol: string ){
            return this.lastOrderId[symbol] || 0
        }

        setLastOrderId( symbol: string, id: number ){
            this.lastOrderId[symbol] = id
        }

        getLastTradeInPrice( symbol: string ): number | undefined{
            const hs = this._history[symbol]
            if( hs ){
                for( let i=hs.length-1; i>=0; i-- ){
                    const h = hs[i]
                    if( h.side=="buy"){
                        return h.actualPrice
                    }
                }
            }
        }

        buy( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number, actualPrice: number, actualQuantity: number, time: Date ){
            const symbol = `${baseAsset}${quoteAsset}`
            const h = this.history[symbol] || (this.history[symbol] = []) 
            h.push({
                price: closePrice,
                quantity: quantity,
                actualPrice: actualPrice,
                actualQuantity: actualQuantity,
                side: "buy",
                time: time?time.getTime():Date.now()
            })
            if(h.length>recordLimit)
                this.history[symbol] = h.slice(h.length-recordLimit)
        }

        sell( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number, actualPrice: number, actualQuantity: number, time: Date, orderId?: number ){
            const symbol = `${baseAsset}${quoteAsset}`
            const h = this.history[symbol] || (this.history[symbol] = []) 
            h.push({
                price: closePrice,
                quantity: quantity,
                actualPrice: actualPrice,
                actualQuantity: actualQuantity,
                side: "sell",
                time: time?time.getTime():Date.now(),
                orderId: orderId
            })
            if(h.length>recordLimit)
                this.history[symbol] = h.slice(h.length-recordLimit)
        }

        wannaBuy( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number, time: Date ){
            const symbol = `${baseAsset}${quoteAsset}`
            const h = this.history[symbol] || (this.history[symbol] = []) 
            h.push({
                price: closePrice,
                quantity: quantity,
                actualPrice: closePrice,
                actualQuantity: quantity,
                side: "want to buy",
                time: time?time.getTime():Date.now()
            })
            if(h.length>recordLimit)
                this.history[symbol] = h.slice(h.length-recordLimit)
        }

        private load(){
            let s = localStorage.getItem(localStorageKey)
            if( s ){
                this._history = JSON.parse(s)
            }
            s = localStorage.getItem(localStorageKey+".lastOrderId")
            if( s ){
                this.lastOrderId = JSON.parse(s) || {}
            }
        }

        save(){
            localStorage.setItem( localStorageKey, JSON.stringify(this._history,null,2) )
            localStorage.setItem( localStorageKey+".lastOrderId", JSON.stringify(this.lastOrderId,null,2) )
        }
    }

}}