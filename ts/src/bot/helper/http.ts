namespace bot { export namespace helper {

    interface HttpServer {
        listen(port: number)
    }

    interface HttpRequest {
        url: string
        on(event: "data", handler: (chunk: string)=>void)
        on(event: "end", handler: ()=>void)
    }

    interface HttpResponse {
        writeHead( status, headers: {[header: string]: string} )
        end( body: string )
    }

    const http: {
        createServer( listener: (request: HttpRequest, response: HttpResponse)=>void ): HttpServer
    } = require("http")

    export class HttpHelper {

        private server: HttpServer

        constructor( readonly bot: bot.Bot, port: number ){
            this.server = http.createServer((request, response)=>{

                let data = ""

                request.on("data", chunk=>{
                    data += chunk
                })
                request.on("end", ()=>{
                    this.dispatch(request.url, data, response)
                })
            })
            this.server.listen(port)
        }

        private dispatch( url: string, data: string, response: HttpResponse ){

            const t = url.split("?")
            const path = t[0]
            const queryString = t[1]

            switch( path ){
            case "/showLog":
                this.showLog( response )
                break
            case "/goHome":
                this.goHome( response )
                break
            case "/goOut":
                this.goOut( response )
                break
            default:
                this.showUsage( response )
                break
            }
        }

        private showLog( response: HttpResponse ){
            response.writeHead(200, { "Content-Type": "application/json" })
            response.end(this.bot.log)
        }

        private goHome( response: HttpResponse ){
            this.bot.allow.buy = false
            this.bot.allow.sell = true

            response.writeHead(200, { "Content-Type": "application/json" })
            response.end("{\"success\":true}}")
        }

        private goOut( response: HttpResponse ){
            this.bot.allow.buy = true
            this.bot.allow.sell = true

            response.writeHead(200, { "Content-Type": "application/json" })
            response.end("{\"success\":true}}")
        }

        private showUsage( response: HttpResponse ){
            response.writeHead(200, { "Content-Type": "text/html" })
            response.end(`<html>
            <body>
            Status:<br/>
            <table>
            <tr>
            <td>allow</td><td>${JSON.stringify(this.bot.allow, null, 2)}</td>
            </tr>
            </table><br/>
            <br/>
            Path:<br/>
            <table>
            <tr>
            <td><a href="/showLog">/showLog</a></td><td>to print log</td>
            </tr>
            <tr>
            <td><a href="/goHome">/goHome</a></td><td>force all access to homing asset</td>
            </tr>
            <tr>
            <td><a href="/goOut">/goOut</a></td><td>Normal Trace</td>
            </tr>
            </table>
            </body>
            </html>`)
        }

    }

}}