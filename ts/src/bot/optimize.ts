namespace bot {

    export class BotOptimizer {

        async optimize( bot: Bot ){

            let healthFunction = async function( params: number[] ){

                helper.smoothCurvePow = params[0]
                bot.downTrendInterval = params[1]
                helper.cooldownInterval = params[2]
                helper.decisionScoreFactor1 = params[3]
                helper.decisionScoreFactor2 = params[4]
                helper.curveCache.clear()
                return await bot.mock()
            }

            const optimizer = new helper.Optimizer()
            const config = await optimizer.optimize(
                healthFunction,
                [{
                    range: {
                        min: 0,
                        max: 32
                    }
                },
                {
                    range: {
                        min: 1,
                        max: 14
                    }
                },
                {
                    range: {
                        min: 1000*60*60*24,
                        max: 1000*60*60*24*15
                    }
                },
                {
                    range: {
                        min: 0,
                        max: 1
                    }
                },
                {
                    range: {
                        min: 0,
                        max: 1
                    }
                }
                ])

            return config
        }

    }

}