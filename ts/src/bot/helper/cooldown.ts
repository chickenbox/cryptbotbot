namespace bot { export namespace helper {

    export class CoolDownHelper {

        private lockBuyTimestamps: { [symbol: string]: number } = {}

        setCoolDown( symbol: string, lockTimestamp: number ){
            this.lockBuyTimestamps[symbol] = lockTimestamp
        }

        canBuy( symbol: string, timestamp: number ){
            return timestamp > (this.lockBuyTimestamps[symbol] || 0)
        }

        getLockBuyTimestamp( symbol: string ){
            return this.lockBuyTimestamps[symbol] || 0
        }

    }

}}