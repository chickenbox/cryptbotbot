namespace bot { export namespace helper {

    const logLocalStorageKey = "Bot.log"

    export class Logger {

        private logs: {
            time: string
            tag: string
            message: any
        }[] = []
        private timeout: number

        get logString(){
            return localStorage.getItem(logLocalStorageKey)
        }

        constructor(
            readonly logLength: number
        ){
            const s = localStorage.getItem(logLocalStorageKey)
            if( s )
                this.logs = JSON.parse(s)
        }

        writeLog( message: any, tag: string ){

            const entry = {
                time: new Date().toString(),
                tag: tag,
                message: message
            }
            this.logs.push(entry)

            if( this.logs.length>this.logLength ){
                this.logs = this.logs.slice(this.logs.length-this.logLength)
            }

            if(this.timeout){
                clearTimeout( this.timeout)
                this.timeout = undefined
            }

            this.timeout = setTimeout(()=>{
                localStorage.setItem(logLocalStorageKey, JSON.stringify(this.logs,null,2))
            }, 10)
        }

        log( message: any ){
            if( typeof(message) == "string" ) {
                console.log( message )

                this.writeLog(message, "v")
            }else{
                console.log( JSON.stringify( message, null, 2 ) )

                this.writeLog(message, "v")
            }
        }

        warn( e: Error ){
            console.warn(e)
            this.writeLog( e.stack || e.message || JSON.stringify(e), "w")
        }

        error( e: Error ){
            console.error(e)
            this.writeLog( e.stack || e.message || JSON.stringify(e), "e")
        }
    }
}}
