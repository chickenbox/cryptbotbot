setTimeout( function(){    
    const b = new bot.Bot({
        homingAsset: "USDT",
        interval: "30m",
        minHLRation: 1.1,
        smoothAmount: 48*60/30,
        maxAllocation: 1/10,
        logLength: 10000,
        holdingBalance: 10000,
        minimumOrderQuantity: 10,
        mockRun: process.argv[5]=="true",
        apiKey: process.argv[2],
        apiSecure: process.argv[3],
        environment: process.argv[4] as com.danborutori.cryptoApi.Environment,
        trader: process.argv[6] as ("BINANCE" | "MOCK"),
        whiteList:["DOGE","BTC","ETH","BNB","BUSD","USDC","TUSD","PAX","BCH","EOS","XRP","TRX","ETC","LTC","ADA","ATOM","DASH","HBAR","LINK","MATIC","NEO","QTUM","WRX","XMR","1INCH","AAVE","ALGO","ALPHA","AUDIO","AUD","BAL","BAND","BAT","BEAM","BTT","CHZ","COMP","CRV","DOT","ENJ","EUR","FIL","FTM","GBP","GRT","HNT","JST","KNC","MITH","MKR","OMG","ONT","PAXG","RUNE","ZEN","ZEC","YFII","YFI","XLM","WAVES","VET","UNI","TOMO","SXP","SUSHI","SRM","SOL","SNX","SHIB"]
    })
    const httpHelper = new bot.helper.HttpHelper(b,3333)
    b.run()
}, 1)

