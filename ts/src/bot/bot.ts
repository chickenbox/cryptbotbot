namespace bot {

    export class Bot {
        private binance: com.danborutori.cryptoApi.Binance

        constructor(
            config: {
                apiKey: string,
                apiSecure: string
            }
        ){
            this.binance = new com.danborutori.cryptoApi.Binance(config.apiKey, config.apiSecure)
        }

        async run(){
            console.log( JSON.stringify( await this.binance.getAccountInfo(), null, 2 ) )
        }

    }

}