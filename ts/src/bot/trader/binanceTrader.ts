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

    function fixPrecision( n: number, precision: number ){
        return parseFloat( n.toPrecision(precision) )
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

        async buy( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number ) {
            try{
                const response = await this.binance.newOrder( symbol.symbol, "BUY", undefined, fixPrecision( quantity*closePrice, symbol.quoteAssetPrecision))
                return convertResponse(response)
            }catch(e){
                console.error(e)
            }
            return {
                price: 0,
                quantity: 0
            }
        }

        async sell( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number ) {
            try{
                const response = await this.binance.newOrder( symbol.symbol, "SELL", fixPrecision( quantity, symbol.baseAssetPrecision ))
                return convertResponse(response)
            }catch(e){
                console.error(e)
            }
            return {
                price: 0,
                quantity: 0
            }
        }
    }

}}