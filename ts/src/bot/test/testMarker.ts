namespace bot { export namespace test {

    export class TestMarker {

        test( bot: bot.Bot, start: Date ){

            for( let baseAsset in bot.trendWatchers ){
                this._test(bot, baseAsset, bot.trendWatchers[baseAsset], start)
            }
        }

        private _test( bot: bot.Bot, baseAsset: string, trendWatcher: helper.TrendWatcher, start: Date ){

            const startIndex = trendWatcher.data.findIndex(d=>d.time>start.getTime())
            let brought = false

            for( let i = startIndex; i<trendWatcher.data.length; i++ ){
                const action = bot.getAction( baseAsset, trendWatcher, i )
                const date = new Date(trendWatcher.data[i].time)

                switch( action ){
                case "buy":
                    bot.tradeHistory.buy(baseAsset, bot.homingAsset, trendWatcher.data[i].price, 0, trendWatcher.data[i].price, 0, date)
                    bot.performanceTracker.buy(`${baseAsset}${bot.homingAsset}`, trendWatcher.data[i].price, 1/trendWatcher.data[i].price)
                    brought = true
                    break
                case "sell":
                    if( brought ){
                        bot.tradeHistory.sell(baseAsset, bot.homingAsset, trendWatcher.data[i].price, 0, trendWatcher.data[i].price, 0, date)
                        bot.performanceTracker.sell(`${baseAsset}${bot.homingAsset}`, trendWatcher.data[i].price, 1/trendWatcher.data[i].price)
                        brought = false
                    }
                    break
                }
            }
        }

    }

}}