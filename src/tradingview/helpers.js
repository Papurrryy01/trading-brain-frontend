// Trading Platform / Datafeed helpers for CryptoCompare

export const apiKey =
  import.meta.env.VITE_CRYPTOCOMPARE_API_KEY || "<api-key>";

export async function makeApiRequest(path) {
  const url = new URL(path, "https://min-api.cryptocompare.com/");
  if (apiKey && apiKey !== "<api-key>") {
    url.searchParams.append("api_key", apiKey);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`CryptoCompare request error: ${response.status}`);
  }
  return response.json();
}

export function generateSymbol(exchange, fromSymbol, toSymbol) {
  const short = `${fromSymbol}/${toSymbol}`;
  return {
    short,
    full: `${exchange}:${short}`,
  };
}

export function parseFullSymbol(fullSymbol) {
  const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
  if (!match) {
    return null;
  }
  return { exchange: match[1], fromSymbol: match[2], toSymbol: match[3] };
}
