import { test, expect } from '@playwright/test'; // Import Playwright test runner and assertion functions
import { StatusCodes } from 'http-status-codes'; // Import constants for HTTP status codes

// Define the temporary currency and exchange rates used in tests
const testCurrency = 'CAD';
const validRate = 1.37;
const duplicateRate = 1.5;
const maxBodyBytes = 10000;

// Define valid boundary values for the exchange rate
const validBoundaryRates = [
  { description: 'very small positive rate', rate: 0.000001 },
  { description: 'maximum rate', rate: 1000000 },
];

// Define invalid request bodies for parameterized negative tests
const invalidBodies = [
  {
    description: 'invalid currency code: too short',
    body: { currency: 'US', rate: validRate },
  },
  {
    description: 'rate equal to 0',
    body: { currency: testCurrency, rate: 0 },
  },
  {
    description: 'rate greater than 1000000',
    body: { currency: testCurrency, rate: 1000001 },
  },
  {
    description: 'negative rate',
    body: { currency: testCurrency, rate: -1 },
  },
  {
    description: 'non-numeric rate',
    body: { currency: testCurrency, rate: 'not-a-number' },
  },
  {
    description: 'numeric string rate',
    body: { currency: testCurrency, rate: '1.37' },
  },
  {
    description: 'null rate',
    body: { currency: testCurrency, rate: null },
  },
  {
    description: 'missing rate',
    body: { currency: testCurrency },
  },
  {
    description: 'currency code too long',
    body: { currency: 'XXXX', rate: validRate },
  },
  {
    description: 'lowercase currency code',
    body: { currency: 'cad', rate: validRate },
  },
  {
    description: 'currency code containing a digit',
    body: { currency: 'CA1', rate: validRate },
  },
  {
    description: 'missing currency',
    body: { rate: validRate },
  },
  {
    description: 'numeric currency',
    body: { currency: 123, rate: validRate },
  },
];

// Verify that an invalid request returns the expected status and error structure
async function expectErrorResponse(
  response: Awaited<ReturnType<import('@playwright/test').APIRequestContext['get']>>,
  expectedStatus: number,
) {
  expect(response.status()).toBe(expectedStatus);
  expect(await response.json()).toEqual({ error: expect.any(String) });
}

// Group all tests for the POST /api/rates endpoint
test.describe('POST /api/rates', () => {
  // Remove the temporary currency before each test
  test.beforeEach(async ({ request }) => {
    await request.delete(`/api/rates/${testCurrency}`);
  });

  // Remove the temporary currency after each test
  test.afterEach(async ({ request }) => {
    await request.delete(`/api/rates/${testCurrency}`);
  });

  // Verify that a new currency can be created successfully
  test('creates new currency and returns 201', async ({ request }) => {
    const response = await request.post('/api/rates', {
      data: { currency: testCurrency, rate: validRate },
    });

    expect(response.status()).toBe(StatusCodes.CREATED);
    expect(await response.json()).toEqual({
      currency: testCurrency,
      rate: validRate,
    });
  });

  // Verify that valid boundary values are accepted
  for (const { description, rate } of validBoundaryRates) {
    test(`accepts ${description}`, async ({ request }) => {
      const response = await request.post('/api/rates', {
        data: { currency: testCurrency, rate },
      });

      expect(response.status()).toBe(StatusCodes.CREATED);
      expect(await response.json()).toEqual({
        currency: testCurrency,
        rate,
      });
    });
  }

  // Verify that invalid request bodies are rejected
  for (const { description, body } of invalidBodies) {
    test(`returns 400 for ${description}`, async ({ request }) => {
      const response = await request.post('/api/rates', { data: body });

      expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
    });
  }

  // Verify that malformed JSON is rejected
  test('returns 400 for invalid JSON', async ({ request }) => {
    const response = await request.post('/api/rates', {
      data: '{"currency":"CAD","rate":',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  // Verify that creating an existing currency returns 409 Conflict
  test('returns 409 when currency already exists', async ({ request }) => {
    const firstResponse = await request.post('/api/rates', {
      data: { currency: testCurrency, rate: validRate },
    });

    expect(firstResponse.status()).toBe(StatusCodes.CREATED);

    const response = await request.post('/api/rates', {
      data: { currency: testCurrency, rate: duplicateRate },
    });

    expect(response.status()).toBe(StatusCodes.CONFLICT);

    // Verify that the original rate remains unchanged
    const getResponse = await request.get(`/api/rates/${testCurrency}`);

    expect(getResponse.status()).toBe(StatusCodes.OK);
    expect(await getResponse.json()).toEqual({
      currency: testCurrency,
      rate: validRate,
    });
  });

  // Verify that a request body larger than 10000 bytes is rejected
  test('returns 413 for body larger than 10000 bytes', async ({ request }) => {
    const largeValue = 'A'.repeat(maxBodyBytes + 1);
    const requestBody = {
      currency: testCurrency,
      rate: validRate,
      extra: largeValue,
    };

    const response = await request.post('/api/rates', {
      data: requestBody,
    });

    expect(response.status()).toBe(StatusCodes.REQUEST_TOO_LONG);
  });
});
