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
            time: number
        }[]} = {}

        readonly openedOrderIds: {symbol: string, orderId: number}[] = []

        get history(){
            return this._history
        }

        constructor(){
            this.load()
        }

        getLastTradeInPrice( symbol: string, outInfo?: {
            earliestBuyTime: number
        } ): number | undefined{
            const hs = this._history[symbol]
            if( hs ){
                let price = 0
                let qty = 0
                for( let i=hs.length-1; i>=0; i-- ){
                    const h = hs[i]
                    if( h.side=="buy"){
                        price += h.actualPrice*h.actualQuantity
                        qty += h.actualQuantity
                        outInfo && (outInfo.earliestBuyTime = h.time)
                    }else if(h.side=="sell"){
                        break
                    }
                }
                return price/qty
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

        sell( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number, actualPrice: number, actualQuantity: number, time: Date ){
            const symbol = `${baseAsset}${quoteAsset}`
            const h = this.history[symbol] || (this.history[symbol] = []) 
            h.push({
                price: closePrice,
                quantity: quantity,
                actualPrice: actualPrice,
                actualQuantity: actualQuantity,
                side: "sell",
                time: time?time.getTime():Date.now()
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
            s = localStorage.getItem(localStorageKey+".openedOrderIds")
            if( s ){
                this.openedOrderIds.length = 0
                for( let id of JSON.parse(s) as [] || [])
                    this.openedOrderIds.push(id)
            }
        }

        save(){
            localStorage.setItem( localStorageKey, JSON.stringify(this._history,null,2) )
            localStorage.setItem( localStorageKey+".openedOrderIds", JSON.stringify(this.openedOrderIds,null,2) )
        }
    }

}}