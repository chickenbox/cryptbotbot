declare function require(s): any
declare const process: {
    argv: string[]
}

const LocalStorage = require("node-localstorage").LocalStorage
const localStorage: {
    getItem( s: string ): string
    setItem( s: string, v: string )
} = new LocalStorage('./scratch', 100*1024*1024)

const fetch = require('node-fetch')
const CryptoJS = require('crypto-js')

