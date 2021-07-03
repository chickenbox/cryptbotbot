namespace bot { export namespace trader {

    const balancesLocalStorageKey = "MockTrader.balances"

    export class MockTrader extends Trader {
        private balances: {[key: string]: number} = {USDT:11000}

        constructor( readonly binance: com.danborutori.cryptoApi.Binance ){
            super()
        }

        async getBalances(){
            return this.balances
        }

        async buy( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, quoteAssetQuantity: number, mockPrice?: number ){
            const price = mockPrice!==undefined?mockPrice:parseFloat((await this.binance.getSymbolPriceTicker(symbol.symbol)).price)

            const baseAsset = symbol.baseAsset
            const quoteAsset = symbol.quoteAsset
            this.balances[baseAsset] = (this.balances[baseAsset] || 0)+quantity
            this.balances[quoteAsset] = (this.balances[quoteAsset] || 0)-quantity*price

            return {
                price: price,
                quantity: quantity
            }
        }

        async sell( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, mockPrice?: number ){
            const price = mockPrice!==undefined?mockPrice:parseFloat((await this.binance.getSymbolPriceTicker(symbol.symbol)).price)

            const baseAsset = symbol.baseAsset
            const quoteAsset = symbol.quoteAsset
            this.balances[baseAsset] = (this.balances[baseAsset] || 0)-quantity
            this.balances[quoteAsset] = (this.balances[quoteAsset] || 0)+quantity*price

            return {
                price: price,
                quantity: quantity
            }
        }
    }

}}