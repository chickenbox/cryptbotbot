namespace bot { export namespace test {

    export class TestMarker {

        test( bot: bot.Bot, start: Date ){

            for( let baseAsset in bot.trendWatchers ){
                this._test(bot, baseAsset, bot.trendWatchers[baseAsset], start)
            }
        }

        private _test( bot: bot.Bot, baseAsset: string, trendWatcher: helper.TrendWatcher, start: Date ){

            const startIndex = trendWatcher.data.findIndex(d=>d.close>start)

            for( let i = startIndex; i<trendWatcher.data.length; i++ ){
                const action = bot.getAction( baseAsset, trendWatcher, i )

                switch( action ){
                case "buy":
                    bot.tradeHistory.buy(baseAsset, bot.homingAsset, trendWatcher.data[i].price, 0)
                    break
                case "sell":
                    bot.tradeHistory.sell(baseAsset, bot.homingAsset, trendWatcher.data[i].price, 0)
                    break
                }
            }
        }

    }

}}