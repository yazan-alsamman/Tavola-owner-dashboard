import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  entityHeading,
  groupBucketsByEntity,
  netRecordedFee,
  resolveEntityNames,
  summarizeByCurrency,
  type RevenueBucketAmounts,
} from './revenueReport.ts'

function bucket(
  key: string,
  currency: string,
  recordedTotal: number,
  reversedTotal: number,
): RevenueBucketAmounts {
  return {
    key,
    currency,
    recordedCount: recordedTotal > 0 ? 1 : 0,
    recordedTotal,
    reversedCount: reversedTotal > 0 ? 1 : 0,
    reversedTotal,
  }
}

test('two currencies are not summed', () => {
  const totals = summarizeByCurrency([
    bucket('rest-1', 'JOD', 3306, 24),
    bucket('rest-1', 'USD', 480, 0),
    bucket('rest-2', 'JOD', 10, 0),
  ])

  assert.equal(totals.length, 2)
  const jod = totals.find((row) => row.currency === 'JOD')
  const usd = totals.find((row) => row.currency === 'USD')
  assert.ok(jod)
  assert.ok(usd)
  assert.equal(jod.recordedTotal, 3316)
  assert.equal(usd.recordedTotal, 480)
  assert.notEqual(jod.recordedTotal + usd.recordedTotal, jod.recordedTotal)
  assert.equal(
    totals.some((row) => row.recordedTotal === 3316 + 480),
    false,
  )
})

test('net recorded fee equals recorded minus reversed', () => {
  assert.equal(netRecordedFee(3306, 24), 3282)
  const [jod] = summarizeByCurrency([bucket('rest-1', 'JOD', 3306, 24)])
  assert.equal(jod.netRecorded, 3282)
  assert.equal(jod.netRecorded, jod.recordedTotal - jod.reversedTotal)
})

test('a missing name falls back to the id', () => {
  const heading = entityHeading('rest-missing', undefined)
  assert.equal(heading.title, 'rest-missing')
  assert.equal(heading.nameFound, false)

  const groups = groupBucketsByEntity(
    [bucket('rest-missing', 'JOD', 3, 0)],
    new Map(),
  )
  assert.equal(groups[0]?.title, 'rest-missing')
  assert.equal(groups[0]?.nameFound, false)
})

test('a restaurant id on a later lookup page still resolves to its name', async () => {
  const target = 'rest-on-page-2'
  const calls: number[] = []
  const found = await resolveEntityNames(
    [target],
    (page, limit) => {
      calls.push(page)
      assert.equal(limit, 2)
      if (page === 1) {
        return Promise.resolve({
          items: [
            { id: 'rest-a', name: 'Alpha', slug: 'alpha' },
            { id: 'rest-b', name: 'Beta', slug: 'beta' },
          ],
          total: 4,
        })
      }
      return Promise.resolve({
        items: [
          { id: target, name: 'The Old Mill', slug: 'the-old-mill' },
          { id: 'rest-c', name: 'Gamma', slug: 'gamma' },
        ],
        total: 4,
      })
    },
    2,
  )

  assert.deepEqual(calls, [1, 2])
  assert.equal(found.get(target)?.name, 'The Old Mill')
  const groups = groupBucketsByEntity(
    [bucket(target, 'JOD', 0, 3)],
    found,
  )
  assert.equal(groups[0]?.title, 'The Old Mill')
  assert.equal(groups[0]?.slug, 'the-old-mill')
  assert.equal(groups[0]?.currencies[0]?.netRecorded, -3)
})

test('lookup stops once every key is resolved and a failed page keeps earlier names', async () => {
  let calls = 0
  const found = await resolveEntityNames(
    ['rest-a'],
    (page) => {
      calls += 1
      if (page === 1) {
        return Promise.resolve({
          items: [{ id: 'rest-a', name: 'Alpha', slug: 'alpha' }],
          total: 300,
        })
      }
      return Promise.reject(new Error('should not fetch another page'))
    },
    1,
  )
  assert.equal(calls, 1)
  assert.equal(found.get('rest-a')?.name, 'Alpha')

  const partial = await resolveEntityNames(['rest-a', 'rest-b'], async (page) => {
    if (page === 1) {
      return { items: [{ id: 'rest-a', name: 'Alpha' }], total: 50 }
    }
    throw new Error('lookup failed')
  }, 1)
  assert.equal(partial.get('rest-a')?.name, 'Alpha')
  assert.equal(partial.has('rest-b'), false)
  assert.equal(entityHeading('rest-b', partial.get('rest-b')).title, 'rest-b')
})
