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
            const symbol = `${baseAsset}${bot.homingAsset}`

            for( let i = startIndex; i<trendWatcher.data.length; i++ ){
                const action = bot.getAction( baseAsset, trendWatcher, i )
                const date = new Date(trendWatcher.data[i].time)

                switch( action ){
                case "buy":
                    const earning = Math.max(0,-bot.performanceTracker.getRecord(symbol).spend)
                    bot.tradeHistory.buy(baseAsset, bot.homingAsset, trendWatcher.data[i].price, 0, trendWatcher.data[i].price, 0, date)
                    bot.performanceTracker.buy(symbol, trendWatcher.data[i].price, (1+earning)/trendWatcher.data[i].price)
                    brought = true
                    break
                case "sell":
                    if( brought ){
                        const holding = bot.performanceTracker.getHolding(symbol)
                        bot.tradeHistory.sell(baseAsset, bot.homingAsset, trendWatcher.data[i].price, 0, trendWatcher.data[i].price, 0, date)
                        bot.performanceTracker.sell(symbol, trendWatcher.data[i].price, holding)
                        brought = false
                    }
                    break
                }
            }
        }

    }

}}