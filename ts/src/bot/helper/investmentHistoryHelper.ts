namespace bot { export namespace helper {

    const hardCodedExchange = {
        "HKDUSDT": 7.8
    }

    export class InvestmentHistoryHelper {
        private histories: {
            currency: string
            amount: number
            date: string
        }[]

        constructor(){
            this.histories = JSON.parse( localStorage.getItem("InvestmentHistory") )
        }

        getAccumulativeInvestment( asset: string, time: number ){

            let amount = 0
            // const exchangeCache = new Map<string,number>()
            for(let h of this.histories){
                if( new Date(h.date).getTime()<time ){
                    // let exchange = exchangeCache.get(h.currency) || await com.danborutori.cryptoApi.CryptoCompare.shared.getPrice(h.currency, asset) || 1/hardCodedExchange[`${h.currency}${asset}`]
                    // exchangeCache.set(h.currency, exchange)
                    const exchange = 1/hardCodedExchange[`${h.currency}${asset}`]
                    amount += h.amount*exchange
                }else
                    break
            }

            return amount
        }

    }

}}