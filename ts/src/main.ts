setTimeout( function(){
    const httpHelper = new bot.helper.HttpHelper(3333)
    
    new bot.Bot({
        homingAsset: "USDT",
        interval: "3m",
        minHLRation: 1.1,
        smoothAmount: 5,
        logLength: 50000,
        apiKey: process.argv[2],
        apiSecure: process.argv[3]
    }).run()
}, 1)

