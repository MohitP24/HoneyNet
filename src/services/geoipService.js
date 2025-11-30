const axios = require('axios');
const logger = require('../utils/logger');
const db = require('../database/connection');

class GeoIPService {
  constructor() {
    // Using free IP geolocation API (no key required for basic usage)
    this.apiUrl = 'http://ip-api.com/json';
    this.cache = new Map(); // Cache results to avoid repeated API calls
    this.rateLimitDelay = 1500; // 1.5 seconds between requests (free tier: 45 req/min)
    this.lastRequestTime = 0;
  }

  async lookup(ipAddress) {
    try {
      // Check cache first
      if (this.cache.has(ipAddress)) {
        logger.debug(`GeoIP cache hit for ${ipAddress}`);
        return this.cache.get(ipAddress);
      }

      // Rate limiting (SAFETY: respects free tier 45 req/min limit)
      await this.respectRateLimit();

      logger.debug(`GeoIP lookup for ${ipAddress} (FREE service - no API key needed, no cost)`);

      // Lookup IP (100% FREE - unlimited requests at 45/min)
      const response = await axios.get(`${this.apiUrl}/${ipAddress}`, {
        timeout: 5000,
        params: {
          fields: 'status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query'
        }
      });

      if (response.data.status === 'success') {
        const geoData = {
          country: response.data.country || null,
          country_code: response.data.countryCode || null,
          region: response.data.regionName || null,
          city: response.data.city || null,
          latitude: response.data.lat || null,
          longitude: response.data.lon || null,
          timezone: response.data.timezone || null,
          isp: response.data.isp || null,
          organization: response.data.org || null,
          asn: response.data.as || null
        };

        // Cache the result
        this.cache.set(ipAddress, geoData);

        logger.info(`GeoIP lookup successful for ${ipAddress}`, {
          country: geoData.country,
          city: geoData.city
        });

        return geoData;
      } else {
        logger.warn(`GeoIP lookup failed for ${ipAddress}: ${response.data.message}`);
        return null;
      }
    } catch (error) {
      if (error.response?.status === 429) {
        logger.warn('GeoIP rate limit exceeded (45/min). Waiting before retry. Service is FREE - no charges.');
      } else {
        logger.error(`GeoIP lookup error for ${ipAddress}:`, error.message);
      }
      return null;
    }
  }

  async respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  async updateAttackerGeoInfo(ipAddress) {
    try {
      const geoData = await this.lookup(ipAddress);
      
      if (!geoData) {
        return false;
      }

      // Update attacker record in database
      const query = `
        UPDATE attackers
        SET 
          country = $2,
          country_code = $3,
          region = $4,
          city = $5,
          latitude = $6,
          longitude = $7,
          timezone = $8,
          isp = $9,
          organization = $10,
          asn = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE ip_address = $1
      `;

      const values = [
        ipAddress,
        geoData.country,
        geoData.country_code,
        geoData.region,
        geoData.city,
        geoData.latitude,
        geoData.longitude,
        geoData.timezone,
        geoData.isp,
        geoData.organization,
        geoData.asn
      ];

      await db.query(query, values);

      logger.info(`Updated geo info for attacker ${ipAddress}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update geo info for ${ipAddress}:`, error);
      return false;
    }
  }

  clearCache() {
    this.cache.clear();
    logger.info('GeoIP cache cleared');
  }

  getCacheSize() {
    return this.cache.size;
  }
}

module.exports = new GeoIPService();
