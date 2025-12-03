import { makeApiRequest, generateSymbol, parseFullSymbol } from "./helpers.js";
import { subscribeOnStream, unsubscribeFromStream } from "./streaming.js";

const configurationData = {
  supported_resolutions: ["1", "5", "15", "60", "180", "1D", "1W", "1M"],
  exchanges: [
    { value: "Bitfinex", name: "Bitfinex", desc: "Bitfinex" },
    { value: "Kraken", name: "Kraken", desc: "Kraken bitcoin exchange" },
  ],
  symbols_types: [{ name: "crypto", value: "crypto" }],
};

async function getAllSymbols() {
  const data = await makeApiRequest("data/v3/all/exchanges");
  let allSymbols = [];

  for (const exchange of configurationData.exchanges) {
    if (data.Data[exchange.value]) {
      const pairs = data.Data[exchange.value].pairs;

      for (const leftPairPart of Object.keys(pairs)) {
        const symbols = pairs[leftPairPart].map((rightPairPart) => {
          const symbol = generateSymbol(
            exchange.value,
            leftPairPart,
            rightPairPart
          );
          return {
            symbol: symbol.short,
            ticker: symbol.full,
            description: symbol.short,
            exchange: exchange.value,
            type: "crypto",
          };
        });
        allSymbols = [...allSymbols, ...symbols];
      }
    }
  }
  return allSymbols;
}

export default function createDatafeed() {
  const lastBarsCache = new Map();

  return {
    onReady: (callback) => {
      console.log("[onReady]: Method call");
      setTimeout(() => callback(configurationData));
    },

    searchSymbols: async (
      userInput,
      exchange,
      symbolType,
      onResultReadyCallback
    ) => {
      console.log("[searchSymbols]: Method call");
      const symbols = await getAllSymbols();
      const newSymbols = symbols.filter((symbol) => {
        const isExchangeValid = exchange === "" || symbol.exchange === exchange;
        const isFullSymbolContainsInput =
          symbol.ticker.toLowerCase().indexOf(userInput.toLowerCase()) !== -1;
        return isExchangeValid && isFullSymbolContainsInput;
      });
      onResultReadyCallback(newSymbols);
    },

    resolveSymbol: async (
      symbolName,
      onSymbolResolvedCallback,
      onResolveErrorCallback
    ) => {
      console.log("[resolveSymbol]: Method call", symbolName);
      const symbols = await getAllSymbols();
      const symbolItem = symbols.find(({ ticker }) => ticker === symbolName);
      if (!symbolItem) {
        console.log("[resolveSymbol]: Cannot resolve symbol", symbolName);
        onResolveErrorCallback("unknown_symbol");
        return;
      }
      const symbolInfo = {
        ticker: symbolItem.ticker,
        name: symbolItem.symbol,
        description: symbolItem.description,
        type: symbolItem.type,
        exchange: symbolItem.exchange,
        listed_exchange: symbolItem.exchange,
        session: "24x7",
        timezone: "Etc/UTC",
        minmov: 1,
        pricescale: 10000,
        has_intraday: true,
        intraday_multipliers: ["1", "60"],
        has_daily: true,
        daily_multipliers: ["1"],
        visible_plots_set: "ohlcv",
        supported_resolutions: configurationData.supported_resolutions,
        volume_precision: 2,
        data_status: "streaming",
      };

      console.log("[resolveSymbol]: Symbol resolved", symbolName);
      onSymbolResolvedCallback(symbolInfo);
    },

    getBars: async (
      symbolInfo,
      resolution,
      periodParams,
      onHistoryCallback,
      onErrorCallback
    ) => {
      const { from, to, firstDataRequest } = periodParams;
      console.log(
        "[getBars]: Method call",
        symbolInfo,
        resolution,
        from,
        to,
        firstDataRequest
      );
      const parsedSymbol = parseFullSymbol(symbolInfo.ticker);

      let endpoint;
      if (resolution === "1D") {
        endpoint = "histoday";
      } else if (resolution === "60") {
        endpoint = "histohour";
      } else if (resolution === "1") {
        endpoint = "histominute";
      } else {
        onErrorCallback(`Invalid resolution: ${resolution}`);
        return;
      }

      const urlParameters = {
        e: parsedSymbol.exchange,
        fsym: parsedSymbol.fromSymbol,
        tsym: parsedSymbol.toSymbol,
        toTs: to,
        limit: 2000,
      };

      const query = Object.keys(urlParameters)
        .map((name) => `${name}=${encodeURIComponent(urlParameters[name])}`)
        .join("&");

      try {
        const data = await makeApiRequest(`data/v2/${endpoint}?${query}`);
        if (
          (data.Response && data.Response === "Error") ||
          !data.Data ||
          !data.Data.Data ||
          data.Data.Data.length === 0
        ) {
          onHistoryCallback([], { noData: true });
          return;
        }

        let bars = [];
        data.Data.Data.forEach((bar) => {
          if (bar.time >= from && bar.time < to) {
            bars.push({
              time: bar.time * 1000,
              low: bar.low,
              high: bar.high,
              open: bar.open,
              close: bar.close,
              volume: bar.volumefrom,
            });
          }
        });

        if (firstDataRequest && bars.length) {
          lastBarsCache.set(symbolInfo.ticker, { ...bars[bars.length - 1] });
        }
        console.log(`[getBars]: returned ${bars.length} bar(s)`);
        onHistoryCallback(bars, { noData: false });
      } catch (error) {
        console.log("[getBars]: Get error", error);
        onErrorCallback(error);
      }
    },

    subscribeBars: (
      symbolInfo,
      resolution,
      onRealtimeCallback,
      subscriberUID,
      onResetCacheNeededCallback
    ) => {
      console.log(
        "[subscribeBars]: Method call with subscriberUID:",
        subscriberUID
      );
      subscribeOnStream(
        symbolInfo,
        resolution,
        onRealtimeCallback,
        subscriberUID,
        onResetCacheNeededCallback,
        lastBarsCache.get(symbolInfo.ticker)
      );
    },

    unsubscribeBars: (subscriberUID) => {
      console.log(
        "[unsubscribeBars]: Method call with subscriberUID:",
        subscriberUID
      );
      unsubscribeFromStream(subscriberUID);
    },
  };
}
