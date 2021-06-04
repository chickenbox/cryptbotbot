declare function require(s): any
declare const process: {
    argv: string[]
}

const fetch = require('node-fetch');
const CryptoJS = require('crypto-js');
