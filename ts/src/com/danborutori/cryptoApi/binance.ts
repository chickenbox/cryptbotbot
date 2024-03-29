namespace com { export namespace danborutori { export namespace cryptoApi {

    function sleep( second: number ){
        if( second>0 ){
            return new Promise<void>( (resolve, reject)=>{
                setTimeout(function(){
                    resolve()
                }, second*1000)
            })
        }else{
            return Promise.resolve()
        }
    }

    async function autoRetryFetch( input: RequestInfo, init?: RequestInit ){
        let retryCount = 0
        while(true){
            try{
                return await fetch(input, init)
            }catch(e){
                switch( e.errno ){
                case "EAI_AGAIN":
                case "EAI_BADFLAGS":
                case "EAI_FAIL":
                case "EAI_FAMILY":
                case "EAI_MEMORY":
                case "EAI_NONAME":
                case "EAI_SERVICE":
                case "EAI_SOCKTYPE":
                    if( retryCount<10 ){
                        // backoff 3 second than retry
                        await sleep(3)
                        retryCount++
                    }
                    break
                default:
                    throw e
                }
            }
        }
    }

    type SymbolStatus = "PRE_TRADING" | "TRADING" | "POST_TRADING" | "END_OF_DAY" | "HALT" | "AUCTION_MATCH" | "BREAK"
    type OrderType = "LIMIT" | "LIMIT_MAKER" | "MARKET" | "STOP_LOSS" | "STOP_LOSS_LIMIT" | "TAKE_PROFIT" | "TAKE_PROFIT_LIMIT"
    export type Interval = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "6h" | "8h" | "12h" | "1d" | "3d" | "1w" | "1M"
    export type Side = "BUY" | "SELL"
    type OrderStatus = "NEW" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "PENDING_CANCEL" | "REJECTED" | "EXPIRED"
    type TimeInForce = "GTC" | "IOC" | "FOK"
    type Permission = "SPOT" | "MARGIN"

    interface ErrorResponse {
        code: number
        msg: string
    }

    interface Filter {
        filterType: "LOT_SIZE" | "MIN_NOTIONAL" | "MARKET_LOT_SIZE" | "PRICE_FILTER"
    }

    export interface FilterLotSize {
        filterType: "LOT_SIZE"
        minQty: string
        maxQty: string
        stepSize: string
    }

    export interface FilterMinNotional {
        filterType: "MIN_NOTIONAL"
        minNotional: string
        applyToMarket: boolean
        avgPriceMins: number
    }

    export interface FilterMarketLotSize {
        filterType: "MARKET_LOT_SIZE"
        minQty: string
        maxQty: string
        stepSize: string
    }

    export interface FilterPrice {
        filterType: "PRICE_FILTER"
        minPrice: string
        maxPrice: string
        tickSize: string
    }

    export interface FilterMaxNumOrders {
        filterType: "MAX_NUM_ORDERS"
        maxNumOrders: number
    }

    export interface FilterMaxNumAlgoOrders {
        filterType: "MAX_NUM_ALGO_ORDERS"
        maxNumAlgoOrders: number
    }

    export interface ExchangeInfoSymbol {
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
        filters: (Filter | FilterMaxNumOrders | FilterMaxNumAlgoOrders)[]
            //These are defined in the Filters section.
            //All filters are optional
        permissions: Permission[]
    }

    export interface ExchangeInfoResponse {

        timezone: string
        serverTime: number
        rateLimits: {
            rateLimitType: "REQUEST_WEIGHT" | "ORDERS" | "RAW_REQUESTS"
            interval: "SECOND" | "MINUTE" | "DAY"
            intervalNum: number
            limit: number
        }[]

        exchangeFilters: (FilterMaxNumOrders | FilterMaxNumAlgoOrders) []

        symbols: ExchangeInfoSymbol[]
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

    export interface NewOrderAckResponse {
        symbol: string
        orderId: number
        orderListId: number
        clientOrderId: string
        transactTime: number
    }

    export interface NewOrderResultResponse extends NewOrderAckResponse {
        price: string
        origQty: string
        executedQty: string
        cummulativeQuoteQty: string
        status: OrderStatus
        timeInForce: TimeInForce
        type: OrderType
        side: Side
    }

    export interface NewOrderFullResponse extends NewOrderResultResponse {
        fills?: {
            price: string,
            qty: string,
            commission: string,
            commissionAsset: string
        }[]
    }

    interface Order {
        symbol: string
        orderId: number
        orderListId: number //Unless OCO, the value will always be -1
        clientOrderId: string
        price: string
        origQty: string
        executedQty: string
        cummulativeQuoteQty: string
        status: OrderStatus
        timeInForce: TimeInForce
        type: OrderType
        side: Side
    }

    interface CurrentOpenOrder extends Order {
        stopPrice: string
        icebergQty: string
        time: number
        updateTime: number
        isWorking: boolean
        origQuoteOrderQty: string
    }

    export type Environment = "PRODUCTION" | "SPOT"

    class RateLimiter {
        readonly orderPerSecond = 5
        readonly requestPerMinute = 600

        private requestTimestamps: number[] = []
        private orderTimestamps: number[] = []

        async request( weight: number = 1 ){
            let now: number
            while(true){
                now = Date.now()
                while( this.requestTimestamps.length>0 && this.requestTimestamps[0]<now-1000*60 ){
                    this.requestTimestamps.splice(0,1)
                }

                if( this.requestTimestamps.length>=this.requestPerMinute ){
                    await sleep( 60-(now-this.requestTimestamps[0])/1000 )
                }else
                    break
            }

            for( let i=0; i<weight; i++ )
                this.requestTimestamps.push(now)
        }

        async order(){
            let now: number
            while(true){
                now = Date.now()
                while( this.orderTimestamps.length>0 && this.orderTimestamps[0]<now-1000 ){
                    this.orderTimestamps.splice(0,1)
                }

                if( this.orderTimestamps.length>=this.orderPerSecond ){
                    await sleep( 1-(now-this.orderTimestamps[0])/1000 )
                }else
                    break
            }

            this.orderTimestamps.push(now)
        }
    }

    export class Binance {
        fullUrl( path: string ){
            switch( this.env ){
            case "PRODUCTION":
            return `https://api.binance.com/api/v3${path}`
            default:
                return `https://testnet.binance.vision/api/v3${path}`
            }
        }

        private rateLimiter = new RateLimiter()

        constructor(
            private apiKey?: string,
            private apiSecure?: string,
            private env: Environment = "SPOT"
        ){}

        async getExchangeInfo() {
            await this.rateLimiter.request()

            const response = await autoRetryFetch( this.fullUrl("/exchangeInfo") )
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
            await this.rateLimiter.request()

            const params = new URLSearchParams({
                symbol: symbol,
                interval: interval
            })
            options = options || {}
            for( let name in options ){
                if(options[name]!==undefined)
                    params.append(name, options[name])
            }

            const respsone = await autoRetryFetch( this.fullUrl("/klines") +"?"+ params )

            const json: any[][] = await respsone.json()
            return json.map(d=>{

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

        async getSymbolPriceTicker(): Promise<{symbol: string; price: string}[]>
        async getSymbolPriceTicker(symbol: string): Promise<{symbol: string; price: string}>
        async getSymbolPriceTicker( symbol?: string ){
            await this.rateLimiter.request()

            const params = new URLSearchParams()
            if( symbol )
                params.append("symbol", symbol)

            const response = await autoRetryFetch(this.fullUrl("/ticker/price") +"?"+ params)
            const json = await response.json()
            return json
        }

        async getServerTime(){
            await this.rateLimiter.request()

            const response = await autoRetryFetch(this.fullUrl("/time"))
            const json = await response.json()
            return json.serverTime
        }

        sign(queryString: URLSearchParams){
            const hash = CryptoJS.HmacSHA256(queryString.toString(), this.apiSecure);
            return queryString+"&signature="+hash
        }

        async getAccountInfo(): Promise<AccountInfo>{
            await this.rateLimiter.request()

            const params = new URLSearchParams({
                timestamp: await this.getServerTime()
            })

            const response = await autoRetryFetch( this.fullUrl("/account")+"?"+this.sign(params), {
                method: "GET",
                headers: {
                    "X-MBX-APIKEY": this.apiKey
                }
            } )

            return response.json()
        }

        async newOrder(symbol: string, side: Side, quantity?: number, quoteQuantity?: number, type: OrderType = "MARKET", price?: number ): Promise<NewOrderFullResponse> {
            await this.rateLimiter.order()

            const params = new URLSearchParams({
                symbol: symbol,
                side: side,
                type: type,
                newOrderRespType: "FULL",
                timestamp: await this.getServerTime()
            })

            if( quantity!==undefined ){
                params.append("quantity", quantity.toString())
            }
            if( quoteQuantity!==undefined ){
                params.append("quoteOrderQty", quoteQuantity.toString())
            }
            if( price!==undefined ){
                params.append("price", price.toString())
                params.append("stopPrice", price.toString())
                params.append("timeInForce", "GTC")
            }

            const response = await autoRetryFetch( this.fullUrl("/order"), {
                method: "POST",
                headers: {
                    "X-MBX-APIKEY": this.apiKey
                },
                body: this.sign(params)
            } )

            if( Math.floor(response.status/100)==2 ){
                return response.json()
            }else{
                throw await response.json() as ErrorResponse
            }
        }

        async testOrder(symbol: string, side: Side, quantity?: number, quoteQuantity?: number, type: OrderType = "MARKET"): Promise<NewOrderFullResponse>{
            await this.rateLimiter.request()

            const params = new URLSearchParams({
                symbol: symbol,
                side: side,
                type: type,
                newOrderRespType: "FULL",
                timestamp: await this.getServerTime()
            })

            if( quantity!==undefined ){
                params.append("quantity", quantity.toString())
            }
            if( quoteQuantity!==undefined ){
                params.append("quoteOrderQty", quoteQuantity.toString())
            }

            const response = await autoRetryFetch( this.fullUrl("/order/test"), {
                method: "POST",
                headers: {
                    "X-MBX-APIKEY": this.apiKey
                },
                body: this.sign(params)
            } )

            if( Math.floor(response.status/100)==2 ){
                return response.json()
            }else{
                throw await response.json() as ErrorResponse
            }
        }

        async queryOrder( symbol: string, orderId: number ): Promise<CurrentOpenOrder>{
            await this.rateLimiter.request()

            const params = new URLSearchParams({
                symbol: symbol,
                orderId: orderId.toString(),
                timestamp: await this.getServerTime()
            })

            const response = await autoRetryFetch( this.fullUrl("/order")+"?"+this.sign(params), {
                method: "GET",
                headers: {
                    "X-MBX-APIKEY": this.apiKey
                }
            } )

            return response.json()
        }

        async cancelOrder( symbol: string, orderId: number ): Promise<Order>{
            await this.rateLimiter.request()

            const params = new URLSearchParams({
                symbol: symbol,
                orderId: orderId.toString(),
                timestamp: await this.getServerTime()
            })

            const response = await autoRetryFetch( this.fullUrl("/order")+"?"+this.sign(params), {
                method: "DELETE",
                headers: {
                    "X-MBX-APIKEY": this.apiKey
                }
            } )

            return response.json()
        }

        async getOpenOrders( symbol?: string ): Promise<Order[]> {
            await this.rateLimiter.request( symbol?3:40 )

            const params = new URLSearchParams({
                timestamp: await this.getServerTime()
            })
            if( symbol )
            params.set("symbol", symbol)

            const response = await autoRetryFetch( this.fullUrl("/openOrders")+"?"+this.sign(params), {
                method: "GET",
                headers: {
                    "X-MBX-APIKEY": this.apiKey
                }
            } )
         
            return response.json()
        }

        async cancelAllOpenOrders(): Promise<Order[]> {
            const openOrders = await this.getOpenOrders()

            const cancelledOrders: Order[] = []

            await Promise.all( openOrders.map( async order=>{
                switch (order.status) {
                    case "NEW":
                        await this.rateLimiter.request()

                        const params = new URLSearchParams({
                            symbol: order.symbol,
                            orderId: order.orderId.toString(),
                            timestamp: await this.getServerTime()
                        })
            
                        const response = await autoRetryFetch( this.fullUrl("/order")+"?"+this.sign(params), {
                            method: "DELETE",
                            headers: {
                                "X-MBX-APIKEY": this.apiKey
                            }
                        } )

                        cancelledOrders.push(await response.json())
                        break
                }
            }))
         
            return cancelledOrders
        }

        async getCurrentOpenOrders( symbol?: string ): Promise<CurrentOpenOrder[]>{
            await this.rateLimiter.request()

            const params = new URLSearchParams({
                timestamp: await this.getServerTime()
            })

            symbol!==undefined && params.append("symbol", symbol)

            const response = await autoRetryFetch( this.fullUrl("/openOrders")+"?"+this.sign(params), {
                method: "GET",
                headers: {
                    "X-MBX-APIKEY": this.apiKey
                }
            } )
         
            return response.json()
        }

        async getAllOrders( symbol: string, startTime?: number, orderId?: number ): Promise<CurrentOpenOrder[]>{

            await this.rateLimiter.request(10)

            const params = new URLSearchParams({
                symbol: symbol,
                timestamp: await this.getServerTime()
            })

            if( orderId!==undefined ){
                params.set("orderId", orderId.toString() )
            }

            if( startTime!==undefined ){
                params.set("startTime", startTime.toString() )
            }

            const response = await autoRetryFetch( this.fullUrl("/allOrders")+"?"+this.sign(params), {
                method: "GET",
                headers: {
                    "X-MBX-APIKEY": this.apiKey
                }
            } )
         
            return response.json()
        }        
    }
}}}