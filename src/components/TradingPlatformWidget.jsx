import React, { useEffect, useRef } from "react";
import createDatafeed from "../tradingview/datafeed.js";
import { BrokerMinimal } from "../tradingview/broker.js";
import { loadTradingView } from "../tradingview/loadTradingView.js";

const LIBRARY_PATH = "/trading_platform/charting_library/";

const TradingPlatformWidget = () => {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let tvApi = null;

    const init = async () => {
      try {
        tvApi = await loadTradingView();
        if (!isMounted || !tvApi || !containerRef.current) return;

        const datafeed = createDatafeed();
        const widget = new tvApi.widget({
          symbol: "BTC/EUR",
          interval: "1D",
          fullscreen: false,
          container: containerRef.current,
          datafeed,
          library_path: LIBRARY_PATH,
          locale: "en",
          debug: true,
          debug_broker: "all",
          broker_factory: function (host) {
            return new BrokerMinimal(tvApi, host, datafeed);
          },
          broker_config: {
            configFlags: {
              supportOrdersHistory: false,
            },
          },
        });

        widgetRef.current = widget;

        widget.onChartReady(() => {
          const chart = widget.activeChart();
          chart.onIntervalChanged().subscribe(null, () => {
            widget.resetCache();
            chart.resetData();
          });
          widget.setDebugMode?.(true);
        });
      } catch (err) {
        console.error("Failed to init TradingView widget", err);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (widgetRef.current?.remove) {
        widgetRef.current.remove();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 520,
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        overflow: "hidden",
      }}
    />
  );
};

export default TradingPlatformWidget;
