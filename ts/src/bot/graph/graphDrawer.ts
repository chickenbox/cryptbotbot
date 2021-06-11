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
        const range = max-min

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

        for( let r of tradeRecords ){
            ctx.strokeStyle = r.color
            ctx.lineWidth = 1
            const x = (r.time-start)*w/timeRange
            ctx.beginPath()
            ctx.moveTo(x,0)
            ctx.lineTo(x,h)
            ctx.stroke()
        }
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
                    data: trendWatcher.normalized.data.map((d,i)=>{
                        return {
                            normalizedPrice: d.price,
                            smoothedPrice: trendWatcher.normalized.smoothedData[i].price,
                            time: d.time.getTime()
                        }
                    }),
                    tradeRecords: history ? history.map(h=>{
                        return {
                            color: h.side=="buy"?"blue":"yellow",
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
            ${
                assets.map(r=>{
                    return `
                    <tr>
                    <th>
                    ${r.asset}
                    </th>
                    </tr>
                    <tr>
                    <td>
                    <canvas id="graphCanvas${r.asset}" width="${graphWidth}" height="${graphHeight}" style="width: ${graphWidth}px; height: ${graphHeight}px;"></canvas>
                    <script>
                        drawGraph(graphCanvas${r.asset}, ${JSON.stringify(r.data)}, ${JSON.stringify(r.tradeRecords)}, ${this.bot.dataIntervalTime});
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