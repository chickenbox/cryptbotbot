namespace bot {

    export class BotOptimizer {

        async optimize( bot: Bot ){

            let healthFunction = async function( params: number[] ){

                helper.smoothCurvePow = params[0]
                bot.downTrendInterval = params[1]
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
                }
                ])

            return config
        }

    }

}