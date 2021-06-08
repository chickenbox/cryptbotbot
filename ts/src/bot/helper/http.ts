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
            case "/home":
                this.homing( response )
                break
            case "/outGoing":
                this.outGoing( response )
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

        private homing( response: HttpResponse ){
            // TODO:
        }

        private outGoing( response: HttpResponse ){
            // TODO:
        }

        private showUsage( response: HttpResponse ){
            response.writeHead(200, { "Content-Type": "text/html" })
            response.end(`<html>
            <body>
            Path:<br/>
            <table>
            <tr>
            <td>/showLog</td><td>to print log</td>
            </tr>
            <tr>
            <td>/home</td><td>force all access to homing asset</td>
            </tr>
            <tr>
            <td>/outGoing</td><td>free all homing asset</td>
            </tr>
            </table>
            </body>
            </html>`)
        }

    }

}}