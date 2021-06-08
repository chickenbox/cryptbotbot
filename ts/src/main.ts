setTimeout( function(){
    new bot.Bot({
        homingAsset: "USDT",
        interval: "30m",
        minHLRation: 1.1,
        smoothAmount: 5,
        apiKey: process.argv[2],
        apiSecure: process.argv[3]
    }).run()
}, 1)
