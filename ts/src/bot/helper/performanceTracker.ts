namespace bot { export namespace helper {

    const performanceTrackerGainsLocalStorageKey = "PerformanceTracker.gains"

    export class PerformanceTracker {

        readonly gains: { [symbol: string]: {
            holding: number
            spend: number
        } }

        constructor(){
            const s = localStorage.getItem(performanceTrackerGainsLocalStorageKey)
            if( s ){
                this.gains = JSON.parse(s)
            }else{
                this.gains = {}
            }
        }

        private getRecord( symbol: string ){
            return this.gains[ symbol ] || (this.gains[ symbol ] = {
                holding: 0,
                spend: 0
            })
        }

        buy( symbol: string, price: number, quantity: number ) {
            const record = this.getRecord( symbol )

            record.holding += quantity
            record.spend += quantity*price
        }

        sell( symbol: string, price: number, quantity: number ){
            const record = this.getRecord( symbol )
            record.holding -= quantity
            record.spend -= quantity/price
        }

        balance( symbol: string, currentPrice: number ){
            const record = this.getRecord( symbol )
            return record.holding*currentPrice-record.spend
        }

        save(){
            localStorage.setItem(performanceTrackerGainsLocalStorageKey, JSON.stringify(this.gains,null,2))
        }
    }

}}