namespace bot { export namespace trader {

    export class BinanceTrader implements Trader {

        async getBalances(): Promise<{[asset: string]: number}> {
            return {}
        }

        async buy( baseAsset: string, quoteAsset: string, closePrice: number, quality: number ) {

        }

        async sell( baseAsset: string, quoteAsset: string, closePrice: number, quality: number ) {
        }
    }

}}