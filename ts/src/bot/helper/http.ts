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

        constructor( port: number ){
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

            response.writeHead(200, { "Content-Type": "text/html" })
            response.end(`Hello World<br/>
            path: ${path}<br/>
            queryString: ${queryString}<br/>
            data: ${data}`)
        }

    }

}}