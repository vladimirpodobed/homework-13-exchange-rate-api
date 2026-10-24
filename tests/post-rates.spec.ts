// Import the Playwright test runner and test functions
import { test, expect } from '@playwright/test'
// Import constants for HTTP status codes
import { StatusCodes } from 'http-status-codes'
// Import the Currency enum containing currency codes
import { Currency } from './currency'

// Group all tests for the POST /api/rates endpoint
test.describe('POST /api/rates', () => {
  // Verify that a new currency can be created successfully
  test('creates new currency and returns 201', async ({ request }) => {
    // Send a POST request with a new currency and its exchange rate
    const response = await request.post('/api/rates', {
      data: {
        currency: Currency.CHF,
        rate: 1.25,
      },
    })

    // Verify that the API returns HTTP 201 Created
    expect(response.status()).toBe(StatusCodes.CREATED)

    // Parse the response body as JSON
    const body = await response.json()

    // Verify that the response contains the created currency
    expect(body.currency).toBe(Currency.CHF)

    // Verify that the returned rate matches the submitted rate
    expect(body.rate).toBe(1.25)
  })

  // Verify that an invalid currency code is rejected
  test('returns 400 for invalid currency code', async ({ request }) => {
    // Send a POST request with an invalid currency code
    const response = await request.post('/api/rates', {
      data: {
        currency: 'US',
        rate: 1.25,
      },
    })

    // Verify that the API returns HTTP 400 Bad Request
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
  })

  // Verify that a rate equal to zero is rejected
  test('returns 400 for rate equal to 0', async ({ request }) => {
    // Send a POST request with a rate of zero
    const response = await request.post('/api/rates', {
      data: {
        currency: 'CAD',
        rate: 0,
      },
    })

    // Verify that the API returns HTTP 400 Bad Request
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
  })

  // Verify that a rate greater than 1000000 is rejected
  test('returns 400 for rate greater than 1000000', async ({ request }) => {
    // Send a POST request with a rate above the permitted maximum
    const response = await request.post('/api/rates', {
      data: {
        currency: 'CAD',
        rate: 1000001,
      },
    })

    // Verify that the API returns HTTP 400 Bad Request
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
  })

  // Verify that a non-numeric rate is rejected
  test('returns 400 for non-numeric rate', async ({ request }) => {
    // Send a POST request with a string instead of a numeric rate
    const response = await request.post('/api/rates', {
      data: {
        currency: 'CAD',
        rate: 'not-a-number',
      },
    })

    // Verify that the API returns HTTP 400 Bad Request
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
  })

  // Verify that invalid JSON is rejected
  test('returns 400 for invalid JSON', async ({ request }) => {
    // Send a POST request containing malformed JSON
    const response = await request.post('/api/rates', {
      data: '{"currency":"CAD","rate":',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Verify that the API returns HTTP 400 Bad Request
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
  })

  // Verify that creating a currency that already exists is rejected
  test('returns 409 when currency already exists', async ({ request }) => {
    // Send a POST request using a currency that already exists
    const response = await request.post('/api/rates', {
      data: {
        currency: Currency.USD,
        rate: 1.5,
      },
    })

    // Verify that the API returns HTTP 409 Conflict
    expect(response.status()).toBe(StatusCodes.CONFLICT)
  })

  // Verify that a request body larger than 10000 bytes is rejected
  test('returns 413 for body larger than 10000 bytes', async ({ request }) => {
    // Create a string containing more than 10000 characters
    const largeValue = 'A'.repeat(11000)

    // Send a POST request with a body larger than the permitted limit
    const response = await request.post('/api/rates', {
      data: largeValue,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Verify that the API returns HTTP 413 Payload Too Large
    expect(response.status()).toBe(413)})
})
