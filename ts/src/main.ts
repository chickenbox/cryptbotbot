setTimeout( function(){

        new bot.Bot({
            apiKey: process.argv[2],
            apiSecure: process.argv[3]
        }).run()
    }, 1)
