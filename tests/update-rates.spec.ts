// Import the Playwright test runner and assertion functions
import { test, expect } from '@playwright/test'

// Import constants for HTTP status codes
import { StatusCodes } from 'http-status-codes'

// Import currency codes from the shared currency file
import { Currency } from './currency'

// Group tests for the PATCH /api/rates/{currency} endpoint
test.describe('PATCH /api/rates/{currency}', () => {
  // Verify that the rate of an existing currency can be updated
  test('updates rate of existing currency', async ({ request }) => {
    // Define the new exchange rate for USD
    const newRate = 1.75

    // Send a PATCH request to update the USD exchange rate
    const response = await request.patch(`/api/rates/${Currency.USD}`, {
      data: {
        rate: newRate,
      },
    })

    // Verify that the API returns HTTP 200 OK
    expect(response.status()).toBe(StatusCodes.OK)

    // Parse the response body as JSON
    const body = await response.json()

    // Verify that the response contains the USD currency code
    expect(body.currency).toBe(Currency.USD)

    // Verify that the returned rate matches the new rate
    expect(body.rate).toBe(newRate)
  })

  // Verify that an invalid rate is rejected
  test('returns 400 for invalid rate', async ({ request }) => {
    // Send a PATCH request with a rate equal to zero
    const response = await request.patch(`/api/rates/${Currency.USD}`, {
      data: {
        rate: 0,
      },
    })

    // Verify that the API returns HTTP 400 Bad Request
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
  })

  // Verify that an invalid currency code is rejected
  test('returns 400 for invalid currency code', async ({ request }) => {
    // Send a PATCH request using a lowercase currency code
    const response = await request.patch('/api/rates/usd', {
      data: {
        rate: 1.5,
      },
    })

    // Verify that the API returns HTTP 400 Bad Request
    expect(response.status()).toBe(StatusCodes.BAD_REQUEST)
  })

  // Verify that updating an unknown currency returns HTTP 404
  test('returns 404 for unknown currency', async ({ request }) => {
    // Send a PATCH request for a currency that does not exist
    const response = await request.patch('/api/rates/ZZZ', {
      data: {
        rate: 1.5,
      },
    })

    // Verify that the API returns HTTP 404 Not Found
    expect(response.status()).toBe(StatusCodes.NOT_FOUND)
  })
})
