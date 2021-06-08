setTimeout( function(){    
    const b = new bot.Bot({
        homingAsset: "USDT",
        interval: "30m",
        minHLRation: 1.1,
        smoothAmount: 5,
        logLength: 50000,
        apiKey: process.argv[2],
        apiSecure: process.argv[3]
    })
    const httpHelper = new bot.helper.HttpHelper(b,3333)
    b.run()
}, 1)

