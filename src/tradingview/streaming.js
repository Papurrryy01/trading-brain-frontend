import { parseFullSymbol, apiKey } from "./helpers.js";

const socket = new WebSocket(
  "wss://streamer.cryptocompare.com/v2?api_key=" + apiKey
);

const channelToSubscription = new Map();

socket.addEventListener("open", () => {
  console.log("[socket] Connected");
});

socket.addEventListener("close", (reason) => {
  console.log("[socket] Disconnected:", reason);
});

socket.addEventListener("error", (error) => {
  console.log("[socket] Error:", error);
});

function getNextBarTime(barTime, resolution) {
  const date = new Date(barTime);
  const interval = parseInt(resolution);

  if (resolution === "1D") {
    date.setUTCDate(date.getUTCDate() + 1);
    date.setUTCHours(0, 0, 0, 0);
  } else if (!isNaN(interval)) {
    date.setUTCMinutes(date.getUTCMinutes() + interval);
  }
  return date.getTime();
}

socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  const {
    TYPE: eventType,
    M: exchange,
    FSYM: fromSymbol,
    TSYM: toSymbol,
    TS: tradeTime,
    P: tradePrice,
    Q: tradeVolume,
  } = data;

  if (parseInt(eventType) !== 0) {
    return;
  }

  const channelString = `0~${exchange}~${fromSymbol}~${toSymbol}`;
  const subscriptionItem = channelToSubscription.get(channelString);

  if (subscriptionItem === undefined) {
    return;
  }

  const lastBar = subscriptionItem.lastBar;
  if (!lastBar) {
    return;
  }

  const nextBarTime = getNextBarTime(lastBar.time, subscriptionItem.resolution);

  let bar;
  if (tradeTime * 1000 >= nextBarTime) {
    bar = {
      time: nextBarTime,
      open: tradePrice,
      high: tradePrice,
      low: tradePrice,
      close: tradePrice,
      volume: tradeVolume,
    };
  } else {
    bar = {
      ...lastBar,
      high: Math.max(lastBar.high, tradePrice),
      low: Math.min(lastBar.low, tradePrice),
      close: tradePrice,
      volume: (lastBar.volume || 0) + tradeVolume,
    };
  }
  subscriptionItem.lastBar = bar;

  subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
});

export function subscribeOnStream(
  symbolInfo,
  resolution,
  onRealtimeCallback,
  subscriberUID,
  onResetCacheNeededCallback,
  lastBar
) {
  if (!symbolInfo || !symbolInfo.ticker) {
    console.error("[subscribeBars]: Invalid symbolInfo:", symbolInfo);
    return;
  }

  const parsedSymbol = parseFullSymbol(symbolInfo.ticker);
  const channelString = `0~${parsedSymbol.exchange}~${parsedSymbol.fromSymbol}~${parsedSymbol.toSymbol}`;

  const handler = {
    id: subscriberUID,
    callback: onRealtimeCallback,
  };

  let subscriptionItem = channelToSubscription.get(channelString);
  if (subscriptionItem) {
    console.log("Updating existing subscription with new resolution:", resolution);
    subscriptionItem.resolution = resolution;
    subscriptionItem.lastBar = lastBar;
    subscriptionItem.handlers.push(handler);
    return;
  }

  subscriptionItem = {
    subscriberUID,
    resolution,
    lastBar,
    handlers: [handler],
  };

  channelToSubscription.set(channelString, subscriptionItem);
  console.log("[subscribeBars]: Subscribe to streaming. Channel:", channelString);

  const subRequest = {
    action: "SubAdd",
    subs: [channelString],
  };

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(subRequest));
  } else {
    socket.addEventListener(
      "open",
      () => socket.send(JSON.stringify(subRequest)),
      { once: true }
    );
  }
}

export function unsubscribeFromStream(subscriberUID) {
  for (const channelString of channelToSubscription.keys()) {
    const subscriptionItem = channelToSubscription.get(channelString);
    if (!subscriptionItem) continue;

    const handlerIndex = subscriptionItem.handlers.findIndex(
      (handler) => handler.id === subscriberUID
    );

    if (handlerIndex !== -1) {
      subscriptionItem.handlers.splice(handlerIndex, 1);

      if (subscriptionItem.handlers.length === 0) {
        console.log(
          "[unsubscribeBars]: Unsubscribe from streaming. Channel:",
          channelString
        );
        const subRequest = {
          action: "SubRemove",
          subs: [channelString],
        };
        socket.send(JSON.stringify(subRequest));
        channelToSubscription.delete(channelString);
        break;
      }
    }
  }
}
