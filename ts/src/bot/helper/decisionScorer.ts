namespace bot { export namespace helper {

    export let decisionScoreFactor1 = 1
    export let decisionScoreFactor2 = 1

    export class DecisionScorer {
        score( trendWatcher: helper.TrendWatcher, lastIdx: number, balance: number ){

            const acceleration = trendWatcher.dDataDDt[lastIdx]/trendWatcher.data[lastIdx].price

            return acceleration*decisionScoreFactor1+balance*decisionScoreFactor2
        }
    }

}}