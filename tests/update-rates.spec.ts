import { APIResponse, test, expect } from '@playwright/test'; // Import Playwright test runner, assertions, and API response type
import { StatusCodes } from 'http-status-codes'; // Import constants for HTTP status codes

// Define the temporary currency and exchange rates used in tests
const testCurrency = 'YYY';
const initialRate = 0.95;
const updatedRate = 1.1;
const maxRate = 1000000;

// Define valid boundary values for the exchange rate
const validBoundaryRates = [
  { description: 'very small positive rate', rate: 0.000001 },
  { description: 'maximum rate', rate: maxRate },
];

// Define invalid rates for parameterized negative tests
const invalidRates = [
  { description: 'rate equal to 0', rate: 0 },
  { description: 'rate greater than 1000000', rate: 1000000.01 },
  { description: 'negative rate', rate: -1 },
  { description: 'non-numeric rate', rate: 'not-a-number' },
  { description: 'numeric string rate', rate: '1.1' },
  { description: 'null rate', rate: null },
];

// Define invalid currency codes for parameterized negative tests
const invalidCodes = [
  { description: 'lowercase currency code', code: 'yyy' },
  { description: 'too short currency code', code: 'YY' },
  { description: 'too long currency code', code: 'YYYY' },
  { description: 'mixed case currency code', code: 'Yyy' },
  { description: 'currency code containing a digit', code: 'YY1' },
];

// Verify that an error response has the expected status and JSON structure
async function expectErrorResponse(response: APIResponse, expectedStatus: number) {
  expect(response.status()).toBe(expectedStatus);
  expect(await response.json()).toEqual({ error: expect.any(String) });
}

// Group tests for the PATCH /api/rates/{currency} endpoint
test.describe('PATCH /api/rates/{currency}', () => {
  // Create a temporary currency before each test
  test.beforeEach(async ({ request }) => {
    // Remove the temporary currency if it already exists
    await request.delete(`/api/rates/${testCurrency}`);

    // Create the temporary currency with its initial rate
    const response = await request.post('/api/rates', {
      data: { currency: testCurrency, rate: initialRate },
    });

    expect(response.status()).toBe(StatusCodes.CREATED);
  });

  // Remove the temporary currency after each test
  test.afterEach(async ({ request }) => {
    await request.delete(`/api/rates/${testCurrency}`);
  });

  // Verify that an existing currency rate can be updated
  test('updates rate of existing currency', async ({ request }) => {
    const response = await request.patch(`/api/rates/${testCurrency}`, {
      data: { rate: updatedRate },
    });

    expect(response.status()).toBe(StatusCodes.OK);
    expect(await response.json()).toEqual({
      currency: testCurrency,
      rate: updatedRate,
    });
  });

  // Verify that the updated rate is persisted
  test('persists the updated rate', async ({ request }) => {
    const patchResponse = await request.patch(`/api/rates/${testCurrency}`, {
      data: { rate: updatedRate },
    });

    expect(patchResponse.status()).toBe(StatusCodes.OK);

    const getResponse = await request.get(`/api/rates/${testCurrency}`);

    expect(getResponse.status()).toBe(StatusCodes.OK);
    expect(await getResponse.json()).toEqual({
      currency: testCurrency,
      rate: updatedRate,
    });
  });

  // Verify that valid boundary values are accepted
  for (const { description, rate } of validBoundaryRates) {
    test(`accepts ${description}`, async ({ request }) => {
      const response = await request.patch(`/api/rates/${testCurrency}`, {
        data: { rate },
      });

      expect(response.status()).toBe(StatusCodes.OK);
      expect(await response.json()).toEqual({
        currency: testCurrency,
        rate,
      });
    });
  }

  // Verify that invalid rates are rejected and the original rate remains unchanged
  for (const { description, rate } of invalidRates) {
    test(`returns 400 for ${description}`, async ({ request }) => {
      const response = await request.patch(`/api/rates/${testCurrency}`, {
        data: { rate },
      });

      await expectErrorResponse(response, StatusCodes.BAD_REQUEST);

      const getResponse = await request.get(`/api/rates/${testCurrency}`);

      expect(getResponse.status()).toBe(StatusCodes.OK);
      expect(await getResponse.json()).toEqual({
        currency: testCurrency,
        rate: initialRate,
      });
    });
  }

  // Verify that a missing rate is rejected
  test('returns 400 when rate is missing', async ({ request }) => {
    const response = await request.patch(`/api/rates/${testCurrency}`, {
      data: {},
    });

    await expectErrorResponse(response, StatusCodes.BAD_REQUEST);

    const getResponse = await request.get(`/api/rates/${testCurrency}`);

    expect(getResponse.status()).toBe(StatusCodes.OK);
    expect(await getResponse.json()).toEqual({
      currency: testCurrency,
      rate: initialRate,
    });
  });

  // Verify that malformed JSON is rejected
  test('returns 400 for invalid JSON', async ({ request }) => {
    const response = await request.patch(`/api/rates/${testCurrency}`, {
      data: '{"rate":',
      headers: { 'Content-Type': 'application/json' },
    });

    await expectErrorResponse(response, StatusCodes.BAD_REQUEST);

    const getResponse = await request.get(`/api/rates/${testCurrency}`);

    expect(getResponse.status()).toBe(StatusCodes.OK);
    expect(await getResponse.json()).toEqual({
      currency: testCurrency,
      rate: initialRate,
    });
  });

  // Verify that invalid currency codes are rejected
  for (const { description, code } of invalidCodes) {
    test(`returns 400 for ${description}`, async ({ request }) => {
      const response = await request.patch(`/api/rates/${code}`, {
        data: { rate: updatedRate },
      });

      await expectErrorResponse(response, StatusCodes.BAD_REQUEST);
    });
  }

  // Verify that updating an unknown currency returns 404
  test('returns 404 for unknown currency', async ({ request }) => {
    const unknownCurrency = 'RRR';

    // Ensure that the unknown currency does not exist before the test
    await request.delete(`/api/rates/${unknownCurrency}`);

    const response = await request.patch(`/api/rates/${unknownCurrency}`, {
      data: { rate: updatedRate },
    });

    await expectErrorResponse(response, StatusCodes.NOT_FOUND);
  });
});
