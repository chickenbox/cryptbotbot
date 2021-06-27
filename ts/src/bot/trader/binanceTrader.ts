namespace bot { export namespace trader {

    export class BinanceTrader extends Trader {
        constructor(
            readonly binance: com.danborutori.cryptoApi.Binance
        ){
            super()
        }

        async getBalances(): Promise<{[asset: string]: number}> {
            const balances: {[key:string]: number} = {}
            ;(await this.binance.getAccountInfo()).balances.forEach( b=>{
                balances[b.asset] = parseFloat( b.free )
            })
            return balances
        }

        async buy( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ) {
            const response = await this.binance.newOrder( `${baseAsset}${quoteAsset}`, "BUY", undefined, quantity*closePrice )
            return {
                price: parseFloat(response.price),
                quantity: parseFloat(response.executedQty)
            }
        }

        async sell( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ) {
            const response = await this.binance.newOrder( `${baseAsset}${quoteAsset}`, "SELL", quantity )
            return {
                price: parseFloat(response.price),
                quantity: parseFloat(response.executedQty)
            }
        }
    }

}}