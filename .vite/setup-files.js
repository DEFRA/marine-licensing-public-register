import { vi, afterAll, beforeAll, beforeEach, inject } from 'vitest'
import { MongoClient } from 'mongodb'
import createFetchMock from 'vitest-fetch-mock'

import { APPLICATION_SUBMISSIONS_COLLECTION } from '../src/services/application-submissions.js'

const fetchMock = createFetchMock(vi)

// Test files run concurrently against one shared mongod, so each worker slot
// gets its own database. VITEST_POOL_ID identifies the slot and is bounded by
// maxWorkers; only one file occupies a slot at a time, so no two concurrent
// files can share a database. This is assigned at module scope because it must
// land in the environment before a test file imports config.js, which reads
// MONGO_DATABASE once at import time.
const databaseName = `marine-licensing-public-register-${process.env.VITEST_POOL_ID ?? 1}`
process.env.MONGO_DATABASE = databaseName

let client

beforeAll(async () => {
  fetchMock.enableMocks()
  globalThis.fetch = fetchMock
  globalThis.fetchMock = fetchMock
  client = await MongoClient.connect(inject('mongoUri'))
  globalThis.mockMongo = client.db(databaseName)

  // The worker slot's database outlives the files that ran before this one, so
  // drop it to give each test file the pristine state it would get from its own
  // server.
  await globalThis.mockMongo.dropDatabase()
})

beforeEach(async () => {
  const collection = globalThis.mockMongo?.collection(
    APPLICATION_SUBMISSIONS_COLLECTION
  )
  if (collection?.deleteMany) {
    await collection.deleteMany({})
  }
})

afterAll(async () => {
  fetchMock.disableMocks()
  await client.close()
})
