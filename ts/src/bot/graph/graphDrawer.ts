namespace bot { export namespace graph {

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
        }[] ){
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
            if( d.time >= start || d.time <= end ){
                max = Math.max(d.normalizedPrice, max)
                min = Math.min(d.normalizedPrice, min)
            }
        }
        const range = max-min

        ctx.strokeStyle = "black"
        ctx.beginPath()
        ctx.moveTo( (data[0].time-start)*w/timeRange, (data[0].normalizedPrice-min)*h/range )
        for( let d of data.slice(1) ){
            ctx.lineTo( (data[0].time-start)*w/timeRange, (data[0].normalizedPrice-min)*h/range )
        }
        ctx.stroke()

        ctx.strokeStyle = "green"
        ctx.beginPath()
        ctx.moveTo( (data[0].time-start)*w/timeRange, (data[0].smoothedPrice-min)*h/range )
        for( let d of data.slice(1) ){
            ctx.lineTo( (data[0].time-start)*w/timeRange, (data[0].normalizedPrice-min)*h/range )
        }
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

            for( let baseAsset in this.bot.tradeHistory.history ){
                const trendWatcher = this.bot.trendWatchers[baseAsset]

                if( trendWatcher ){
                    assets.push({
                        asset: baseAsset,
                        data: trendWatcher.normalized.data.map((d,i)=>{
                            return {
                                normalizedPrice: d.price,
                                smoothedPrice: trendWatcher.normalized.smoothedData[i].price,
                                time: d.time.getTime()
                            }
                        }),
                        tradeRecords: this.bot.tradeHistory.history[baseAsset].map(h=>{
                            return {
                                color: h.side=="buy"?"blue":"yellow",
                                time: h.time.getTime()
                            }
                        })
                    })
                }
            }

            return `
            <script>
            ${drawGraph.toString()}
            </script>
            <table>
            ${
                assets.map(r=>{
                    return `
                    <tr>
                    <td>
                    ${r.asset}
                    </td>
                    </tr>
                    <tr>
                    <td>
                    <canvas id="graphCanvas" width="200" height="100" style="width: 200px; height: 100px;"></canvas>
                    <script>
                        drawGraph(graphCanvas, ${JSON.stringify(r.data)}, ${JSON.stringify(r.tradeRecords)});
                    </script>
                    </td>
                    </tr>
                    `
                }).join()
            }
            </table>
            `
        }

    }

}}