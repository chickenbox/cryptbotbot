namespace bot { export namespace helper {

    const cooldownInterval = 1000*60*60*24*3
    const storageKey = "cooldownHelper.lockBuyTimestamps"

    export class CoolDownHelper {


        constructor( private keySuffix: string ){
            this.load()
        }

        private lockBuyTimestamps: { [symbol: string]: {
            balance: number
            cooldownTimestamp: number
            consecuiveLost: number
        } } = {}

        private getRecrod( symbol: string ){
            return this.lockBuyTimestamps[symbol] || (this.lockBuyTimestamps[symbol] = {
                balance: 0,
                cooldownTimestamp: 0,
                consecuiveLost: 0
            })
        }

        getLockBuyTimestamp( symbol ){
            return this.getRecrod(symbol).cooldownTimestamp
        }

        canBuy( symbol: string, timestamp: number ){
            return timestamp > (this.getRecrod(symbol).cooldownTimestamp)
        }

        buy( symbol: string, price: number, quantity: number ){
            const r = this.getRecrod(symbol)

            r.balance -= price*quantity
        }

        sell( symbol: string, price: number, quantity: number, timestamp: number ){
            const r = this.getRecrod(symbol)

            if( -r.balance>price*quantity ){
                r.consecuiveLost += 1
                r.cooldownTimestamp = timestamp+cooldownInterval*r.consecuiveLost
            }else{
                r.consecuiveLost = 0
            }

            r.balance = 0
        }

        private load(){
            const s = localStorage.getItem(storageKey+this.keySuffix)
            if( s )
                this.lockBuyTimestamps = JSON.parse(s)
        }

        save(){
            localStorage.setItem( storageKey+this.keySuffix, JSON.stringify(this.lockBuyTimestamps))
        }

        reset(){
            this.lockBuyTimestamps = {}
        }
    }

}}