const axios = require('axios');
const yaml = require('yaml');
const fs = require('fs');

const domainStats = new Map(); // To store statistics for each domain

async function makeApiCall(url, method = 'GET', body = null, headers = {}) {
  try {
    const options = {
      method: method.toUpperCase(),
      url,
      data: body,
      headers,
    };

    const response = await Promise.race([
      axios(options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 500)
      ),
    ]);

    const result = {
      domain: getDomain(url),
      url,
      method,
      success: response.status >= 200 && response.status < 300,
      status: response.status,
    };

    console.log('Request Result:', result);
    return result;
  } catch (error) {
    const result = {
      domain: getDomain(url),
      url,
      method,
      success: false,
      status: error.response ? error.response.status : 'Request Error',
    };

    console.log('Request Result:', result);
    return result;
  }
}

function getDomain(url) {
  return new URL(url).hostname;
}

function calculateDomainAvailability(domainStats) {
  const results = [];

  for (const [domain, stats] of domainStats.entries()) {
    const { successes, totalRequests } = stats;
    const availability = (successes / totalRequests) * 100;
    results.push({ domain, availability: availability.toFixed(2) + '%' });
  }

  return results;
}

async function monitorEndpoints(endpoints) {
  for (const endpoint of endpoints) {
    const { url, method, body, headers } = endpoint;
    const result = await makeApiCall(url, method, body, headers);

    const domain = result.domain;
    if (!domainStats.has(domain)) {
      domainStats.set(domain, { successes: 0, totalRequests: 0 });
    }

    const stats = domainStats.get(domain);
    stats.totalRequests++;
    if (result.success) {
      stats.successes++;
    }
  }

  const domainResults = calculateDomainAvailability(domainStats);
  console.log('Domain Availability:', domainResults);
}

function main() {
  try {
    const filePath = process.argv[2];

    if (!filePath) {
      console.error(
        'Error: Please provide the YAML file path as a command-line argument.'
      );
      return;
    }

    const yamlData = fs.readFileSync(filePath, 'utf8');
    const endpoints = yaml.parse(yamlData);

    setInterval(() => {
      monitorEndpoints(endpoints);
    }, 15000); // 15 seconds
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
