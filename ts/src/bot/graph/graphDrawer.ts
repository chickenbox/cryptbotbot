namespace bot { export namespace graph {

    const graphWidth = 800
    const graphHeight = 300

    const graphInterval = 1000*60*60*24*2

    function drawGraph(
        canvas: HTMLCanvasElement,
        data: {
            normalizedPrice: number,
            smoothedPrice: number,
            time: number
        }[],
        tradeRecords: {
            color: string,
            time: number
        }[],
        step: number ){
        const ctx = canvas.getContext("2d")!

        const w = canvas.width
        const h = canvas.height

        ctx.fillStyle = "#eeeeee"
        ctx.fillRect(0,0,w,h)

        const end = Date.now()
        const start = end-graphInterval
        const timeRange = end-start

        let max: number = data[0].normalizedPrice
        let min: number = data[0].normalizedPrice

        for( let d of data ){
            if( d.time >= start-step && d.time <= end+step ){
                max = Math.max(d.normalizedPrice, max)
                min = Math.min(d.normalizedPrice, min)
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
            ctx.beginPath()
            ctx.moveTo(x,0)
            ctx.lineTo(x,h)
            ctx.stroke()
        }

        ctx.strokeStyle = "black"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo( (data[0].time-start)*w/timeRange, h-(data[0].normalizedPrice-min)*h/range )
        for( let d of data.slice(1) ){
            ctx.lineTo( (d.time-start)*w/timeRange, h-(d.normalizedPrice-min)*h/range )
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
    }

    export class Drawer {

        constructor( readonly bot: bot.Bot ){
        }

        get html() {
            const assets: {
                asset: string
                data: {
                    normalizedPrice: number,
                    smoothedPrice: number,
                    time: number
                }[]
                tradeRecords: {
                    color: string,
                    time: number
                }[]
            }[] = []

            for( let baseAsset in this.bot.trendWatchers ){
                const trendWatcher = this.bot.trendWatchers[baseAsset]

                const history = this.bot.tradeHistory.history[`${baseAsset}${this.bot.homingAsset}`]

                assets.push({
                    asset: baseAsset,
                    data: trendWatcher.data.map((d,i)=>{
                        return {
                            normalizedPrice: d.price,
                            smoothedPrice: trendWatcher.smoothedData[i].price,
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
                            color = "yellow"
                            break                            
                        }
                        return {
                            color: color,
                            time: h.time.getTime()
                        }
                    }) : []
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
                            normalizedPrice: b.amount,
                            smoothedPrice: b.amount,
                            time: b.time
                        }
                    }
                ))}, [], ${this.bot.timeInterval});
            </script>
            </td>
            </tr>
            ${
                assets.map(r=>{
                    const symnbol = `${r.asset}${this.bot.homingAsset}`
                    return `
                    <tr>
                    <th>
                    ${r.asset} Gain: ${this.bot.performanceTracker.balance(symnbol, this.bot.getRecentPrice(symnbol))}
                    </th>
                    </tr>
                    <tr>
                    <td>
                    <canvas id="graphCanvas${r.asset}" width="${graphWidth}" height="${graphHeight}" style="width: ${graphWidth}px; height: ${graphHeight}px;"></canvas>
                    <script>
                        drawGraph(graphCanvas${r.asset}, ${JSON.stringify(r.data)}, ${JSON.stringify(r.tradeRecords)}, ${this.bot.timeInterval});
                    </script>
                    </td>
                    </tr>
                    `
                }).join("")
            }
            </table>
            `
        }

    }

}}