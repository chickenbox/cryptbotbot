namespace bot { export namespace helper {

    const balanceTrackerlocalStorageKey = "BalanceTracker.balances"

    export class BalanceTracker {

        readonly balances: {time: number, amount: number }[]

        constructor(){
            const s = localStorage.getItem(balanceTrackerlocalStorageKey)
            if( s ){
                this.balances = JSON.parse(s)    
            }else{
                this.balances = []
            }
        }

        add( balance: number ){
            this.balances.push({
                time: Date.now(),
                amount: balance
            })
        }
    }

}}