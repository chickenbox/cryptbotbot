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

        add( balance: number, time: number ){
            this.balances.push({
                time: time,
                amount: balance
            })
        }

        save(){
            localStorage.setItem(balanceTrackerlocalStorageKey, JSON.stringify(this.balances))
        }
    }

}}