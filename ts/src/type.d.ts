declare function setTimeout( Function, number ): number
declare function clearTimeout( number )
declare function setInterval( Function, number )
declare const console: {
    log( any )
    error( any )
}

declare class URLSearchParams {
    constructor( params: any )

    append( key: string, value: string )
}