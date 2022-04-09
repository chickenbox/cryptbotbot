namespace bot { export namespace graph {

    const graphWidth = 800
    const graphHeight = 300
    const graphInterval = bot.graphInterval

    function drawGraph(
        canvas: HTMLCanvasElement,
        data: {
            price: number,
            ma1: number,
            ma2: number,
            ma3: number,
            time: number
        }[],
        candles: {
            timeStart: number
            timeEnd: number
            high: number
            low: number
            trend: "up" | "side" | "down"
        }[],
        tradeRecords: {
            color: string,
            price: number,
            time: number
        }[],
        step: number
    )
    {
        const ctx = canvas.getContext("2d")!

        const w = canvas.width
        const h = canvas.height

        ctx.fillStyle = "#eeeeee"
        ctx.fillRect(0,0,w,h)

        const end = Date.now()
        const start = end-graphInterval
        const timeRange = end-start
        let max: number
        let min: number
        let range: number
        let curveD: {price: number, time: number}[]

        max = Number.NEGATIVE_INFINITY
        min = 0//Number.POSITIVE_INFINITY

        for( let d of data ){
            if( d.time >= start-step && d.time <= end+step ){
                max = Math.max(d.price, max)
                // min = Math.min(d.price, min)
                min = Math.min(d.ma2, min)
            }
        }
        range = max-min
        if( range<0.1 ){
            range = 0.1
            const median = (max+min)/2
            max = median+0.05
            min = median-0.05
        }

        //draw candle begin
        ctx.lineWidth = w/timeRange
        ctx.lineCap = "square"
        for( let candle of candles ){
            switch( candle.trend ){
            case "up":
                ctx.strokeStyle = "#BEFFCE"
                break
            case "side":
                ctx.strokeStyle = "white"
                break
            case "down":
                ctx.strokeStyle = "#FFADAD"
                break
            }
            ctx.lineWidth = (candle.timeEnd-candle.timeStart)*w/timeRange
            ctx.beginPath()
            const t = (candle.timeEnd+candle.timeStart)/2
            ctx.moveTo( (t-start)*w/timeRange, h-(candle.high-min)*h/range )
            ctx.lineTo( (t-start)*w/timeRange, h-(candle.low-min)*h/range )
            ctx.stroke()
        }
        //draw candle end

        for( let r of tradeRecords ){
            ctx.strokeStyle = r.color
            ctx.lineWidth = 1
            const x = (r.time-start)*w/timeRange
            const y = (1-(r.price-min)/range)*h
            ctx.beginPath()
            ctx.moveTo(x,0)
            ctx.lineTo(x,h)
            ctx.moveTo(x+1.5,y)
            ctx.arc(x,y,1.5,0,Math.PI*2)
            ctx.stroke()
        }

        ctx.strokeStyle = "black"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo( (data[0].time-start)*w/timeRange, h-(data[0].price-min)*h/range )
        for( let d of data.slice(1) ){
            ctx.lineTo( (d.time-start)*w/timeRange, h-(d.price-min)*h/range )
        }
        ctx.stroke()

        ctx.strokeStyle = "green"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo( (data[0].time-start)*w/timeRange, h-(data[0].ma1-min)*h/range )
        for( let d of data.slice(1) ){
            ctx.lineTo( (d.time-start)*w/timeRange, h-(d.ma1-min)*h/range )
        }
        ctx.stroke()

        ctx.strokeStyle = "grey"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo( 0, h+min*h/range )
        ctx.lineTo( w, h+min*h/range )
        ctx.stroke()

        curveD = data.map(d=>{
            return {
                price: d.ma2,
                time: d.time
            }
        })

        ctx.strokeStyle = "orange"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo( (curveD[0].time-start)*w/timeRange, h-(curveD[0].price-min)*h/range )
        for( let d of curveD.slice(1) ){
            ctx.lineTo( (d.time-start)*w/timeRange, h-(d.price-min)*h/range )
        }
        ctx.moveTo( 0, h+min*h/range )
        ctx.lineTo( w, h+min*h/range )
        ctx.stroke()

        curveD = data.map(d=>{
            return {
                price: d.ma3,
                time: d.time
            }
        })

        ctx.strokeStyle = "purple"
        ctx.lineWidth = 1
        ctx.setLineDash([2,2])
        ctx.beginPath()
        ctx.moveTo( (curveD[0].time-start)*w/timeRange, h-(curveD[0].price-min)*h/range )
        for( let d of curveD.slice(1) ){
            ctx.lineTo( (d.time-start)*w/timeRange, h-(d.price-min)*h/range )
        }
        ctx.moveTo( 0, h+min*h/range )
        ctx.lineTo( w, h+min*h/range )
        ctx.stroke()
        ctx.setLineDash([])
    }

    export class Drawer {

        constructor( readonly bot: bot.Bot ){
        }

        get html() {
            const assets: {
                asset: string
                data: {
                    price: number
                    ma1: number
                    ma2: number
                    ma3: number
                    time: number
                }[]
                candles: helper.Candle[]
                tradeRecords: {
                    color: string
                    price: number
                    time: number
                }[]
                balance: number
            }[] = []

            for( let baseAsset in this.bot.trendWatchers ){
                const trendWatcher = this.bot.trendWatchers[baseAsset]
                const symbol = `${baseAsset}${this.bot.homingAsset}`

                const history = this.bot.tradeHistory.history[symbol]

                assets.push({
                    asset: baseAsset,
                    data: trendWatcher.data.map((d,i)=>{
                        return {
                            price: d.price,
                            ma1: trendWatcher.ma14[i],
                            ma2: trendWatcher.ma24[i],
                            ma3: trendWatcher.ma84[i],
                            time: d.time
                        }
                    }).filter(a=>{
                        return a.time>Date.now()-graphInterval-this.bot.timeInterval
                    }),
                    candles: trendWatcher.candles,
                    tradeRecords: history ? history.map(h=>{
                        let color = "purple"
                        switch( h.side ){
                        case "buy":
                            color = "blue"
                            break
                        case "sell":
                            color = "red"
                            break                            
                        }
                        return {
                            color: color,
                            price: h.actualPrice,
                            time: h.time,
                        }
                    }).filter(a=>{
                        return a.time>Date.now()-graphInterval-this.bot.timeInterval
                    }) : [],
                    balance: this.bot.trader.performanceTracker.balance(symbol, this.bot.getRecentPrice(symbol, Date.now()))
                })
            }

            const investHelper = new helper.InvestmentHistoryHelper()

            return `
            <script>
            const graphInterval = ${graphInterval};
            ${drawGraph.toString()}
            </script>
            <table>
            <tr>
            <th>Balance ${this.bot.homingAsset}</th>
            </tr>
            <tr>
            <td>
            <canvas id="graphCanvasBalance" width="${graphWidth}" height="${graphHeight}" style="width: ${graphWidth}px; height: ${graphHeight}px;"></canvas>
            <script>
                drawGraph(graphCanvasBalance, ${JSON.stringify(this.bot.balanceTracker.balances.map(
                    (b)=>{
                        const iv = investHelper.getAccumulativeInvestment( this.bot.homingAsset, b.time )
                        const gain = b.amount-iv

                        return {
                            price: b.amount,
                            ma1: iv,
                            ma2: gain,
                            time: b.time
                        }
                    }
                ).filter(a=>{
                    return a.time>Date.now()-graphInterval-this.bot.timeInterval
                }))}, [], [], ${this.bot.timeInterval});
            </script>
            <br/><br/>
            </td>
            </tr>
            ${
                assets.sort(function(a,b){
                    return b.balance-a.balance
                }).map(r=>{
                    const symbol = `${r.asset}${this.bot.homingAsset}`
                    return `
                    <tr>
                    <th>
                    ${r.asset}<br/>
                    Gain: ${r.balance}<br/>
                    </th>
                    </tr>
                    <tr>
                    <td>
                    <canvas id="graphCanvas${r.asset}" width="${graphWidth}" height="${graphHeight}" style="width: ${graphWidth}px; height: ${graphHeight}px;"></canvas>
                    <script>
                        drawGraph(graphCanvas${r.asset}, ${JSON.stringify(r.data)}, ${JSON.stringify(r.candles)}, ${JSON.stringify(r.tradeRecords)}, ${this.bot.timeInterval});
                    </script>
                    <br/><br/>
                    </td>
                    </tr>
                    `
                }).join("")
            }
            </table><br/><br/>
            negative list: [${assets.filter(a=>a.balance<=-3).map(a=>`"${a.asset}"`).join(", ")}]
            `
        }

    }

}}