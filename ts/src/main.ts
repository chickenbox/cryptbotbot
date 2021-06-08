setTimeout( function(){
    new bot.Bot({
        homingAsset: "USDT",
        interval: "3m",
        minHLRation: 1.1,
        apiKey: process.argv[2],
        apiSecure: process.argv[3]
    }).run()
}, 1)
