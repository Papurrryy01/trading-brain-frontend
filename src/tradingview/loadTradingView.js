let loadingPromise;

export function loadTradingView() {
  if (typeof window !== "undefined" && window.TradingView) {
    return Promise.resolve(window.TradingView);
  }

  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "/trading_platform/charting_library/charting_library.js";
    script.onload = () => resolve(window.TradingView);
    script.onerror = (err) =>
      reject(
        new Error(
          "Failed to load TradingView charting library. Ensure files are in /public/trading_platform/charting_library/"
        )
      );
    document.body.appendChild(script);
  });

  return loadingPromise;
}
