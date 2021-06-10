namespace bot { export namespace trader {

    interface Record {
        time: Date
        action: "buy" | "sell"
        price: number
        quantity: number
    }

    const balancesLocalStorageKey = "MockTrader.balances"

    export class MockTrader extends Trader {
        private balances: {[key: string]: number} = function(){

            const s = localStorage.getItem(balancesLocalStorageKey)
            if( s ){
                return JSON.parse(s)
            }

            return {USDT: 100}
        }()

        async getBalances(){
            return this.balances
        }

        async buy( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ){
            this.balances[baseAsset] = (this.balances[baseAsset] || 0)+quantity
            this.balances[quoteAsset] = (this.balances[quoteAsset] || 0)-quantity*closePrice
            this.saveBalances()
        }

        async sell( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ){
            this.balances[baseAsset] = (this.balances[baseAsset] || 0)-quantity
            this.balances[quoteAsset] = (this.balances[quoteAsset] || 0)+quantity*closePrice
            this.saveBalances()
        }

        private saveBalances(){
            localStorage.setItem(balancesLocalStorageKey, JSON.stringify(this.balances))
        }
    }

}}