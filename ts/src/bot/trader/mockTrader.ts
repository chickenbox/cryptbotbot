namespace bot { export namespace trader {

    const balancesLocalStorageKey = "MockTrader.balances"
    const commissionRate = 0.001

    export class MockTrader extends Trader {
        private balances: {[key: string]: number}
        private timeout: number = -1

        constructor(
            readonly binance: com.danborutori.cryptoApi.Binance,
            private keySuffix: string
        ){
            super()
            const s = localStorage.getItem(balancesLocalStorageKey+keySuffix)
            if( s ){
                this.balances = JSON.parse(s)
            }else{
                this.balances = {USDT: 10000}
            }
        }

        async getBalances(){
            return this.balances
        }

        async buy( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, quoteAssetQuantity: number, mockPrice?: number ){
            const price = mockPrice!==undefined?mockPrice:parseFloat((await this.binance.getSymbolPriceTicker(symbol.symbol)).price)

            const netQty = quantity*(1-commissionRate)

            const baseAsset = symbol.baseAsset
            const quoteAsset = symbol.quoteAsset
            this.balances[baseAsset] = (this.balances[baseAsset] || 0)+netQty
            this.balances[quoteAsset] = (this.balances[quoteAsset] || 0)-quantity*price

            this.save()

            return {
                price: price,
                quantity: quantity
            }
        }

        async sell( symbol: com.danborutori.cryptoApi.ExchangeInfoSymbol, quantity: number, mockPrice?: number ){
            const price = mockPrice!==undefined?mockPrice:parseFloat((await this.binance.getSymbolPriceTicker(symbol.symbol)).price)

            const netQty = quantity*(1-commissionRate)

            const baseAsset = symbol.baseAsset
            const quoteAsset = symbol.quoteAsset
            this.balances[baseAsset] = (this.balances[baseAsset] || 0)-quantity
            this.balances[quoteAsset] = (this.balances[quoteAsset] || 0)+netQty*price

            this.save()

            return {
                price: price,
                quantity: quantity
            }
        }

        private save(){
            if(this.timeout>=0)
                clearTimeout(this.timeout)
            this.timeout = setTimeout(()=>{
                localStorage.setItem(balancesLocalStorageKey+this.keySuffix, JSON.stringify(this.balances))
                this.timeout = -1
            }, 100)
        }
    }

}}