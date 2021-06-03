var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var com;
(function (com) {
    let danborutori;
    (function (danborutori) {
        let cryptoApi;
        (function (cryptoApi) {
            class Binance {
                fullUrl(path) {
                    return `https://api.binance.com/api/v3${path}`;
                }
                getExchangeInfo() {
                    return __awaiter(this, void 0, void 0, function* () {
                        const response = yield fetch(this.fullUrl("/exchangeInfo"));
                        return yield response.json();
                    });
                }
                getKlineCandlestickData(symbol, interval, options) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const params = new URLSearchParams({
                            symbol: symbol,
                            interval: interval
                        });
                        options = options || {};
                        for (let name in options) {
                            params.append(name, options[name]);
                        }
                        const respsone = yield fetch(this.fullUrl("/klines") + "?" + params);
                        return (yield respsone.json()).map(d => {
                            return {
                                openTime: new Date(d[0]),
                                open: parseFloat(d[1]),
                                high: parseFloat(d[2]),
                                low: parseFloat(d[3]),
                                close: parseFloat(d[4]),
                                volume: parseFloat(d[5]),
                                closeTime: new Date(d[6]),
                                quoteAssetVolume: parseFloat(d[7]),
                                numberOfTrades: parseInt(d[8]),
                                takerBuyBaseAssetVolume: parseFloat(d[9]),
                                takerBuyQuoteAssetVolume: parseFloat(d[10])
                            };
                        });
                    });
                }
                getServerTime() {
                    return __awaiter(this, void 0, void 0, function* () {
                        const response = yield fetch(this.fullUrl("/time"));
                        const json = yield response.json();
                        return json.serverTime;
                    });
                }
                sign(queryString) {
                    const hash = CryptoJS.HmacSHA256(queryString.toString(), this.apiSecure);
                    return queryString + "&signature=" + hash;
                }
                getAccountInfo() {
                    return __awaiter(this, void 0, void 0, function* () {
                        const params = new URLSearchParams({
                            timestamp: yield this.getServerTime()
                        });
                        const response = yield fetch(this.fullUrl("/account") + "?" + this.sign(params), {
                            method: "GET",
                            headers: {
                                "X-MBX-APIKEY": this.apiKey
                            }
                        });
                        return response.json();
                    });
                }
                newOrder(symbol, side, quantity, type = "MARKET") {
                    return __awaiter(this, void 0, void 0, function* () {
                        const params = new URLSearchParams({
                            timestamp: yield this.getServerTime()
                        });
                        const response = yield fetch(this.fullUrl("/order"), {
                            method: "POST",
                            headers: {
                                "X-MBX-APIKEY": this.apiKey
                            },
                            body: this.sign(params)
                        });
                        return response.json();
                    });
                }
            }
            Binance.shared = new Binance();
            cryptoApi.Binance = Binance;
        })(cryptoApi = danborutori.cryptoApi || (danborutori.cryptoApi = {}));
    })(danborutori = com.danborutori || (com.danborutori = {}));
})(com || (com = {}));
const fetch = require('node-fetch');
const CryptoJS = require('crypto-js');
com.danborutori.cryptoApi.Binance.shared.apiKey = process.argv[0];
com.danborutori.cryptoApi.Binance.shared.apiSecure = process.argv[1];
