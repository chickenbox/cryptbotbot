namespace bot {

    export interface Trader {
        buy( baseAsset: string, quoteAsset: string, closePrice: number, ratio: number )
        sell( baseAsset: string, quoteAsset: string, closePrice: number )
    }

    interface Record {
        time: Date
        action: "buy" | "sell"
        price: number
    }

    export class MockTrader implements Trader {
        private records: {[key:string]: Record[]} = {}

        private balances: {[key: string]: number} = {USDT: 1}

        private _buy( baseAsset: string, quoteAsset: string, closePrice: number, ratio: number, recordCallback: ()=>void ){

            const balance = this.balances[quoteAsset] || 0

            if( balance > 0 ){
                recordCallback()

                this.balances[baseAsset] = (this.balances[baseAsset] || 0)+(balance*ratio)/closePrice 
                this.balances[quoteAsset] = balance*(1-ratio)
            }
        }


        buy( baseAsset: string, quoteAsset: string, closePrice: number, ratio: number ){
            this._buy(baseAsset, quoteAsset, closePrice, ratio, ()=>{
                const records = this.records[baseAsset] || (this.records[baseAsset] = [])

                records.push({
                    time: new Date(),
                    action: "buy",
                    price: closePrice
                })
            })
        }

        sell( baseAsset: string, quoteAsset: string, closePrice: number ){
            this._buy( quoteAsset, baseAsset, 1/closePrice, 1, ()=>{
                const records = this.records[baseAsset] || (this.records[baseAsset] = [])

                records.push({
                    time: new Date(),
                    action: "sell",
                    price: closePrice
                })
            })
        }

        printLog( logger: (message:string)=>void, homingAsset: string, currentPrices: {[key: string]: number}){
            logger("*****")
            logger( "Log" )
            logger("*****")
            for( let baseAsset in this.records ){
                logger("======")
                logger(baseAsset)
                const rs = this.records[baseAsset]
                for( let r of rs ){
                    logger( `${r.action} price: ${r.price} at ${r.time.toString()}` )
                }
                logger("======")
            }
            logger(`balance: ${JSON.stringify(this.balances, null, 2)}`)

            let homingTotal = this.balances[homingAsset]
            for( let b in this.balances ){
                let currentPrice = currentPrices[b]
                if( currentPrice!==undefined ){
                    homingTotal += this.balances[b]*currentPrice
                }
            }

            logger(`Total in ${homingAsset}: ${homingTotal}`)
            logger("*****")
        }
    }

}