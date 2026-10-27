import { test, expect } from '@playwright/test'; // Import Playwright test runner and assertion functions
import { StatusCodes } from 'http-status-codes'; // Import constants for HTTP status codes
import { Currency, SEED_CURRENCIES } from './currency'; // Import currency codes and the list of initial currencies

// Define invalid currency codes for parameterized tests
const invalidCodes = [
  { description: 'lowercase currency code', code: 'usd' },
  { description: 'too short currency code', code: 'US' },
  { description: 'too long currency code', code: 'USDD' },
  { description: 'mixed case currency code', code: 'Usd' },
  { description: 'currency code with digit', code: 'U5D' },
];

// Run this setup once before all tests in this file
test.beforeAll(async ({ request }) => {
  // Send a GET request to retrieve all currencies
  const response = await request.get('/api/currencies');

  // Verify that the server returns HTTP 200 OK
  expect(response.status()).toBe(StatusCodes.OK);

  // Parse the JSON response into an array of currency objects
  const currencies: { currency: string }[] = await response.json();

  // Loop through every currency returned by the API
  for (const { currency } of currencies) {
    // Check whether the currency is not part of the initial seed currencies
    if (!SEED_CURRENCIES.includes(currency)) {
      // Delete the rate associated with this extra currency
      const deleted = await request.delete(`/api/rates/${currency}`);

      // Verify that the API confirms successful deletion with status 204
      expect(deleted.status()).toBe(StatusCodes.NO_CONTENT);
    }
  }
});

// Group tests for the GET /api/currencies endpoint
test.describe('GET /api/currencies', () => {
  // Check that the API returns exactly three currencies
  test('returns 3 currencies', async ({ request }) => {
    // Send a GET request to retrieve the currencies
    const response = await request.get('/api/currencies');

    // Verify that the server returns HTTP 200 OK
    expect(response.status()).toBe(StatusCodes.OK);

    // Parse the response body as JSON
    const body = await response.json();

    // Verify that the response contains exactly three currencies
    expect(body).toHaveLength(3);
  });
});

// Group tests for the GET /api/rates/{currency} endpoint
test.describe('GET /api/rates/{currency}', () => {
  // Check that the API returns the exchange rate for USD currency
  test('returns rate for USD existing currency', async ({ request }) => {
    // Send a GET request for the USD exchange rate
    const response = await request.get(`/api/rates/${Currency.USD}`);

    // Verify that the server returns HTTP 200 OK
    expect(response.status()).toBe(StatusCodes.OK);

    // Parse the response body as JSON
    const body = await response.json();

    // Verify that the returned currency matches USD
    expect(body.currency).toBe(Currency.USD);

    // Verify that the exchange rate is a number
    expect(typeof body.rate).toBe('number');

    // Verify that the exchange rate is greater than zero
    expect(body.rate).toBeGreaterThan(0);
  });

  // Check that the API returns the exchange rate for GBP currency
  test('returns rate for GBP existing currency', async ({ request }) => {
    // Send a GET request for the GBP exchange rate
    const response = await request.get(`/api/rates/${Currency.GBP}`);

    // Verify that the server returns HTTP 200 OK
    expect(response.status()).toBe(StatusCodes.OK);

    // Parse the response body as JSON
    const body = await response.json();

    // Verify that the returned currency matches GBP
    expect(body.currency).toBe(Currency.GBP);

    // Verify that the exchange rate is a number
    expect(typeof body.rate).toBe('number');

    // Verify that the exchange rate is greater than zero
    expect(body.rate).toBeGreaterThan(0);

    // Verify that the exchange rate is less than 1000000
    expect(body.rate).toBeLessThan(1000000);
  });

  // Verify that invalid currency code formats return HTTP 400
  for (const { description, code } of invalidCodes) {
    test(`returns 400 for ${description}: ${code}`, async ({ request }) => {
      // Send a GET request using an invalid currency code
      const response = await request.get(`/api/rates/${code}`);

      // Verify that the server returns HTTP 400 Bad Request
      expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
    });
  }

  // Check that an unknown currency code returns HTTP 404
  test('returns 404 for unknown currency', async ({ request }) => {
    // Send a GET request using the unknown currency code RRR
    const response = await request.get('/api/rates/RRR');

    // Verify that the server returns HTTP 404 Not Found
    expect(response.status()).toBe(StatusCodes.NOT_FOUND);
  });
});

// Group additional tests for unsupported methods and unknown URLs
test.describe('Other', () => {
  // Check that using PUT on the rates endpoint returns HTTP 405
  test('returns 405 for unsupported method', async ({ request }) => {
    // Send a PUT request to the USD rates endpoint
    const response = await request.put(`/api/rates/${Currency.USD}`, {
      data: { rate: 1.08 },
    });

    // Verify that the server returns HTTP 405 Method Not Allowed
    expect(response.status()).toBe(StatusCodes.METHOD_NOT_ALLOWED);

    // Verify that the response contains an error field
    expect(await response.json()).toHaveProperty('error');
  });

  // Check that an unknown API URL returns HTTP 404
  test('returns 404 for unknown URL', async ({ request }) => {
    // Send a GET request to an unknown API endpoint
    const response = await request.get('/api/unknown');

    // Verify that the server returns HTTP 404 Not Found
    expect(response.status()).toBe(StatusCodes.NOT_FOUND);

    // Verify that the response contains an error field
    expect(await response.json()).toHaveProperty('error');
  });
});
