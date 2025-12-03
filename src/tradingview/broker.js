// Minimal Broker API mock to enable trading UI inside TradingBrain.

const getOrFallback = (obj, key, fallback) =>
  (obj && obj[key]) || fallback;

export class BrokerMinimal {
  constructor(tvApi, host, quotesProvider) {
    this._tv = tvApi || {};
    this._host = host;
    this._quotesProvider = quotesProvider;
    this._accountId = "1";
    this._orderById = {};
    this._orderIdCounter = 1;

    this.ConnectionStatus = this._tv.ConnectionStatus || {};
    this.StandardFormatterName = this._tv.StandardFormatterName || {};
    this.OrderStatus = this._tv.OrderStatus || {};
    this.OrderType = this._tv.OrderType || {};
    this.Side = this._tv.Side || {};
  }

  _orders() {
    return Object.values(this._orderById);
  }

  async orders() {
    return this._orders();
  }

  async positions() {
    return [];
  }

  async modifyOrder(order /* confirmId unused in mock */) {
    const originalOrder = this._orderById?.[order?.id];
    if (!originalOrder) return;

    const updated = { ...originalOrder, ...order };
    this._orderById[originalOrder.id] = updated;
    this._host.orderUpdate(updated);
  }

  async cancelOrder(orderId) {
    const originalOrder = this._orderById?.[orderId];
    if (!originalOrder) return;

    originalOrder.status =
      getOrFallback(this.OrderStatus, "Canceled", "canceled");
    this._host.orderUpdate(originalOrder);
  }

  chartContextMenuActions(context, options) {
    return this._host.defaultContextMenuActions(context, options);
  }

  async isTradable() {
    return true;
  }

  connectionStatus() {
    return getOrFallback(this.ConnectionStatus, "Connected", "connected");
  }

  async executions() {
    return [];
  }

  async symbolInfo(symbol) {
    const mintick =
      (await this._host.getSymbolMinTick?.(symbol)) ??
      (await this._quotesProvider?.getMinTick?.(symbol)) ??
      0.0001;
    const pipSize = mintick;
    const accountCurrencyRate = 1;
    const pointValue = 1;

    return {
      qty: {
        min: 1,
        max: 1e12,
        step: 1,
      },
      pipValue: pipSize * pointValue * accountCurrencyRate || 1,
      pipSize: pipSize,
      minTick: mintick,
      description: symbol || "",
    };
  }

  accountManagerInfo() {
    const fmt = (name) => getOrFallback(this.StandardFormatterName, name, name);
    return {
      accountTitle: "Trading Sample",
      summary: [],
      orderColumns: [
        {
          label: "Symbol",
          formatter: fmt("Symbol"),
          id: "symbol",
          dataFields: ["symbol", "symbol", "message"],
        },
        {
          label: "Side",
          id: "side",
          dataFields: ["side"],
          formatter: fmt("Side"),
        },
        {
          label: "Type",
          id: "type",
          dataFields: ["type", "parentId", "stopType"],
          formatter: fmt("Type"),
        },
        {
          label: "Qty",
          alignment: "right",
          id: "qty",
          dataFields: ["qty"],
          formatter: fmt("FormatQuantity"),
        },
        {
          label: "Status",
          id: "status",
          dataFields: ["status"],
          formatter: fmt("Status"),
        },
        {
          label: "Order ID",
          id: "id",
          dataFields: ["id"],
        },
      ],
      positionColumns: [
        {
          label: "Symbol",
          formatter: fmt("Symbol"),
          id: "symbol",
          dataFields: ["symbol", "symbol", "message"],
        },
        {
          label: "Side",
          id: "side",
          dataFields: ["side"],
          formatter: fmt("Side"),
        },
        {
          label: "Qty",
          alignment: "right",
          id: "qty",
          dataFields: ["qty"],
          formatter: fmt("FormatQuantity"),
        },
      ],
      pages: [],
    };
  }

  async accountsMetainfo() {
    return [
      {
        id: this._accountId,
        name: "Test account",
      },
    ];
  }

  currentAccount() {
    return this._accountId;
  }

  async placeOrder(order) {
    const newOrder = {
      id: `${this._orderIdCounter++}`,
      limitPrice: order.limitPrice,
      qty: order.qty,
      side: order.side || getOrFallback(this.Side, "Buy", "buy"),
      status: getOrFallback(this.OrderStatus, "Working", "working"),
      stopPrice: order.stopPrice,
      symbol: order.symbol,
      type: order.type || getOrFallback(this.OrderType, "Market", "market"),
      takeProfit: order.takeProfit,
      stopLoss: order.stopLoss,
    };

    this._orderById[newOrder.id] = newOrder;
    this._host.orderUpdate(newOrder);

    return { id: newOrder.id };
  }
}
