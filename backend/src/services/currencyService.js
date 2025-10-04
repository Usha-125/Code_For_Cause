const axios = require('axios');

class CurrencyService {
  constructor() {
    this.exchangeRateCache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
  }

  async getCountries() {
    try {
      const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,currencies');
      return response.data.map(country => ({
        name: country.name.common,
        currencies: country.currencies ? Object.keys(country.currencies).map(code => ({
          code,
          name: country.currencies[code].name,
          symbol: country.currencies[code].symbol
        })) : []
      })).filter(country => country.currencies.length > 0);
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw new Error('Failed to fetch countries');
    }
  }

  async getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = this.exchangeRateCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.rate;
    }

    try {
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
      const rate = response.data.rates[toCurrency];

      if (!rate) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      this.exchangeRateCache.set(cacheKey, {
        rate,
        timestamp: Date.now()
      });

      return rate;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      throw new Error('Failed to fetch exchange rate');
    }
  }

  async convertAmount(amount, fromCurrency, toCurrency) {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return parseFloat((amount * rate).toFixed(2));
  }
}

module.exports = new CurrencyService();
