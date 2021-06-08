namespace bot { export namespace trader {

    interface Record {
        time: Date
        action: "buy" | "sell"
        price: number
        quantity: number
    }

    export class MockTrader extends Trader {
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
            super.buy(baseAsset,quoteAsset,closePrice,quantity)
        }

        async sell( baseAsset: string, quoteAsset: string, closePrice: number, quantity: number ){
            await this._buy( quoteAsset, baseAsset, quantity/closePrice, quantity/closePrice)
            super.sell(baseAsset,quoteAsset,closePrice,quantity)
        }
    }

}}