namespace bot { export namespace helper {

    const performanceTrackerGainsLocalStorageKey = "PerformanceTracker.gains"

    export class PerformanceTracker {

        readonly gains: { [symbol: string]: {
            holding: number
            spend: number
        } }

        private get storageKey(){
            if( this.id ){
                return performanceTrackerGainsLocalStorageKey+"."+this.id
            }
                return performanceTrackerGainsLocalStorageKey
        }

        constructor(readonly id?: string){
            const s = localStorage.getItem(this.storageKey)
            if( s ){
                this.gains = JSON.parse(s)
            }else{
                this.gains = {}
            }
        }

        getRecord( symbol: string ){
            return this.gains[ symbol ] || (this.gains[ symbol ] = {
                holding: 0,
                spend: 0
            })
        }

        getHolding( symbol: string ){
            return this.getRecord(symbol).holding
        }

        buy( symbol: string, price: number, quantity: number ) {
            const record = this.getRecord( symbol )

            record.holding += quantity
            record.spend += quantity*price
        }

        sell( symbol: string, price: number, quantity: number ){
            const record = this.getRecord( symbol )
            record.holding -= quantity
            record.spend -= quantity*price
        }

        balance( symbol: string, currentPrice: number ){
            const record = this.getRecord( symbol )
            return record.holding*currentPrice-record.spend
        }

        save(){
            localStorage.setItem(this.storageKey, JSON.stringify(this.gains,null,2))
        }

        reset(){
            for( let s in this.gains ){
                delete this.gains[s]
            }
        }
    }

}}