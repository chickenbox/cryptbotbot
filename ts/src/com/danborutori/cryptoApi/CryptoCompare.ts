namespace com { export namespace danborutori { export namespace cryptoApi {

    export class CryptoCompare {

        static readonly shared = new CryptoCompare()

        async getPrice( from: String, to: String ){
            const json = await (await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${from}&tsyms=${to}`)).json()
            return json[to as any] as number
        }

    }

}}}