namespace bot { export namespace helper {

    export function snapTime( time: number, interval: number ){

        return Math.floor(time/interval)*interval

    }

}}