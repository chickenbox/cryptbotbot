namespace bot { export namespace helper {

    export class TestBinanceTrader {

        async test( binance: com.danborutori.cryptoApi.Binance, logger: Logger ) {
            const testTradeAmount = 15
            const baseAsset = "BNB"
            const quoteAsset = "USDT"

            logger.log(`================================`)
            logger.log(`test trader`)

            try{

                const t = new trader.BinanceTrader(binance)

                const exchangeInfo = await binance.getExchangeInfo()
                const sym = exchangeInfo.symbols.find(s=>s.symbol==`${baseAsset}${quoteAsset}`)

                if( sym ){
                    const priceResponse = await binance.getSymbolPriceTicker(sym.symbol)

                    logger.log(`Try to buy ${testTradeAmount/parseFloat(priceResponse.price)} ${baseAsset}`)
                    logger.log(`current price ${priceResponse.price}`)

                    const buyResponse = await t.buy(sym, testTradeAmount/parseFloat(priceResponse.price), testTradeAmount )

                    logger.log(`buy ${buyResponse.quantity} at price ${buyResponse.price}`)

                    const sellResponse = await t.sell(sym, buyResponse.quantity)

                    logger.log(`sell ${sellResponse.quantity} at price ${sellResponse.price}`)
                }else{

                }
            }catch(e){
                logger.error(e)
            }
            logger.log(`================================`)
        }

    }

}}