namespace bot {

    export class BotOptimizer {

        async optimize( bot: Bot ){

            let healthFunction = async function( params: number[] ){

                helper.smoothCurvePow = Math.floor(params[0])
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
                }]
            )

            return config
        }

    }

}