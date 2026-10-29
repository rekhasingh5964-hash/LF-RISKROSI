import test from 'node:test'
import assert from 'node:assert/strict'
import { serializeCsv } from '../lib/csv.js'

test('CSV serialization quotes values and neutralizes spreadsheet formulas', () => {
  assert.equal(
    serializeCsv(['event', 'summary'], [{ event: 'INCIDENT', summary: '=HYPERLINK("https://example.test")' }]),
    '"event","summary"\r\n"INCIDENT","\'=HYPERLINK(""https://example.test"")"',
  )
})

test('CSV serialization emits safe empty cells and preserves Unicode', () => {
  assert.equal(
    serializeCsv(['summary', 'details'], [{ summary: 'मदद, incident', details: null }]),
    '"summary","details"\r\n"मदद, incident",""',
  )
})
