namespace bot { export namespace helper {

    const balanceTrackerlocalStorageKey = "BalanceTracker.balances"
    const limit = 1000

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

            if( this.balances.length>limit )
                this.balances.splice(0,this.balances.length-limit)
        }

        save(){
            localStorage.setItem(balanceTrackerlocalStorageKey, JSON.stringify(this.balances))
        }
    }

}}