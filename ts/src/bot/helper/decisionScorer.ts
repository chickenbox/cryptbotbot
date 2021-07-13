namespace bot { export namespace helper {

    export class DecisionScorer {
        score( trendWatcher: helper.TrendWatcher, lastIdx: number, balance: number ){

            const acceleration = trendWatcher.dDataDDt[lastIdx]/trendWatcher.data[lastIdx].price

            return acceleration*0.7482109282262146+balance*0.2155213267779923
        }
    }

}}