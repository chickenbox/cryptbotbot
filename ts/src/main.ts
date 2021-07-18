interface BotConfig {
    apiKey: string
    apiSecret: string
    env: com.danborutori.cryptoApi.Environment
    mock: boolean
    trader: "BINANCE" | "MOCK"
    holdingBalance: number
    blackList: string[],
    password: string
}

const fs = require("fs")
fs.readFile(process.argv[2], "utf8", async function (err,data) {
    if (err) {
        return console.log(err);
    }else{
        const config = JSON.parse(data) as BotConfig

        const b = new bot.Bot({
            homingAsset: "USDT",
            interval: "12h",
            smoothAmount: 14*2,
            maxAllocation: 1/10,
            logLength: 10000,
            holdingBalance: config.holdingBalance,
            minimumOrderQuantity: 10,
            apiKey: config.apiKey,
            apiSecure: config.apiSecret,
            environment: config.env,
            trader: config.trader,
            blackList: config.blackList
        })
        await b.init()
        const httpHelper = new bot.helper.HttpHelper(
            b,
            3333,
            config.password
        )

        if(config.mock){
            await b.mock()
        }

        b.run()
    }
});

