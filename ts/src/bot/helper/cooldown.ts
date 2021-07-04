namespace bot { export namespace helper {

    const cooldownInterval = 1000*60*60*24

    export class CoolDownHelper {

        private lockBuyTimestamps: { [symbol: string]: {
            balance: number
            cooldownTimestamp: number
        } } = {}

        private getRecrod( symbol: string ){
            return this.lockBuyTimestamps[symbol] || (this.lockBuyTimestamps[symbol] = {
                balance: 0,
                cooldownTimestamp: 0
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
                r.cooldownTimestamp = timestamp+cooldownInterval
            }

            r.balance = 0
        }

    }

}}