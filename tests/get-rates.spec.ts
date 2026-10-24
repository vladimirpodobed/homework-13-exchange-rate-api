import { test, expect } from '@playwright/test'; // Import Playwright test runner and assertion functions
import { StatusCodes } from 'http-status-codes'; // Import constants for HTTP status codes
import { Currency, SEED_CURRENCIES } from './currency'; // Import currency codes and the list of initial currencies

// Run this setup once before all tests in this file
test.beforeAll(async ({ request }) => {
  // Send a GET request to retrieve all currencies
  const response = await request.get('/api/currencies');

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

    // Verify that the response contains exactly three items
    expect(body).toHaveLength(3);
  });
});

// Group tests for the GET /api/rates/{currency} endpoint
test.describe('GET /api/rates/{currency}', () => {
  // Check that the API returns the exchange rate for an existing currency
  test('returns rate for existing currency', async ({ request }) => {
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

  // Check that a lowercase currency code is rejected with HTTP 400
  test('returns 400 for lowercase currency code', async ({ request }) => {
    // Send a GET request using the lowercase currency code "usd"
    const response = await request.get('/api/rates/usd');

    // Verify that the server returns HTTP 400 Bad Request
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  // Check that a currency code that is too short is rejected with HTTP 400
  test('returns 400 for too short currency code', async ({ request }) => {
    // Send a GET request using the two-letter currency code "US"
    const response = await request.get('/api/rates/US');

    // Verify that the server returns HTTP 400 Bad Request
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  // Check that an unknown currency code returns HTTP 404
  test('returns 404 for unknown currency', async ({ request }) => {
    // Send a GET request using the unknown currency code "ZZZ"
    const response = await request.get('/api/rates/ZZZ');

    // Verify that the server returns HTTP 404 Not Found
    expect(response.status()).toBe(StatusCodes.NOT_FOUND);
  });
});

// Group additional tests for unsupported methods and unknown URLs
test.describe('Other', () => {
  // Check that using POST on the currencies endpoint returns HTTP 405
  test('returns 405 for unsupported method', async ({ request }) => {
    // Send a POST request to the currencies endpoint without a request body
    const response = await request.post('/api/currencies');

    // Verify that the server returns HTTP 405 Method Not Allowed
    expect(response.status()).toBe(StatusCodes.METHOD_NOT_ALLOWED);
  });

  // Check that an unknown API URL returns HTTP 404
  test('returns 404 for unknown URL', async ({ request }) => {
    // Send a GET request to a URL that does not exist
    const response = await request.get('/api/unknown-url');

    // Verify that the server returns HTTP 404 Not Found
    expect(response.status()).toBe(StatusCodes.NOT_FOUND);
  });
});
