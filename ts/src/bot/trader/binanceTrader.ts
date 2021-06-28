namespace bot { export namespace trader {

    function convertResponse( response: com.danborutori.cryptoApi.NewOrderFullResponse ){
        let price = 0
        let quantity = 0
        if( response.fills ){
            for( let f of response.fills ){
                const qty = parseFloat( f.qty )
                price += parseFloat( f.price )*qty
                quantity += qty
            }
        }
        return {
            price: quantity!=0?price/quantity:0,
            quantity: quantity
        }
    }

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
            return convertResponse(response)
        }

        async sell( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ) {
            const response = await this.binance.newOrder( `${baseAsset}${quoteAsset}`, "SELL", quantity )
            return convertResponse(response)
        }
    }

}}