namespace bot { export namespace helper {

    const cooldownInterval = 566795299.2772524

    export class CoolDownHelper {

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

    }

}}