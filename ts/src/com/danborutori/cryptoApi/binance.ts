namespace com { export namespace danborutori { export namespace cryptoApi {

    type SymbolStatus = "PRE_TRADING" | "TRADING" | "POST_TRADING" | "END_OF_DAY" | "HALT" | "AUCTION_MATCH" | "BREAK"
    type OrderType = "LIMIT" | "LIMIT_MAKER" | "MARKET" | "STOP_LOSS" | "STOP_LOSS_LIMIT" | "TAKE_PROFIT" | "TAKE_PROFIT_LIMIT"
    export type Interval = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "6h" | "8h" | "12h" | "1d" | "3d" | "1w" | "1M"
    export type Side = "BUY" | "SELL"


    interface ExchangeInfoResponse {

        timezone: string
        serverTime: number
        rateLimits: {
            rateLimitType: "REQUEST_WEIGHT" | "ORDERS" | "RAW_REQUESTS"
            interval: "SECOND" | "MINUTE" | "DAY"
            intervalNum: number
            limit: number
        }[]

        exchangeFilters: {
            filterType: "EXCHANGE_MAX_NUM_ORDERS" | "EXCHANGE_MAX_NUM_ALGO_ORDERS"
            maxNumAlgoOrders: number
        }[]

        symbols: {
            symbol: string
            status: SymbolStatus
            baseAsset: string
            baseAssetPrecision: number
            quoteAsset: string
            quotePrecision: number // will be removed in future api versions (v4+)
            quoteAssetPrecision: number
            baseCommissionPrecision: number
            quoteCommissionPrecision: number
            orderTypes: OrderType[]
            icebergAllowed: boolean
            ocoAllowed: boolean
            quoteOrderQtyMarketAllowed: boolean
            isSpotTradingAllowed: boolean
            isMarginTradingAllowed: boolean
            filters: [
                //These are defined in the Filters section.
                //All filters are optional
            ]
            permissions: string[]
        }[]
    }

    export interface KlineCandlestickData {
        openTime: Date,
        open: number,
        high: number,
        low: number,
        close: number,
        volume: number,
        closeTime: Date,
        quoteAssetVolume: number,
        numberOfTrades: number,
        takerBuyBaseAssetVolume: number,
        takerBuyQuoteAssetVolume: number
    }

    export interface AccountInfo {
        makerCommission: number
        takerCommission: number
        buyerCommission: number
        sellerCommission: number
        canTrade: boolean
        canWithdraw: boolean
        canDeposit: boolean
        updateTime: number
        accountType: string
        balances: {
            asset: string
            free: string
            locked: string
        }[]
        permissions: string[]
    }

    export interface NewOrderResponse {
        symbol: string
        orderId: number
        orderListId: number
        clientOrderId: string
        transactTime: number
    }

    export class Binance {
        static shared = new Binance()

        public apiKey?: string
        public apiSecure?: string

        fullUrl( path: string ){
            return `https://api.binance.com/api/v3${path}`
        }

        async getExchangeInfo() {

            const response = await fetch( this.fullUrl("/exchangeInfo") )
            return await response.json() as ExchangeInfoResponse

        }

        async getKlineCandlestickData(
            symbol: string,
            interval: Interval,
            options?: {
                startTime?: number
                endTime?: number
                limit? : number //Default 500; max 1000.
            }
        ): Promise<KlineCandlestickData[]>{

            const params = new URLSearchParams({
                symbol: symbol,
                interval: interval
            })
            options = options || {}
            for( let name in options ){
                params.append(name, options[name])
            }

            const respsone = await fetch( this.fullUrl("/klines") +"?"+ params )

            return (await respsone.json() as any[][]).map(d=>{

                return {
                    openTime: new Date(d[0]),
                    open: parseFloat( d[1] ),
                    high: parseFloat( d[2] ),
                    low: parseFloat( d[3] ),
                    close: parseFloat( d[4] ),
                    volume: parseFloat( d[5] ),
                    closeTime: new Date(d[6]),
                    quoteAssetVolume: parseFloat(d[7]),
                    numberOfTrades: parseInt( d[8] ),
                    takerBuyBaseAssetVolume: parseFloat(d[9]),
                    takerBuyQuoteAssetVolume: parseFloat(d[10])
                }
            })   
        }

        async getServerTime(){
            const response = await fetch(this.fullUrl("/time"))
            const json = await response.json()
            return json.serverTime
        }

        sign(queryString: URLSearchParams){
            const hash = CryptoJS.HmacSHA256(queryString.toString(), this.apiSecure);
            return queryString+"&signature="+hash
        }

        async getAccountInfo(): Promise<AccountInfo>{

            const params = new URLSearchParams({
                timestamp: await this.getServerTime()
            })

            const response = await fetch( this.fullUrl("/account")+"?"+this.sign(params), {
                method: "GET",
                headers: {
                    "X-MBX-APIKEY": this.apiKey
                }
            } )

            return response.json()
        }

        async newOrder(symbol: string, side: Side, quantity: number, type: OrderType = "MARKET"): Promise<NewOrderResponse>{
            const params = new URLSearchParams({
                timestamp: await this.getServerTime()
            })

            const response = await fetch( this.fullUrl("/order"), {
                method: "POST",
                headers: {
                    "X-MBX-APIKEY": this.apiKey
                },
                body: this.sign(params)
            } )

            return response.json()
        }
    }
}}}