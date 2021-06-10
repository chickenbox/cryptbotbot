namespace bot { export namespace graph {

    function drawGraph(
        canvas: HTMLCanvasElement,
        data: {
            normalizedPrice: number,
            smoothedPrice: number,
            time: number
        }[],
        tradeRecords: {
            color: string,
            price: number,
            time: number
        }[] ){
        const ctx = canvas.getContext("2d")!

        ctx.fillStyle = "#0000ff"
        ctx.fillRect(0,0,200,100)
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