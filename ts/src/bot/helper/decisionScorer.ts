namespace bot { export namespace helper {

    export class DecisionScorer {
        score( trendWatcher: helper.TrendWatcher, lastIdx: number ){
            return trendWatcher.dDataDDt[lastIdx]/trendWatcher.data[lastIdx].price
        }
    }

}}