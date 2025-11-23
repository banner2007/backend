export default async function handler(req, res) {
    const response = await fetch("https://api.binance.com/api/v3/time");
    const data = await response.json();
    res.status(200).json(data);
  }
  