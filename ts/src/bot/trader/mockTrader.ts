namespace bot { export namespace trader {

    const balancesLocalStorageKey = "MockTrader.balances"

    export class MockTrader extends Trader {
        private balances: {[key: string]: number} = function(){

            const s = localStorage.getItem(balancesLocalStorageKey)
            if( s ){
                return JSON.parse(s)
            }

            return {USDT: 100}
        }()

        constructor( readonly binance: com.danborutori.cryptoApi.Binance ){
            super()
        }

        async getBalances(){
            return this.balances
        }

        async buy( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number ){
            const currentPrice = await this.binance.getSymbolPriceTicker(symbol.symbol)
            const price = parseFloat(currentPrice.price)

            const baseAsset = symbol.baseAsset
            const quoteAsset = symbol.quoteAsset
            this.balances[baseAsset] = (this.balances[baseAsset] || 0)+quantity
            this.balances[quoteAsset] = (this.balances[quoteAsset] || 0)-quantity*price
            this.saveBalances()

            return {
                price: price,
                quantity: quantity
            }
        }

        async sell( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number ){
            const currentPrice = await this.binance.getSymbolPriceTicker(symbol.symbol)
            const price = parseFloat(currentPrice.price)

            const baseAsset = symbol.baseAsset
            const quoteAsset = symbol.quoteAsset
            this.balances[baseAsset] = (this.balances[baseAsset] || 0)-quantity
            this.balances[quoteAsset] = (this.balances[quoteAsset] || 0)+quantity*price
            this.saveBalances()

            return {
                price: price,
                quantity: quantity
            }
        }

        private saveBalances(){
            localStorage.setItem(balancesLocalStorageKey, JSON.stringify(this.balances))
        }
    }

}}