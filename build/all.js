var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const LocalStorage = require("node-localstorage").LocalStorage;
const localStorage = new LocalStorage('./scratch', 100 * 1024 * 1024);
const fetch = require('node-fetch');
const CryptoJS = require('crypto-js');
var bot;
(function (bot) {
    bot.graphInterval = 180 * 24 * 60 * 60 * 1000;
})(bot || (bot = {}));
var bot;
(function (bot) {
    let trader;
    (function (trader) {
        class Trader {
            constructor() {
                this.performanceTracker = new bot.helper.PerformanceTracker();
            }
        }
        trader.Trader = Trader;
    })(trader = bot.trader || (bot.trader = {}));
})(bot || (bot = {}));
const fs = require("fs");
fs.readFile(process.argv[2], "utf8", function (err, data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (err) {
            return console.log(err);
        }
        else {
            const config = JSON.parse(data);
            const b = new bot.Bot({
                homingAsset: "USDT",
                interval: "12h",
                maxAllocation: 1 / 10,
                maxAbsoluteAllocation: 2000,
                logLength: 10000,
                holdingBalance: config.holdingBalance,
                minimumOrderQuantity: 10,
                apiKey: config.apiKey,
                apiSecure: config.apiSecret,
                environment: config.env,
                trader: config.trader,
                blackList: config.blackList,
                markup: 0.5
            });
            yield b.init();
            const httpHelper = new bot.helper.HttpHelper(b, 3333, config.password);
            if (config.testBinanceTrader) {
                const tester = new bot.helper.TestBinanceTrader();
                yield tester.test(b.binance, b.logger);
            }
            if (config.mock) {
                yield b.mock();
            }
            b.run();
        }
    });
});
const version = "1.0.1";
var bot;
(function (bot) {
    function sleep(second) {
        return new Promise((resolve, reject) => {
            setTimeout(function () {
                resolve();
            }, second * 1000);
        });
    }
    function getMinQty(symbol) {
        return Math.max(bot.helper.getLotSize(symbol).minQty, bot.helper.getMarketLotSize(symbol).minQty);
    }
    function getTrend(trendWatcher, index) {
        let trend = "side";
        if (index > 0) {
            const lastCrossIndex = trendWatcher.lastCrossIndex[index - 1];
            const upRate = 0.0001;
            const s = 1 + (index - lastCrossIndex) * upRate;
            if (trendWatcher.ma14[index] > trendWatcher.ma14[lastCrossIndex] * s &&
                trendWatcher.ma24[index] > trendWatcher.ma24[lastCrossIndex] * s) {
                trend = "up";
            }
            else if (trendWatcher.ma14[index] < trendWatcher.ma14[lastCrossIndex] &&
                trendWatcher.ma24[index] < trendWatcher.ma24[lastCrossIndex]) {
                trend = "down";
            }
        }
        return trend;
    }
    class Bot {
        constructor(config) {
            this.tradeHistory = new bot.trader.History();
            this.trendWatchers = {};
            this.allow = {
                buy: true,
                sell: true
            };
            this.binance = new com.danborutori.cryptoApi.Binance(config.apiKey, config.apiSecure, config.environment);
            this.logger = new bot.helper.Logger(config.logLength);
            switch (config.trader) {
                case "BINANCE":
                    this.trader = new bot.trader.BinanceTrader(this.binance, this.logger);
                    break;
                default:
                    this.trader = new bot.trader.MockTrader(this.binance);
                    break;
            }
            this.priceTracker = new bot.helper.PriceTracker(this.binance);
            this.shop = new bot.shop.Shop(this.binance, config.markup, this.logger);
            this.balanceTracker = new bot.helper.BalanceTracker();
            this.homingAsset = config.homingAsset;
            this.interval = config.interval;
            this.maxAllocation = config.maxAllocation;
            this.maxAbsoluteAllocation = config.maxAbsoluteAllocation;
            this.holdingBalance = config.holdingBalance;
            this.minimumOrderQuantity = config.minimumOrderQuantity;
            this.whiteList = new Set();
            this.blackList = new Set(config.blackList);
        }
        get log() {
            return this.logger.logString;
        }
        get timeInterval() {
            return bot.helper.intervalToMilliSec(this.interval);
        }
        init() {
            return __awaiter(this, void 0, void 0, function* () {
                const exchangeInfo = yield this.binance.getExchangeInfo();
                this.updateWhiteList(exchangeInfo);
            });
        }
        updateWhiteList(exchangeInfo) {
            const filteredSymbols = exchangeInfo.symbols.filter(s => {
                return s.quoteAsset == this.homingAsset &&
                    s.status == "TRADING" &&
                    s.orderTypes.indexOf("MARKET") >= 0 &&
                    s.permissions.indexOf("SPOT") >= 0 &&
                    s.isSpotTradingAllowed;
            });
            for (let baseAsset of filteredSymbols.map(s => s.baseAsset))
                this.whiteList.add(baseAsset);
        }
        getRecentPrice(symbol, time) {
            const p = this.priceTracker.prices[symbol];
            if (p) {
                let index = p.findIndex(function (e, idx) {
                    return idx + 1 < p.length ? p[idx + 1].time > time : true;
                });
                if (index >= 0)
                    return p[index].price;
            }
        }
        getHomingTotal(balances, time) {
            let homingTotal = balances[this.homingAsset];
            for (let b in balances) {
                let currentPrice = this.getRecentPrice(`${b}${this.homingAsset}`, time);
                if (currentPrice !== undefined) {
                    homingTotal += balances[b] * currentPrice;
                }
            }
            return homingTotal;
        }
        mock() {
            return __awaiter(this, void 0, void 0, function* () {
                const whiteSymbols = new Set(Array.from(this.whiteList).map(asset => `${asset}${this.homingAsset}`));
                yield this.priceTracker.update(this.interval, whiteSymbols);
                this.trader.performanceTracker.reset();
                const balances = yield this.trader.getBalances();
                for (let k in balances) {
                    delete balances[k];
                }
                balances[this.homingAsset] = 10000;
                const history = yield this.tradeHistory.history;
                for (let k in history) {
                    delete history[k];
                }
                this.balanceTracker.balances.length = 0;
                let end = 0;
                for (let t in this.priceTracker.prices) {
                    const p = this.priceTracker.prices[t];
                    end = Math.max(end, p[p.length - 1].time);
                }
                end = bot.helper.snapTime(end, this.timeInterval);
                const start = bot.helper.snapTime(end - bot.graphInterval, this.timeInterval);
                this.logger.log("Start Mock");
                for (let t = start; t < end; t += this.timeInterval) {
                    this.logger.log(`Mocking: ${new Date(t).toUTCString()}`);
                    yield this.performTrade(t);
                }
                this.logger.log("End Mock");
            });
        }
        run() {
            return __awaiter(this, void 0, void 0, function* () {
                const now = Date.now();
                try {
                    try {
                        yield this.performTrade();
                    }
                    catch (e) {
                        this.logger.error(e);
                    }
                }
                catch (e) {
                    this.logger.error(e);
                }
                // align data time slot
                const nextTime = bot.helper.snapTime(now, this.timeInterval) + this.timeInterval;
                const timeout = nextTime - now;
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield this.run();
                    }
                    catch (e) {
                        this.logger.error(e);
                    }
                }), timeout);
            });
        }
        getAction(baseAsset, trendWatcher, index) {
            const data = trendWatcher.data;
            let action = "none";
            let trend = getTrend(trendWatcher, index);
            if (index >= 100 // long enough history
                &&
                    trendWatcher.ratio[index] > 1.1 // filter low profit asset
                &&
                    trendWatcher.data[index].price < trendWatcher.ma14[index] * 1.1 // filter impulse
                &&
                    this.allow.buy) {
                switch (trend) {
                    case "up":
                        {
                            if (index > 0 &&
                                trendWatcher.ma14[index - 1] < trendWatcher.ma24[index - 1] &&
                                trendWatcher.ma14[index] >= trendWatcher.ma24[index]) {
                                const lastCIdx = trendWatcher.lastCrossIndex[index - 1];
                                if (lastCIdx >= 1) {
                                    const lastlastCIdx = trendWatcher.lastCrossIndex[lastCIdx - 1];
                                    const trendSlope0 = (trendWatcher.ma14[index] - trendWatcher.ma14[lastCIdx]) / (index - lastCIdx);
                                    const trendSlope1 = (trendWatcher.ma14[lastCIdx] - trendWatcher.ma14[lastlastCIdx]) / (lastCIdx - lastlastCIdx);
                                    if (trendSlope0 > trendSlope1 * 0.8)
                                        action = "buy";
                                }
                            }
                        }
                        break;
                }
            }
            if (action == "none" && this.allow.sell) {
                if (index >= 2 && trendWatcher.data[index].price / trendWatcher.data[index - 2].price > 1.5) { // raise cutoff
                    action = "sell";
                }
                else if (trendWatcher.data[index].price < trendWatcher.ma24[index] * 0.95) // drop cutoff
                    action = "sell";
                else {
                    if (trendWatcher.ma14[index] <= trendWatcher.ma24[index]) {
                        action = "sell";
                    }
                }
            }
            return [action, trend];
        }
        scoreDecision(trendWatcher, lastIdx, balance) {
            return new bot.helper.DecisionScorer().score(trendWatcher, lastIdx, balance);
        }
        makeDecision(trader, symbol, time, isMock) {
            if (symbol.baseAsset == this.homingAsset)
                return undefined;
            try {
                let trendWatcher;
                if (isMock) {
                    trendWatcher = this.trendWatchers[symbol.baseAsset];
                }
                const data = trendWatcher ?
                    trendWatcher.data :
                    this.priceTracker.getConstantIntervalPrice(symbol.symbol, this.timeInterval);
                const index = data.findIndex(function (d, i) {
                    return i + 1 < data.length ? data[i + 1].time > time : true;
                });
                // sell if no recent data
                if (data.length < 10) {
                    return {
                        symbol: symbol,
                        action: "sell",
                        trend: "side",
                        score: 0
                    };
                }
                if (!trendWatcher) {
                    trendWatcher = new bot.helper.TrendWatcher(symbol.baseAsset, data, this.timeInterval);
                }
                this.trendWatchers[symbol.baseAsset] = trendWatcher;
                // missing candle
                const timeDiff = (time - data[index].time);
                if (timeDiff > this.timeInterval * 1.1) {
                    return undefined;
                }
                const high = data.reduce((a, b) => Math.max(a, b.price), Number.NEGATIVE_INFINITY);
                const low = data.reduce((a, b) => Math.min(a, b.price), Number.POSITIVE_INFINITY);
                if (this.blackList.has(symbol.baseAsset))
                    return {
                        symbol: symbol,
                        action: "sell",
                        trend: "side",
                        score: 0
                    };
                if (trendWatcher.data.length > 2) {
                    let [action, trend] = this.getAction(symbol.baseAsset, trendWatcher, index);
                    return {
                        symbol: symbol,
                        price: trendWatcher.data[index].price,
                        index: index,
                        action: action,
                        trend: trend,
                        score: this.scoreDecision(trendWatcher, index, trader.performanceTracker.balance(symbol.symbol, this.getRecentPrice(symbol.symbol, time)))
                    };
                }
            }
            catch (e) {
                this.logger.error(e);
            }
            return undefined;
        }
        performTrade(mockTime) {
            return __awaiter(this, void 0, void 0, function* () {
                const isMock = mockTime !== undefined;
                const now = mockTime === undefined ? new Date() : new Date(mockTime);
                this.logger.log("=================================");
                this.logger.log(`Execution Log ${now}`);
                this.logger.log(`delta: ${(now.getTime() - bot.helper.snapTime(now.getTime(), this.timeInterval)) / 1000}s`);
                this.logger.log("=================================");
                const exchangeInfo = isMock && this.exchangeInfoCache ? this.exchangeInfoCache : yield this.binance.getExchangeInfo();
                this.exchangeInfoCache = exchangeInfo;
                if (!isMock)
                    this.updateWhiteList(exchangeInfo);
                const whiteSymbols = new Set(Array.from(this.whiteList).map(asset => `${asset}${this.homingAsset}`));
                isMock || (yield this.priceTracker.update(this.interval, whiteSymbols));
                if (!isMock) {
                    yield this.shop.checkOpenedOrders(exchangeInfo.symbols, this.trader.performanceTracker, this.tradeHistory);
                }
                let symbols = exchangeInfo.symbols;
                symbols = symbols.filter(s => {
                    return s.quoteAsset == this.homingAsset &&
                        this.whiteList.has(s.baseAsset);
                });
                const decisions = symbols.map(symbol => {
                    return this.makeDecision(this.trader, symbol, now.getTime(), isMock);
                }).filter(a => a);
                const tradeHelper = new bot.helper.TradeHelper(this.trader, this.binance);
                const balances = yield this.trader.getBalances();
                yield Promise.all(decisions.map((decision) => __awaiter(this, void 0, void 0, function* () {
                    switch (decision.action) {
                        case "sell":
                            const quantity = balances[decision.symbol.baseAsset] || 0;
                            const minQty = getMinQty(decision.symbol);
                            if (quantity >= minQty)
                                try {
                                    const response = yield tradeHelper.sell(decision.symbol, decision.price, quantity, isMock ? decision.price : undefined);
                                    if (response.quantity != 0) {
                                        this.tradeHistory.sell(decision.symbol.baseAsset, this.homingAsset, decision.price, quantity, response.price, response.quantity, now);
                                        this.trader.performanceTracker.sell(`${decision.symbol.baseAsset}${this.homingAsset}`, response.price, response.quantity);
                                    }
                                    else {
                                        this.logger.warn(new Error(`zero quality selling ${decision.symbol.baseAsset} at ${decision.price} quality ${quantity} fail. time ${now.toString()}`));
                                    }
                                }
                                catch (e) {
                                    this.logger.error(e);
                                }
                            break;
                    }
                })));
                const homingTotal = this.getHomingTotal(balances, now.getTime());
                let buyDecisions = decisions.filter(function (a) { return a.action == "buy"; }).sort(function (a, b) {
                    const c = b.score - a.score;
                    if (c != 0)
                        return c;
                    else
                        return Math.random(); //shuffle
                });
                const availableHomingAsset = Math.max(0, ((yield this.trader.getBalances())[this.homingAsset] || 0) - this.holdingBalance);
                const maxAllocation = Math.min((homingTotal - this.holdingBalance) * this.maxAllocation, this.maxAbsoluteAllocation);
                const maxOrder = Math.max(0, Math.floor(maxAllocation / this.minimumOrderQuantity));
                if (buyDecisions.length > maxOrder) {
                    for (let i = maxOrder; i < buyDecisions.length; i++) {
                        const decision = buyDecisions[i];
                        this.tradeHistory.wannaBuy(decision.symbol.baseAsset, this.homingAsset, decision.price, 0, now);
                    }
                    buyDecisions.length = maxOrder;
                }
                const averageHomingAsset = Math.min(availableHomingAsset / buyDecisions.length, maxAllocation);
                yield Promise.all(buyDecisions.map((decision) => __awaiter(this, void 0, void 0, function* () {
                    let quantity = averageHomingAsset / decision.price;
                    const newAmount = ((balances[decision.symbol.baseAsset] || 0) + quantity) * decision.price;
                    const minQuantity = (getMinQty(decision.symbol) || this.minimumOrderQuantity);
                    if (newAmount > maxAllocation) {
                        quantity -= (newAmount - maxAllocation) / decision.price;
                    }
                    if (quantity > minQuantity)
                        try {
                            const response = yield tradeHelper.buy(decision.symbol, decision.price, quantity, isMock ? decision.price : undefined);
                            if (response.quantity != 0) {
                                this.tradeHistory.buy(decision.symbol.baseAsset, this.homingAsset, decision.price, quantity, response.price, response.quantity, now);
                                this.trader.performanceTracker.buy(decision.symbol.symbol, response.price, response.quantity);
                            }
                        }
                        catch (e) {
                            this.logger.error(e);
                        }
                    else {
                        this.tradeHistory.wannaBuy(decision.symbol.baseAsset, this.homingAsset, decision.price, quantity, now);
                    }
                })));
                {
                    const balances = yield this.trader.getBalances();
                    if (!isMock) {
                        yield this.shop.placeOrders(balances, exchangeInfo.symbols.filter(s => whiteSymbols.has(s.symbol)), this.tradeHistory, this.priceTracker);
                    }
                    if (!isMock) {
                        this.trader.performanceTracker.save();
                        this.tradeHistory.save();
                    }
                    else {
                        this.logTrader(now.getTime());
                    }
                    this.logger.log(`balance: ${JSON.stringify(balances, null, 2)}`);
                    const homingTotal = this.getHomingTotal(balances, now.getTime());
                    this.balanceTracker.add(homingTotal, now.getTime());
                    this.logger.log(`Total in ${this.homingAsset}: ${homingTotal}`);
                    this.logger.log("*****");
                }
                if (!isMock)
                    this.balanceTracker.save();
                this.logger.log("=================================");
            });
        }
        logTrader(time) {
            this.logger.log("*****");
            this.logger.log("Log");
            this.logger.log("*****");
            for (let symbol in this.tradeHistory.history) {
                this.logger.log("======");
                this.logger.log(symbol);
                const rs = this.tradeHistory.history[symbol];
                for (let r of rs) {
                    this.logger.log(`${r.side} price: ${r.price}(${r.actualPrice}) quantity: ${r.quantity}(${r.actualQuantity}) at ${new Date(r.time).toString()}`);
                }
                this.logger.log("======");
            }
        }
    }
    bot.Bot = Bot;
})(bot || (bot = {}));
var bot;
(function (bot_1) {
    let graph;
    (function (graph) {
        const graphWidth = 800;
        const graphHeight = 300;
        const graphInterval = bot.graphInterval;
        function drawGraph(canvas, data, tradeRecords, step) {
            const ctx = canvas.getContext("2d");
            const w = canvas.width;
            const h = canvas.height;
            ctx.fillStyle = "#eeeeee";
            ctx.fillRect(0, 0, w, h);
            const end = Date.now();
            const start = end - graphInterval;
            const timeRange = end - start;
            let max;
            let min;
            let range;
            let curveD;
            max = Number.NEGATIVE_INFINITY;
            min = 0; //Number.POSITIVE_INFINITY
            for (let d of data) {
                if (d.time >= start - step && d.time <= end + step) {
                    max = Math.max(d.price, max);
                    // min = Math.min(d.price, min)
                    min = Math.min(d.ma2, min);
                }
            }
            range = max - min;
            if (range < 0.1) {
                range = 0.1;
                const median = (max + min) / 2;
                max = median + 0.05;
                min = median - 0.05;
            }
            for (let r of tradeRecords) {
                ctx.strokeStyle = r.color;
                ctx.lineWidth = 1;
                const x = (r.time - start) * w / timeRange;
                const y = (1 - (r.price - min) / range) * h;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.moveTo(x + 1.5, y);
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo((data[0].time - start) * w / timeRange, h - (data[0].price - min) * h / range);
            for (let d of data.slice(1)) {
                ctx.lineTo((d.time - start) * w / timeRange, h - (d.price - min) * h / range);
            }
            ctx.stroke();
            ctx.strokeStyle = "green";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo((data[0].time - start) * w / timeRange, h - (data[0].ma1 - min) * h / range);
            for (let d of data.slice(1)) {
                ctx.lineTo((d.time - start) * w / timeRange, h - (d.ma1 - min) * h / range);
            }
            ctx.stroke();
            ctx.strokeStyle = "grey";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, h + min * h / range);
            ctx.lineTo(w, h + min * h / range);
            ctx.stroke();
            curveD = data.map(d => {
                return {
                    price: d.ma2,
                    time: d.time
                };
            });
            ctx.strokeStyle = "orange";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo((curveD[0].time - start) * w / timeRange, h - (curveD[0].price - min) * h / range);
            for (let d of curveD.slice(1)) {
                ctx.lineTo((d.time - start) * w / timeRange, h - (d.price - min) * h / range);
            }
            ctx.moveTo(0, h + min * h / range);
            ctx.lineTo(w, h + min * h / range);
            ctx.stroke();
        }
        class Drawer {
            constructor(bot) {
                this.bot = bot;
            }
            get html() {
                const assets = [];
                for (let baseAsset in this.bot.trendWatchers) {
                    const trendWatcher = this.bot.trendWatchers[baseAsset];
                    const symbol = `${baseAsset}${this.bot.homingAsset}`;
                    const history = this.bot.tradeHistory.history[symbol];
                    assets.push({
                        asset: baseAsset,
                        data: trendWatcher.data.map((d, i) => {
                            return {
                                price: d.price,
                                ma1: trendWatcher.ma14[i],
                                ma2: trendWatcher.ma24[i],
                                time: d.time
                            };
                        }).filter(a => {
                            return a.time > Date.now() - graphInterval - this.bot.timeInterval;
                        }),
                        tradeRecords: history ? history.map(h => {
                            let color = "purple";
                            switch (h.side) {
                                case "buy":
                                    color = "blue";
                                    break;
                                case "sell":
                                    color = "red";
                                    break;
                            }
                            return {
                                color: color,
                                price: h.actualPrice,
                                time: h.time,
                            };
                        }).filter(a => {
                            return a.time > Date.now() - graphInterval - this.bot.timeInterval;
                        }) : [],
                        balance: this.bot.trader.performanceTracker.balance(symbol, this.bot.getRecentPrice(symbol, Date.now()))
                    });
                }
                const investHelper = new bot_1.helper.InvestmentHistoryHelper();
                return `
            <script>
            const graphInterval = ${graphInterval};
            ${drawGraph.toString()}
            </script>
            <table>
            <tr>
            <th>Balance ${this.bot.homingAsset}</th>
            </tr>
            <tr>
            <td>
            <canvas id="graphCanvasBalance" width="${graphWidth}" height="${graphHeight}" style="width: ${graphWidth}px; height: ${graphHeight}px;"></canvas>
            <script>
                drawGraph(graphCanvasBalance, ${JSON.stringify(this.bot.balanceTracker.balances.map((b) => {
                    const iv = investHelper.getAccumulativeInvestment(this.bot.homingAsset, b.time);
                    const gain = b.amount - iv;
                    return {
                        price: b.amount,
                        ma1: iv,
                        ma2: gain,
                        time: b.time
                    };
                }).filter(a => {
                    return a.time > Date.now() - graphInterval - this.bot.timeInterval;
                }))}, [], ${this.bot.timeInterval});
            </script>
            <br/><br/>
            </td>
            </tr>
            ${assets.sort(function (a, b) {
                    return b.balance - a.balance;
                }).map(r => {
                    const symbol = `${r.asset}${this.bot.homingAsset}`;
                    return `
                    <tr>
                    <th>
                    ${r.asset}<br/>
                    Gain: ${r.balance}<br/>
                    </th>
                    </tr>
                    <tr>
                    <td>
                    <canvas id="graphCanvas${r.asset}" width="${graphWidth}" height="${graphHeight}" style="width: ${graphWidth}px; height: ${graphHeight}px;"></canvas>
                    <script>
                        drawGraph(graphCanvas${r.asset}, ${JSON.stringify(r.data)}, ${JSON.stringify(r.tradeRecords)}, ${this.bot.timeInterval});
                    </script>
                    <br/><br/>
                    </td>
                    </tr>
                    `;
                }).join("")}
            </table><br/><br/>
            negative list: [${assets.filter(a => a.balance <= -3).map(a => `"${a.asset}"`).join(", ")}]
            `;
            }
        }
        graph.Drawer = Drawer;
    })(graph = bot_1.graph || (bot_1.graph = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let helper;
    (function (helper) {
        function ma(data, iteration) {
            const smoothedData = data.map(function (d, idx) {
                let price = d;
                let weight = 1;
                for (let i = Math.max(0, idx - iteration); i < idx; i++) {
                    price += data[i];
                    weight++;
                }
                return price / weight;
            });
            return smoothedData;
        }
        function ema(data, iteration) {
            const smoothedData = new Array(data.length);
            for (let i = 0; i < smoothedData.length; i++) {
                if (i > 0) {
                    const tmp = 2 / (1 + iteration);
                    smoothedData[i] = data[i] * tmp + smoothedData[i - 1] * (1 - tmp);
                }
                else {
                    smoothedData[i] = data[i];
                }
            }
            return smoothedData;
        }
        function thicken(data, iteration) {
            const smoothedData = data.map(function (d, idx) {
                let price = d;
                for (let i = Math.max(0, idx - iteration); i < idx; i++) {
                    price = Math.max(price, data[i]);
                }
                return price;
            });
            return smoothedData;
        }
        function differentiate(arr) {
            return arr.map(function (a, i) {
                return i > 0 ? a - arr[i - 1] : 0;
            });
        }
        function sign(n) {
            return n >= 0 ? 1 : -1;
        }
        class TrendWatcher {
            constructor(baseAsset, data, interval) {
                this.baseAsset = baseAsset;
                const smoothItr14 = 14 * 24 * 60 * 60 * 1000 / interval;
                this.data = data;
                this.ma14 = ema(this.data.map(a => a.price), smoothItr14);
                this.ma24 = ma(this.data.map(a => a.price), smoothItr14 * 2);
                let lastCrossIndex = 0;
                this.lastCrossIndex = data.map((_, idx) => {
                    if (idx > 0 &&
                        sign(this.ma14[idx - 1] - this.ma24[idx - 1]) != sign(this.ma14[idx] - this.ma24[idx])) {
                        lastCrossIndex = idx;
                    }
                    return lastCrossIndex;
                });
                lastCrossIndex = 0;
                this.ratio = data.map(function (a, idx) {
                    let high = a.price;
                    let low = a.price;
                    for (let i = Math.max(0, idx - smoothItr14); i < idx; i++) {
                        high = Math.max(high, data[i].price);
                        low = Math.min(low, data[i].price);
                    }
                    return high / low;
                });
            }
            get high() {
                return this.data.reduce((a, b) => Math.max(a, b.price), Number.MIN_VALUE);
            }
            get low() {
                return this.data.reduce((a, b) => Math.min(a, b.price), Number.MAX_VALUE);
            }
        }
        helper.TrendWatcher = TrendWatcher;
    })(helper = bot.helper || (bot.helper = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let helper;
    (function (helper) {
        const balanceTrackerlocalStorageKey = "BalanceTracker.balances";
        const limit = 1000;
        class BalanceTracker {
            constructor() {
                const s = localStorage.getItem(balanceTrackerlocalStorageKey);
                if (s) {
                    this.balances = JSON.parse(s);
                }
                else {
                    this.balances = [];
                }
            }
            add(balance, time) {
                this.balances.push({
                    time: time,
                    amount: balance
                });
                if (this.balances.length > limit)
                    this.balances.splice(0, this.balances.length - limit);
            }
            save() {
                localStorage.setItem(balanceTrackerlocalStorageKey, JSON.stringify(this.balances));
            }
        }
        helper.BalanceTracker = BalanceTracker;
    })(helper = bot.helper || (bot.helper = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let helper;
    (function (helper) {
        class DecisionScorer {
            score(trendWatcher, lastIdx, balance) {
                return balance;
            }
        }
        helper.DecisionScorer = DecisionScorer;
    })(helper = bot.helper || (bot.helper = {}));
})(bot || (bot = {}));
var bot;
(function (bot_2) {
    let helper;
    (function (helper) {
        const http = require("http");
        class HttpHelper {
            constructor(bot, port, password) {
                this.bot = bot;
                this.password = password;
                this.server = http.createServer((request, response) => {
                    let data = "";
                    request.on("data", chunk => {
                        data += chunk;
                    });
                    request.on("end", () => {
                        this.dispatch(request.url, data, response);
                    });
                });
                this.server.listen(port);
            }
            dispatch(url, data, response) {
                const t = url.split("?");
                const path = t[0];
                const queryString = t[1];
                if (queryString != this.password)
                    return;
                switch (path) {
                    case "/showLog":
                        this.showLog(response);
                        break;
                    case "/goHome":
                        this.goHome(response);
                        break;
                    case "/goOut":
                        this.goOut(response);
                        break;
                    default:
                        this.showUsage(response, queryString);
                        break;
                }
            }
            showLog(response) {
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end(this.bot.log);
            }
            goHome(response) {
                this.bot.allow.buy = false;
                this.bot.allow.sell = true;
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end("{\"success\":true}}");
            }
            goOut(response) {
                this.bot.allow.buy = true;
                this.bot.allow.sell = true;
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end("{\"success\":true}}");
            }
            showUsage(response, queryString) {
                response.writeHead(200, { "Content-Type": "text/html" });
                response.end(`<html>
            <body>
            Status:<br/>
            <table>
            <tr>
            <td>allow</td><td>${JSON.stringify(this.bot.allow, null, 2)}</td>
            </tr>
            </table><br/>
            <br/>
            Path:<br/>
            <table>
            <tr>
            <td><a href="/showLog?${queryString}">/showLog</a></td><td>to print log</td>
            </tr>
            <tr>
            <td><a href="/goHome?${queryString}">/goHome</a></td><td>force all access to homing asset</td>
            </tr>
            <tr>
            <td><a href="/goOut?${queryString}">/goOut</a></td><td>Normal Trace</td>
            </tr>
            </table>
            ${new bot_2.graph.Drawer(this.bot).html}
            </body>
            </html>`);
            }
        }
        helper.HttpHelper = HttpHelper;
    })(helper = bot_2.helper || (bot_2.helper = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let helper;
    (function (helper) {
        const hardCodedExchange = {
            "HKDUSDT": 7.8
        };
        class InvestmentHistoryHelper {
            constructor() {
                this.histories = JSON.parse(localStorage.getItem("InvestmentHistory")) || [];
            }
            getAccumulativeInvestment(asset, time) {
                let amount = 0;
                // const exchangeCache = new Map<string,number>()
                for (let h of this.histories) {
                    if (new Date(h.date).getTime() < time) {
                        // let exchange = exchangeCache.get(h.currency) || await com.danborutori.cryptoApi.CryptoCompare.shared.getPrice(h.currency, asset) || 1/hardCodedExchange[`${h.currency}${asset}`]
                        // exchangeCache.set(h.currency, exchange)
                        const exchange = 1 / hardCodedExchange[`${h.currency}${asset}`];
                        amount += h.amount * exchange;
                    }
                    else
                        break;
                }
                return amount;
            }
        }
        helper.InvestmentHistoryHelper = InvestmentHistoryHelper;
    })(helper = bot.helper || (bot.helper = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let helper;
    (function (helper) {
        const logLocalStorageKey = "Bot.log";
        class Logger {
            constructor(logLength) {
                this.logLength = logLength;
                this.logs = [];
                const s = localStorage.getItem(logLocalStorageKey);
                if (s)
                    this.logs = JSON.parse(s);
            }
            get logString() {
                return localStorage.getItem(logLocalStorageKey);
            }
            writeLog(message, tag) {
                const entry = {
                    time: new Date().toString(),
                    tag: tag,
                    message: message
                };
                this.logs.push(entry);
                if (this.logs.length > this.logLength) {
                    this.logs = this.logs.slice(this.logs.length - this.logLength);
                }
                if (this.timeout) {
                    clearTimeout(this.timeout);
                    this.timeout = undefined;
                }
                this.timeout = setTimeout(() => {
                    localStorage.setItem(logLocalStorageKey, JSON.stringify(this.logs, null, 2));
                }, 10);
            }
            log(message) {
                if (typeof (message) == "string") {
                    console.log(message);
                    this.writeLog(message, "v");
                }
                else {
                    console.log(JSON.stringify(message, null, 2));
                    this.writeLog(message, "v");
                }
            }
            warn(e) {
                console.warn(e);
                this.writeLog(e.stack || e.message || JSON.stringify(e), "w");
            }
            error(e) {
                console.error(e);
                this.writeLog(e.stack || e.message || JSON.stringify(e), "e");
            }
        }
        helper.Logger = Logger;
    })(helper = bot.helper || (bot.helper = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let helper;
    (function (helper) {
        const performanceTrackerGainsLocalStorageKey = "PerformanceTracker.gains";
        class PerformanceTracker {
            constructor() {
                const s = localStorage.getItem(performanceTrackerGainsLocalStorageKey);
                if (s) {
                    this.gains = JSON.parse(s);
                }
                else {
                    this.gains = {};
                }
            }
            getRecord(symbol) {
                return this.gains[symbol] || (this.gains[symbol] = {
                    holding: 0,
                    spend: 0
                });
            }
            getHolding(symbol) {
                return this.getRecord(symbol).holding;
            }
            buy(symbol, price, quantity) {
                const record = this.getRecord(symbol);
                record.holding += quantity;
                record.spend += quantity * price;
            }
            sell(symbol, price, quantity) {
                const record = this.getRecord(symbol);
                record.holding -= quantity;
                record.spend -= quantity * price;
            }
            balance(symbol, currentPrice) {
                const record = this.getRecord(symbol);
                return record.holding * currentPrice - record.spend;
            }
            save() {
                localStorage.setItem(performanceTrackerGainsLocalStorageKey, JSON.stringify(this.gains, null, 2));
            }
            reset() {
                for (let s in this.gains) {
                    delete this.gains[s];
                }
            }
        }
        helper.PerformanceTracker = PerformanceTracker;
    })(helper = bot.helper || (bot.helper = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let helper;
    (function (helper) {
        const pricesLocalStorageKey = "PriceTracker.prices";
        const recordLimit = 5000;
        class PriceTracker {
            constructor(binance) {
                this.binance = binance;
                this.prices = function () {
                    const s = localStorage.getItem(pricesLocalStorageKey);
                    if (s) {
                        return JSON.parse(s);
                    }
                    return {};
                }();
            }
            update(interval, whiteSymbols) {
                return __awaiter(this, void 0, void 0, function* () {
                    const time = Date.now();
                    const prices = (yield this.binance.getSymbolPriceTicker()).filter(function (p) {
                        return whiteSymbols.has(p.symbol);
                    });
                    yield Promise.all(prices.map((price) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            let records = this.prices[price.symbol] || (this.prices[price.symbol] = []);
                            let startTime = records.length > 0 ? records[records.length - 1].time : undefined;
                            if (!startTime || (Date.now() - startTime) > helper.intervalToMilliSec(interval)) {
                                const data = yield this.binance.getKlineCandlestickData(price.symbol, interval, {
                                    startTime: startTime
                                });
                                for (let d of data) {
                                    records.push({
                                        price: d.close,
                                        time: d.closeTime.getTime()
                                    });
                                }
                            }
                            records.push({
                                time: time,
                                price: parseFloat(price.price)
                            });
                            if (records.length > recordLimit) {
                                records.splice(0, records.length - recordLimit);
                            }
                        }
                        catch (e) {
                            console.error(e);
                        }
                    })));
                    localStorage.setItem(pricesLocalStorageKey, JSON.stringify(this.prices, null, 2));
                });
            }
            getConstantIntervalPrice(symbol, interval) {
                const prices = this.prices[symbol] || [];
                if (prices.length > 0) {
                    const startTime = helper.snapTime(prices[0].time, interval);
                    const endTime = helper.snapTime(prices[prices.length - 1].time, interval);
                    const recordLen = (endTime - startTime) / interval + 1;
                    const result = new Array(recordLen);
                    for (let i = 0; i < result.length; i++) {
                        const rt = startTime + i * interval;
                        const idxB = prices.findIndex(function (a) {
                            return a.time >= rt;
                        });
                        const idxA = Math.max(0, idxB - 1);
                        const priceA = prices[idxA];
                        const priceB = prices[idxB];
                        const td = priceB.time - priceA.time;
                        const mix = td != 0 ? (rt - priceA.time) / td : 0;
                        const price = priceA.price * (1 - mix) + priceB.price * mix;
                        result[i] = {
                            price: price,
                            time: rt
                        };
                    }
                    return result;
                }
                return [];
            }
        }
        helper.PriceTracker = PriceTracker;
    })(helper = bot.helper || (bot.helper = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let helper;
    (function (helper) {
        class TestBinanceTrader {
            test(binance, logger) {
                return __awaiter(this, void 0, void 0, function* () {
                    const testTradeAmount = 15;
                    const baseAsset = "BNB";
                    const quoteAsset = "USDT";
                    logger.log(`================================`);
                    logger.log(`test trader`);
                    try {
                        const t = new bot.trader.BinanceTrader(binance, logger);
                        const exchangeInfo = yield binance.getExchangeInfo();
                        const sym = exchangeInfo.symbols.find(s => s.symbol == `${baseAsset}${quoteAsset}`);
                        if (sym) {
                            const priceResponse = yield binance.getSymbolPriceTicker(sym.symbol);
                            logger.log(`Try to buy ${testTradeAmount / parseFloat(priceResponse.price)} ${baseAsset}`);
                            logger.log(`current price ${priceResponse.price}`);
                            const buyResponse = yield t.buy(sym, testTradeAmount / parseFloat(priceResponse.price), testTradeAmount);
                            logger.log(`buy ${buyResponse.quantity} at price ${buyResponse.price}`);
                            const sellResponse = yield t.sell(sym, buyResponse.quantity);
                            logger.log(`sell ${sellResponse.quantity} at price ${sellResponse.price}`);
                        }
                        else {
                        }
                    }
                    catch (e) {
                        logger.error(e);
                    }
                    logger.log(`================================`);
                });
            }
        }
        helper.TestBinanceTrader = TestBinanceTrader;
    })(helper = bot.helper || (bot.helper = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let helper;
    (function (helper) {
        function getMinNotional(symbol) {
            const minNotional = symbol.filters.find(f => f.filterType == "MIN_NOTIONAL");
            if (minNotional && minNotional.applyToMarket) {
                return parseFloat(minNotional.minNotional);
            }
            return 0;
        }
        function getLotSize(symbol) {
            const filter = symbol.filters.find(f => f.filterType == "LOT_SIZE");
            if (filter) {
                return {
                    minQty: parseFloat(filter.minQty),
                    maxQty: parseFloat(filter.maxQty),
                    stepSize: parseFloat(filter.stepSize)
                };
            }
            return {
                minQty: Number.NEGATIVE_INFINITY,
                maxQty: Number.POSITIVE_INFINITY,
                stepSize: Number.MIN_VALUE
            };
        }
        helper.getLotSize = getLotSize;
        function getMarketLotSize(symbol) {
            const filter = symbol.filters.find(f => f.filterType == "MARKET_LOT_SIZE");
            if (filter) {
                return {
                    minQty: parseFloat(filter.minQty),
                    maxQty: parseFloat(filter.maxQty),
                    stepSize: parseFloat(filter.stepSize)
                };
            }
            return {
                minQty: Number.NEGATIVE_INFINITY,
                maxQty: Number.POSITIVE_INFINITY,
                stepSize: Number.MIN_VALUE
            };
        }
        helper.getMarketLotSize = getMarketLotSize;
        function getPriceFilter(symbol) {
            const filter = symbol.filters.find(f => f.filterType == "PRICE_FILTER");
            if (filter) {
                return {
                    minPrice: parseFloat(filter.minPrice),
                    maxPrice: parseFloat(filter.maxPrice),
                    tickSize: parseFloat(filter.tickSize)
                };
            }
            return {
                minPrice: Number.NEGATIVE_INFINITY,
                maxPrice: Number.POSITIVE_INFINITY,
                tickSize: Number.MIN_VALUE
            };
        }
        helper.getPriceFilter = getPriceFilter;
        function getExchangeMaxNumOrdersFilter(symbol) {
            const filter = symbol.filters.find(f => f.filterType == "MAX_NUM_ORDERS");
            if (filter) {
                return filter;
            }
            return {
                maxNumOrders: Number.POSITIVE_INFINITY
            };
        }
        helper.getExchangeMaxNumOrdersFilter = getExchangeMaxNumOrdersFilter;
        function getExchangeMaxNumAlgoOrdersFilter(symbol) {
            const filter = symbol.filters.find(f => f.filterType == "MAX_NUM_ALGO_ORDERS");
            if (filter) {
                return filter;
            }
            return {
                maxNumAlgoOrders: Number.POSITIVE_INFINITY
            };
        }
        helper.getExchangeMaxNumAlgoOrdersFilter = getExchangeMaxNumAlgoOrdersFilter;
        class TradeHelper {
            constructor(trader, binance, maxRetry = 3) {
                this.trader = trader;
                this.binance = binance;
                this.maxRetry = maxRetry;
            }
            buy(symbol, price, quantity, mockPrice) {
                return __awaiter(this, void 0, void 0, function* () {
                    const marketLotSize = getMarketLotSize(symbol);
                    const response = {
                        quantity: 0,
                        price: 0
                    };
                    let remainQuantity = quantity;
                    for (let i = 0; i < this.maxRetry;) {
                        const tradeQuantity = Math.min(remainQuantity, marketLotSize.maxQty);
                        if (tradeQuantity < marketLotSize.minQty)
                            break;
                        const intermedia = yield this.trader.buy(symbol, tradeQuantity, tradeQuantity * price, mockPrice);
                        response.price = response.quantity * response.price + intermedia.quantity * intermedia.price;
                        response.quantity += intermedia.quantity;
                        if (response.quantity != 0)
                            response.price /= response.quantity;
                        remainQuantity -= intermedia.quantity;
                        const minNotional = getMinNotional(symbol);
                        if (remainQuantity * price * 0.9 <= minNotional)
                            break;
                        if (intermedia.quantity == 0)
                            i++;
                    }
                    return response;
                });
            }
            sell(symbol, price, quantity, mockPrice) {
                return __awaiter(this, void 0, void 0, function* () {
                    const marketLotSize = getMarketLotSize(symbol);
                    const response = {
                        quantity: 0,
                        price: 0
                    };
                    let remainQuantity = quantity;
                    for (let i = 0; i < this.maxRetry;) {
                        const tradeQuantity = Math.min(remainQuantity, marketLotSize.maxQty);
                        if (tradeQuantity < marketLotSize.minQty)
                            break;
                        const intermedia = yield this.trader.sell(symbol, tradeQuantity, mockPrice);
                        response.price = response.quantity * response.price + intermedia.quantity * intermedia.price;
                        response.quantity += intermedia.quantity;
                        if (response.quantity != 0)
                            response.price /= response.quantity;
                        remainQuantity -= intermedia.quantity;
                        const minNotional = getMinNotional(symbol);
                        if (remainQuantity * price * 0.9 <= minNotional)
                            break;
                        if (intermedia.quantity == 0)
                            i++;
                    }
                    return response;
                });
            }
        }
        helper.TradeHelper = TradeHelper;
    })(helper = bot.helper || (bot.helper = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let helper;
    (function (helper) {
        function snapTime(time, interval) {
            return Math.floor(time / interval) * interval;
        }
        helper.snapTime = snapTime;
        function intervalToMilliSec(interval) {
            switch (interval) {
                case "1m":
                    return 1000 * 60;
                case "3m":
                    return 1000 * 60 * 3;
                case "5m":
                    return 1000 * 60 * 5;
                case "15m":
                    return 1000 * 60 * 15;
                case "30m":
                    return 1000 * 60 * 30;
                case "1h":
                    return 1000 * 60 * 60;
                case "2h":
                    return 1000 * 60 * 60 * 2;
                case "4h":
                    return 1000 * 60 * 60 * 4;
                case "6h":
                    return 1000 * 60 * 60 * 6;
                case "8h":
                    return 1000 * 60 * 60 * 8;
                case "12h":
                    return 1000 * 60 * 60 * 12;
                case "1d":
                    return 1000 * 60 * 60 * 24;
                case "3d":
                    return 1000 * 60 * 60 * 24 * 3;
                case "1w":
                    return 1000 * 60 * 60 * 24 * 7;
                case "1M":
                    return 1000 * 60 * 60 * 24 * 30;
            }
        }
        helper.intervalToMilliSec = intervalToMilliSec;
        function mean(data) {
            return data.length != 0 ?
                data.reduce((a, b) => a + b, 0) / data.length :
                0;
        }
        function standardDeviation(data) {
            const m = mean(data);
            return data.length != 0 ?
                Math.sqrt(data.reduce((a, b) => {
                    const d = b - m;
                    return a + b * b;
                }, 0) / data.length) :
                0;
        }
        helper.standardDeviation = standardDeviation;
    })(helper = bot.helper || (bot.helper = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let shop;
    (function (shop) {
        class Shop {
            constructor(binance, markUp, logger) {
                this.binance = binance;
                this.markUp = markUp;
                this.logger = logger;
            }
            checkOpenedOrders(symbols, performanceTracker, tradeHistory) {
                return __awaiter(this, void 0, void 0, function* () {
                    let numTradeRecords = 0;
                    this.logger.log("Checking Opened Orders");
                    tradeHistory.openedOrderIds.map((o) => __awaiter(this, void 0, void 0, function* () {
                        const order = yield this.binance.queryOrder(o.symbol, o.orderId);
                        switch (order.status) {
                            case "FILLED":
                            case "PARTIALLY_FILLED":
                                const sym = symbols.find(s => { return s.symbol == order.symbol; });
                                performanceTracker.sell(order.symbol, parseFloat(order.price), parseFloat(order.executedQty));
                                tradeHistory.sell(sym.baseAsset, sym.quoteAsset, parseFloat(order.price), parseFloat(order.origQty), parseFloat(order.price), parseFloat(order.executedQty), new Date(order.updateTime));
                                numTradeRecords++;
                                break;
                        }
                    }));
                    const cancelledOrders = yield this.binance.cancelAllOpenOrders();
                    this.logger.log(`created ${numTradeRecords} new records from latest orders.`);
                    this.logger.log(`Cancel ${cancelledOrders.length} orders`);
                    this.logger.log("Checking Opened Orders completed");
                });
            }
            placeOrders(balances, symbols, tradeHistory, priceTracker) {
                return __awaiter(this, void 0, void 0, function* () {
                    this.logger.log("placing orders");
                    let numOrders = 0;
                    yield Promise.all(symbols.map((s) => __awaiter(this, void 0, void 0, function* () {
                        if (s.orderTypes.indexOf("TAKE_PROFIT_LIMIT") >= 0) {
                            const prices = priceTracker.prices[s.symbol];
                            const latestPrice = prices && prices.length > 0 ? prices[prices.length - 1].price : undefined;
                            const tradeInPrice = tradeHistory.getLastTradeInPrice(s.symbol) || latestPrice;
                            const freeQuantity = balances[s.baseAsset];
                            if (latestPrice !== undefined && tradeInPrice !== undefined && freeQuantity !== undefined) {
                                const lotSize = bot.helper.getLotSize(s);
                                const marketLotSize = bot.helper.getMarketLotSize(s);
                                const priceFilter = bot.helper.getPriceFilter(s);
                                const maxNumOrders = bot.helper.getExchangeMaxNumOrdersFilter(s).maxNumOrders;
                                const maxNumAlgoOrders = bot.helper.getExchangeMaxNumAlgoOrdersFilter(s).maxNumAlgoOrders;
                                let quantity = freeQuantity;
                                let price = Math.max(tradeInPrice, latestPrice) * (1 + this.markUp);
                                price = Math.max(priceFilter.minPrice, Math.min(priceFilter.maxPrice, price));
                                price = Math.floor(price / priceFilter.tickSize) * priceFilter.tickSize;
                                price = parseFloat(price.toPrecision(s.baseAssetPrecision));
                                let algoNum = 0;
                                while (quantity > Math.max(lotSize.minQty, marketLotSize.minQty) &&
                                    algoNum < maxNumAlgoOrders &&
                                    numOrders < maxNumOrders) {
                                    let orderQty = Math.min(lotSize.maxQty, quantity);
                                    orderQty = Math.floor(orderQty / lotSize.stepSize) * lotSize.stepSize;
                                    orderQty = parseFloat(orderQty.toPrecision(s.baseAssetPrecision));
                                    try {
                                        const resp = yield this.binance.newOrder(s.symbol, "SELL", orderQty, undefined, "TAKE_PROFIT_LIMIT", price);
                                        tradeHistory.openedOrderIds.push({
                                            symbol: resp.symbol,
                                            orderId: resp.orderId
                                        });
                                        algoNum++;
                                        numOrders++;
                                    }
                                    catch (e) {
                                        this.logger.error(new Error(`place sell order ${s.symbol} at price ${price} quantity: ${orderQty}`));
                                        this.logger.error(e);
                                        break;
                                    }
                                    quantity -= orderQty;
                                }
                            }
                        }
                    })));
                    this.logger.log(`placed ${numOrders} orders.`);
                });
            }
        }
        shop.Shop = Shop;
    })(shop = bot.shop || (bot.shop = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let trader;
    (function (trader) {
        function convertResponse(response) {
            let price = 0;
            let quantity = 0;
            if (response.fills) {
                for (let f of response.fills) {
                    const qty = parseFloat(f.qty);
                    price += parseFloat(f.price) * qty;
                    quantity += qty;
                }
            }
            return {
                price: quantity != 0 ? price / quantity : 0,
                quantity: quantity
            };
        }
        function fixPrecision(n, precision, stepSize) {
            if (stepSize != 0)
                n = Math.floor(n / stepSize) * stepSize;
            return parseFloat(n.toPrecision(precision));
        }
        class BinanceTrader extends trader.Trader {
            constructor(binance, logger) {
                super();
                this.binance = binance;
                this.logger = logger;
            }
            getBalances() {
                return __awaiter(this, void 0, void 0, function* () {
                    const balances = {};
                    (yield this.binance.getAccountInfo()).balances.forEach(b => {
                        balances[b.asset] = parseFloat(b.free);
                    });
                    return balances;
                });
            }
            buy(symbol, quantity, quoteAssetQuantity, mockPrice) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        const response = yield this.binance.newOrder(symbol.symbol, "BUY", undefined, fixPrecision(quoteAssetQuantity, symbol.quoteAssetPrecision, 0));
                        this.logger && this.logger.log(`buy response:\n${JSON.stringify(response, null, 2)}`);
                        return convertResponse(response);
                    }
                    catch (e) {
                        console.error(e);
                        this.logger && this.logger.error(e);
                    }
                    return {
                        price: 0,
                        quantity: 0
                    };
                });
            }
            sell(symbol, quantity, mockPrice) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        const response = yield this.binance.newOrder(symbol.symbol, "SELL", fixPrecision(quantity, symbol.baseAssetPrecision, bot.helper.getLotSize(symbol).stepSize));
                        this.logger && this.logger.log(`sell response:\n${JSON.stringify(response, null, 2)}`);
                        return convertResponse(response);
                    }
                    catch (e) {
                        console.error(e);
                        this.logger && this.logger.error(e);
                    }
                    return {
                        price: 0,
                        quantity: 0
                    };
                });
            }
        }
        trader.BinanceTrader = BinanceTrader;
    })(trader = bot.trader || (bot.trader = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let trader;
    (function (trader) {
        const recordLimit = 100;
        const localStorageKey = "bot.trader.History";
        class History {
            constructor() {
                this._history = {};
                this.openedOrderIds = [];
                this.load();
            }
            get history() {
                return this._history;
            }
            getLastTradeInPrice(symbol) {
                const hs = this._history[symbol];
                if (hs) {
                    for (let i = hs.length - 1; i >= 0; i--) {
                        const h = hs[i];
                        if (h.side == "buy") {
                            return h.actualPrice;
                        }
                    }
                }
            }
            buy(baseAsset, quoteAsset, closePrice, quantity, actualPrice, actualQuantity, time) {
                const symbol = `${baseAsset}${quoteAsset}`;
                const h = this.history[symbol] || (this.history[symbol] = []);
                h.push({
                    price: closePrice,
                    quantity: quantity,
                    actualPrice: actualPrice,
                    actualQuantity: actualQuantity,
                    side: "buy",
                    time: time ? time.getTime() : Date.now()
                });
                if (h.length > recordLimit)
                    this.history[symbol] = h.slice(h.length - recordLimit);
            }
            sell(baseAsset, quoteAsset, closePrice, quantity, actualPrice, actualQuantity, time) {
                const symbol = `${baseAsset}${quoteAsset}`;
                const h = this.history[symbol] || (this.history[symbol] = []);
                h.push({
                    price: closePrice,
                    quantity: quantity,
                    actualPrice: actualPrice,
                    actualQuantity: actualQuantity,
                    side: "sell",
                    time: time ? time.getTime() : Date.now()
                });
                if (h.length > recordLimit)
                    this.history[symbol] = h.slice(h.length - recordLimit);
            }
            wannaBuy(baseAsset, quoteAsset, closePrice, quantity, time) {
                const symbol = `${baseAsset}${quoteAsset}`;
                const h = this.history[symbol] || (this.history[symbol] = []);
                h.push({
                    price: closePrice,
                    quantity: quantity,
                    actualPrice: closePrice,
                    actualQuantity: quantity,
                    side: "want to buy",
                    time: time ? time.getTime() : Date.now()
                });
                if (h.length > recordLimit)
                    this.history[symbol] = h.slice(h.length - recordLimit);
            }
            load() {
                let s = localStorage.getItem(localStorageKey);
                if (s) {
                    this._history = JSON.parse(s);
                }
                s = localStorage.getItem(localStorageKey + ".openedOrderIds");
                if (s) {
                    this.openedOrderIds.length = 0;
                    for (let id of JSON.parse(s) || [])
                        this.openedOrderIds.push(id);
                }
            }
            save() {
                localStorage.setItem(localStorageKey, JSON.stringify(this._history, null, 2));
                localStorage.setItem(localStorageKey + ".openedOrderIds", JSON.stringify(this.openedOrderIds, null, 2));
            }
        }
        trader.History = History;
    })(trader = bot.trader || (bot.trader = {}));
})(bot || (bot = {}));
var bot;
(function (bot) {
    let trader;
    (function (trader) {
        const balancesLocalStorageKey = "MockTrader.balances";
        const commissionRate = 0.001;
        trader.marketPriceDiff = 0.05;
        class MockTrader extends trader.Trader {
            constructor(binance) {
                super();
                this.binance = binance;
                this.balances = function () {
                    const s = localStorage.getItem(balancesLocalStorageKey);
                    if (s) {
                        return JSON.parse(s);
                    }
                    return { USDT: 10000 };
                }();
                this.timeout = -1;
            }
            getBalances() {
                return __awaiter(this, void 0, void 0, function* () {
                    return this.balances;
                });
            }
            buy(symbol, quantity, quoteAssetQuantity, mockPrice) {
                return __awaiter(this, void 0, void 0, function* () {
                    const price = (mockPrice !== undefined ? mockPrice : parseFloat((yield this.binance.getSymbolPriceTicker(symbol.symbol)).price)) * (1 + trader.marketPriceDiff);
                    const netQty = quantity * (1 - commissionRate);
                    const baseAsset = symbol.baseAsset;
                    const quoteAsset = symbol.quoteAsset;
                    this.balances[baseAsset] = (this.balances[baseAsset] || 0) + netQty;
                    this.balances[quoteAsset] = (this.balances[quoteAsset] || 0) - quantity * price;
                    this.save();
                    return {
                        price: price,
                        quantity: quantity
                    };
                });
            }
            sell(symbol, quantity, mockPrice) {
                return __awaiter(this, void 0, void 0, function* () {
                    const price = (mockPrice !== undefined ? mockPrice : parseFloat((yield this.binance.getSymbolPriceTicker(symbol.symbol)).price)) * (1 - trader.marketPriceDiff);
                    const netQty = quantity * (1 - commissionRate);
                    const baseAsset = symbol.baseAsset;
                    const quoteAsset = symbol.quoteAsset;
                    this.balances[baseAsset] = (this.balances[baseAsset] || 0) - quantity;
                    this.balances[quoteAsset] = (this.balances[quoteAsset] || 0) + netQty * price;
                    this.save();
                    return {
                        price: price,
                        quantity: quantity
                    };
                });
            }
            save() {
                if (this.timeout >= 0)
                    clearTimeout(this.timeout);
                this.timeout = setTimeout(() => {
                    localStorage.setItem(balancesLocalStorageKey, JSON.stringify(this.balances));
                    this.timeout = -1;
                }, 100);
            }
        }
        trader.MockTrader = MockTrader;
    })(trader = bot.trader || (bot.trader = {}));
})(bot || (bot = {}));
var com;
(function (com) {
    let danborutori;
    (function (danborutori) {
        let cryptoApi;
        (function (cryptoApi) {
            class CryptoCompare {
                getPrice(from, to) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const json = yield (yield fetch(`https://min-api.cryptocompare.com/data/price?fsym=${from}&tsyms=${to}`)).json();
                        return json[to];
                    });
                }
            }
            CryptoCompare.shared = new CryptoCompare();
            cryptoApi.CryptoCompare = CryptoCompare;
        })(cryptoApi = danborutori.cryptoApi || (danborutori.cryptoApi = {}));
    })(danborutori = com.danborutori || (com.danborutori = {}));
})(com || (com = {}));
var com;
(function (com) {
    let danborutori;
    (function (danborutori) {
        let cryptoApi;
        (function (cryptoApi) {
            function sleep(second) {
                if (second > 0) {
                    return new Promise((resolve, reject) => {
                        setTimeout(function () {
                            resolve();
                        }, second * 1000);
                    });
                }
                else {
                    return Promise.resolve();
                }
            }
            function autoRetryFetch(input, init) {
                return __awaiter(this, void 0, void 0, function* () {
                    let retryCount = 0;
                    while (true) {
                        try {
                            return yield fetch(input, init);
                        }
                        catch (e) {
                            switch (e.errno) {
                                case "EAI_AGAIN":
                                case "EAI_BADFLAGS":
                                case "EAI_FAIL":
                                case "EAI_FAMILY":
                                case "EAI_MEMORY":
                                case "EAI_NONAME":
                                case "EAI_SERVICE":
                                case "EAI_SOCKTYPE":
                                    if (retryCount < 10) {
                                        // backoff 3 second than retry
                                        yield sleep(3);
                                        retryCount++;
                                    }
                                    break;
                                default:
                                    throw e;
                            }
                        }
                    }
                });
            }
            class RateLimiter {
                constructor() {
                    this.orderPerSecond = 5;
                    this.requestPerMinute = 600;
                    this.requestTimestamps = [];
                    this.orderTimestamps = [];
                }
                request(weight = 1) {
                    return __awaiter(this, void 0, void 0, function* () {
                        let now;
                        while (true) {
                            now = Date.now();
                            while (this.requestTimestamps.length > 0 && this.requestTimestamps[0] < now - 1000 * 60) {
                                this.requestTimestamps.splice(0, 1);
                            }
                            if (this.requestTimestamps.length >= this.requestPerMinute) {
                                yield sleep(60 - (now - this.requestTimestamps[0]) / 1000);
                            }
                            else
                                break;
                        }
                        for (let i = 0; i < weight; i++)
                            this.requestTimestamps.push(now);
                    });
                }
                order() {
                    return __awaiter(this, void 0, void 0, function* () {
                        let now;
                        while (true) {
                            now = Date.now();
                            while (this.orderTimestamps.length > 0 && this.orderTimestamps[0] < now - 1000) {
                                this.orderTimestamps.splice(0, 1);
                            }
                            if (this.orderTimestamps.length >= this.orderPerSecond) {
                                yield sleep(1 - (now - this.orderTimestamps[0]) / 1000);
                            }
                            else
                                break;
                        }
                        this.orderTimestamps.push(now);
                    });
                }
            }
            class Binance {
                constructor(apiKey, apiSecure, env = "SPOT") {
                    this.apiKey = apiKey;
                    this.apiSecure = apiSecure;
                    this.env = env;
                    this.rateLimiter = new RateLimiter();
                }
                fullUrl(path) {
                    switch (this.env) {
                        case "PRODUCTION":
                            return `https://api.binance.com/api/v3${path}`;
                        default:
                            return `https://testnet.binance.vision/api/v3${path}`;
                    }
                }
                getExchangeInfo() {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield this.rateLimiter.request();
                        const response = yield autoRetryFetch(this.fullUrl("/exchangeInfo"));
                        return yield response.json();
                    });
                }
                getKlineCandlestickData(symbol, interval, options) {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield this.rateLimiter.request();
                        const params = new URLSearchParams({
                            symbol: symbol,
                            interval: interval
                        });
                        options = options || {};
                        for (let name in options) {
                            if (options[name] !== undefined)
                                params.append(name, options[name]);
                        }
                        const respsone = yield autoRetryFetch(this.fullUrl("/klines") + "?" + params);
                        const json = yield respsone.json();
                        return json.map(d => {
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
                getSymbolPriceTicker(symbol) {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield this.rateLimiter.request();
                        const params = new URLSearchParams();
                        if (symbol)
                            params.append("symbol", symbol);
                        const response = yield autoRetryFetch(this.fullUrl("/ticker/price") + "?" + params);
                        const json = yield response.json();
                        return json;
                    });
                }
                getServerTime() {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield this.rateLimiter.request();
                        const response = yield autoRetryFetch(this.fullUrl("/time"));
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
                        yield this.rateLimiter.request();
                        const params = new URLSearchParams({
                            timestamp: yield this.getServerTime()
                        });
                        const response = yield autoRetryFetch(this.fullUrl("/account") + "?" + this.sign(params), {
                            method: "GET",
                            headers: {
                                "X-MBX-APIKEY": this.apiKey
                            }
                        });
                        return response.json();
                    });
                }
                newOrder(symbol, side, quantity, quoteQuantity, type = "MARKET", price) {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield this.rateLimiter.order();
                        const params = new URLSearchParams({
                            symbol: symbol,
                            side: side,
                            type: type,
                            newOrderRespType: "FULL",
                            timestamp: yield this.getServerTime()
                        });
                        if (quantity !== undefined) {
                            params.append("quantity", quantity.toString());
                        }
                        if (quoteQuantity !== undefined) {
                            params.append("quoteOrderQty", quoteQuantity.toString());
                        }
                        if (price !== undefined) {
                            params.append("price", price.toString());
                            params.append("stopPrice", price.toString());
                            params.append("timeInForce", "GTC");
                        }
                        const response = yield autoRetryFetch(this.fullUrl("/order"), {
                            method: "POST",
                            headers: {
                                "X-MBX-APIKEY": this.apiKey
                            },
                            body: this.sign(params)
                        });
                        if (Math.floor(response.status / 100) == 2) {
                            return response.json();
                        }
                        else {
                            throw yield response.json();
                        }
                    });
                }
                testOrder(symbol, side, quantity, quoteQuantity, type = "MARKET") {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield this.rateLimiter.request();
                        const params = new URLSearchParams({
                            symbol: symbol,
                            side: side,
                            type: type,
                            newOrderRespType: "FULL",
                            timestamp: yield this.getServerTime()
                        });
                        if (quantity !== undefined) {
                            params.append("quantity", quantity.toString());
                        }
                        if (quoteQuantity !== undefined) {
                            params.append("quoteOrderQty", quoteQuantity.toString());
                        }
                        const response = yield autoRetryFetch(this.fullUrl("/order/test"), {
                            method: "POST",
                            headers: {
                                "X-MBX-APIKEY": this.apiKey
                            },
                            body: this.sign(params)
                        });
                        if (Math.floor(response.status / 100) == 2) {
                            return response.json();
                        }
                        else {
                            throw yield response.json();
                        }
                    });
                }
                queryOrder(symbol, orderId) {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield this.rateLimiter.request();
                        const params = new URLSearchParams({
                            symbol: symbol,
                            orderId: orderId.toString(),
                            timestamp: yield this.getServerTime()
                        });
                        const response = yield autoRetryFetch(this.fullUrl("/order") + "?" + this.sign(params), {
                            method: "GET",
                            headers: {
                                "X-MBX-APIKEY": this.apiKey
                            }
                        });
                        return response.json();
                    });
                }
                cancelOrder(symbol, orderId) {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield this.rateLimiter.request();
                        const params = new URLSearchParams({
                            symbol: symbol,
                            orderId: orderId.toString(),
                            timestamp: yield this.getServerTime()
                        });
                        const response = yield autoRetryFetch(this.fullUrl("/order") + "?" + this.sign(params), {
                            method: "DELETE",
                            headers: {
                                "X-MBX-APIKEY": this.apiKey
                            }
                        });
                        return response.json();
                    });
                }
                getOpenOrders(symbol) {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield this.rateLimiter.request(symbol ? 3 : 40);
                        const params = new URLSearchParams({
                            timestamp: yield this.getServerTime()
                        });
                        if (symbol)
                            params.set("symbol", symbol);
                        const response = yield autoRetryFetch(this.fullUrl("/openOrders") + "?" + this.sign(params), {
                            method: "GET",
                            headers: {
                                "X-MBX-APIKEY": this.apiKey
                            }
                        });
                        return response.json();
                    });
                }
                cancelAllOpenOrders() {
                    return __awaiter(this, void 0, void 0, function* () {
                        const openOrders = yield this.getOpenOrders();
                        const cancelledOrders = [];
                        yield Promise.all(openOrders.map((order) => __awaiter(this, void 0, void 0, function* () {
                            switch (order.status) {
                                case "NEW":
                                    yield this.rateLimiter.request();
                                    const params = new URLSearchParams({
                                        symbol: order.symbol,
                                        orderId: order.orderId.toString(),
                                        timestamp: yield this.getServerTime()
                                    });
                                    const response = yield autoRetryFetch(this.fullUrl("/order") + "?" + this.sign(params), {
                                        method: "DELETE",
                                        headers: {
                                            "X-MBX-APIKEY": this.apiKey
                                        }
                                    });
                                    cancelledOrders.push(yield response.json());
                                    break;
                            }
                        })));
                        return cancelledOrders;
                    });
                }
                getCurrentOpenOrders(symbol) {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield this.rateLimiter.request();
                        const params = new URLSearchParams({
                            timestamp: yield this.getServerTime()
                        });
                        symbol !== undefined && params.append("symbol", symbol);
                        const response = yield autoRetryFetch(this.fullUrl("/openOrders") + "?" + this.sign(params), {
                            method: "GET",
                            headers: {
                                "X-MBX-APIKEY": this.apiKey
                            }
                        });
                        return response.json();
                    });
                }
                getAllOrders(symbol, startTime, orderId) {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield this.rateLimiter.request(10);
                        const params = new URLSearchParams({
                            symbol: symbol,
                            timestamp: yield this.getServerTime()
                        });
                        if (orderId !== undefined) {
                            params.set("orderId", orderId.toString());
                        }
                        if (startTime !== undefined) {
                            params.set("startTime", startTime.toString());
                        }
                        const response = yield autoRetryFetch(this.fullUrl("/allOrders") + "?" + this.sign(params), {
                            method: "GET",
                            headers: {
                                "X-MBX-APIKEY": this.apiKey
                            }
                        });
                        return response.json();
                    });
                }
            }
            cryptoApi.Binance = Binance;
        })(cryptoApi = danborutori.cryptoApi || (danborutori.cryptoApi = {}));
    })(danborutori = com.danborutori || (com.danborutori = {}));
})(com || (com = {}));
