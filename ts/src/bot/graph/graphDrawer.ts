namespace bot { export namespace graph {

    const graphWidth = 800
    const graphHeight = 300
    const graphInterval = bot.graphInterval

    function drawGraph(
        canvas: HTMLCanvasElement,
        data: {
            price: number,
            smoothedPrice: number,
            dSmoothedPrice: number,
            ddSmoothedPrice: number,
            noisyness: number,
            noisynessMean: number,
            time: number
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

        let max = Number.NEGATIVE_INFINITY
        let min = 0

        for( let d of data ){
            if( d.time >= start-step && d.time <= end+step ){
                max = Math.max(d.price, max)
                // min = Math.min(d.price, min)
            }
        }
        let range = max-min
        if( range==0 ){
            range = 1
            max = 0.5
            min = -0.5
        }

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
        ctx.moveTo( (data[0].time-start)*w/timeRange, h-(data[0].smoothedPrice-min)*h/range )
        for( let d of data.slice(1) ){
            ctx.lineTo( (d.time-start)*w/timeRange, h-(d.smoothedPrice-min)*h/range )
        }
        ctx.stroke()

        ctx.strokeStyle = "grey"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo( 0, h+min*h/range )
        ctx.lineTo( w, h+min*h/range )
        ctx.stroke()

        let curveD = data.map(d=>{
            return {
                price: d.dSmoothedPrice,
                time: d.time
            }
        })
        //d
        max = Number.NEGATIVE_INFINITY
        min = Number.POSITIVE_INFINITY

        for( let d of curveD ){
            if( d.time >= start-step && d.time <= end+step ){
                max = Math.max(d.price, max)
                min = Math.min(d.price, min)
            }
        }
        range = max-min
        if( range==0 ){
            range = 1
            max = 0.5
            min = -0.5
        }

        ctx.strokeStyle = "#AAB7B8"
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
                price: d.ddSmoothedPrice,
                time: d.time
            }
        })

        //dd
        max = Number.NEGATIVE_INFINITY
        min = Number.POSITIVE_INFINITY

        for( let d of curveD ){
            if( d.time >= start-step && d.time <= end+step ){
                max = Math.max(d.price, max)
                min = Math.min(d.price, min)
            }
        }
        range = max-min
        if( range==0 ){
            range = 1
            max = 0.5
            min = -0.5
        }

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
                price: d.noisyness,
                time: d.time
            }
        })
        //noisyness
        max = Number.NEGATIVE_INFINITY
        min = Number.POSITIVE_INFINITY

        for( let d of curveD ){
            if( d.time >= start-step && d.time <= end+step ){
                max = Math.max(d.price, max)
                min = Math.min(d.price, min)
            }
        }
        range = max-min
        if( range==0 ){
            range = 1
            max = 0.5
            min = -0.5
        }

        ctx.strokeStyle = "silver"
        ctx.lineWidth = 1
        ctx.setLineDash([6,6])
        ctx.beginPath()
        ctx.moveTo( (curveD[0].time-start)*w/timeRange, h-(curveD[0].price-min)*h/range )
        for( let d of curveD.slice(1) ){
            ctx.lineTo( (d.time-start)*w/timeRange, h-(d.price-min)*h/range )
        }
        ctx.stroke()
        ctx.setLineDash([])

        curveD = data.map(d=>{
            return {
                price: d.noisynessMean*2,
                time: d.time
            }
        })
        //noisyness mean
        ctx.strokeStyle = "silver"
        ctx.lineWidth = 1
        ctx.setLineDash([6,6])
        ctx.beginPath()
        ctx.moveTo( (curveD[0].time-start)*w/timeRange, h-(curveD[0].price-min)*h/range )
        for( let d of curveD.slice(1) ){
            ctx.lineTo( (d.time-start)*w/timeRange, h-(d.price-min)*h/range )
        }
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
                    smoothedPrice: number
                    ddSmoothedPrice: number
                    noisyness: number
                    noisynessMean: number
                    time: number
                }[]
                tradeRecords: {
                    color: string
                    price: number,
                    time: number
                }[],
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
                            smoothedPrice: trendWatcher.smoothedData[i].price,
                            dSmoothedPrice: trendWatcher.dDataDt[i],
                            ddSmoothedPrice: trendWatcher.dDataDDt[i],
                            noisyness: trendWatcher.noisyness[i],
                            noisynessMean: trendWatcher.noisynessMean[i],
                            time: d.time
                        }
                    }),
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

                            smoothedPrice: 0,
                            dSmoothedPrice: 0,
                            ddSmoothedPrice: 0,
                            noisyness: 0,
                            noisynessMean: 0
                        }
                    }) : [],
                    balance: this.bot.trader.performanceTracker.balance(symbol, this.bot.getRecentPrice(symbol, Date.now()))
                })
            }

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
                    function(b){
                        return {
                            price: b.amount,
                            smoothedPrice: b.amount,
                            time: b.time
                        }
                    }
                ))}, [], ${this.bot.timeInterval});
            </script>
            <br/><br/>
            </td>
            </tr>
            ${
                assets.sort(function(a,b){
                    return b.balance-a.balance
                }).map(r=>{
                    const symbol = `${r.asset}${this.bot.homingAsset}`
                    const cooldown = this.bot.cooldownHelper.getLockBuyTimestamp(symbol)
                    let coolDownStr = "NA"
                    if( cooldown>Date.now() )
                        coolDownStr = new Date(cooldown).toDateString()
                    return `
                    <tr>
                    <th>
                    ${r.asset}<br/>
                    Gain: ${r.balance}<br/>
                    Cooldown: ${coolDownStr}
                    </th>
                    </tr>
                    <tr>
                    <td>
                    <canvas id="graphCanvas${r.asset}" width="${graphWidth}" height="${graphHeight}" style="width: ${graphWidth}px; height: ${graphHeight}px;"></canvas>
                    <script>
                        drawGraph(graphCanvas${r.asset}, ${JSON.stringify(r.data)}, ${JSON.stringify(r.tradeRecords)}, ${this.bot.timeInterval});
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