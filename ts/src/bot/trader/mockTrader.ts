namespace bot { export namespace trader {

    interface Record {
        time: Date
        action: "buy" | "sell"
        price: number
        quantity: number
    }

    export class MockTrader implements Trader {
        private records: {[key:string]: Record[]} = {}

        private balances: {[key: string]: number} = {USDT: 100}

        async getBalances(){
            return this.balances
        }

        private async _buy( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number){
            this.balances[baseAsset] = (this.balances[baseAsset] || 0)+quantity
            this.balances[quoteAsset] = (this.balances[quoteAsset] || 0)-quantity*closePrice
        }


        async buy( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ){
            await this._buy(baseAsset, quoteAsset, closePrice, quantity)

            const records = this.records[baseAsset] || (this.records[baseAsset] = [])
            records.push({
                time: new Date(),
                action: "buy",
                price: closePrice,
                quantity: quantity
            })
    }

        async sell( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ){
            await this._buy( quoteAsset, baseAsset, quantity/closePrice, 1)

            const records = this.records[baseAsset] || (this.records[baseAsset] = [])
            records.push({
                time: new Date(),
                action: "sell",
                price: closePrice,
                quantity: quantity
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

}}