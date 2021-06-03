declare function require(s): any
declare const process: {
    argv: string[]
}

const fetch = require('node-fetch');
const CryptoJS = require('crypto-js');

com.danborutori.cryptoApi.Binance.shared.apiKey = process.argv[0]
com.danborutori.cryptoApi.Binance.shared.apiSecure = process.argv[1]
