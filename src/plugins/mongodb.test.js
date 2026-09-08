import { Db, MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'

import { closeMongoClient } from './mongodb.js'

describe('#mongoDb', () => {
  let server

  // Dynamic import needed — server.js pulls in config.js, which reads MONGO_URI
  // at import time, so the import is deferred until the shared mongod's URI is
  // in the environment.
  beforeAll(async () => {
    const { createServer } = await import('#/server.js')

    server = await createServer()
    await server.initialize()
    // LockManager fires a createIndex during construction that isn't awaited.
    // Wait for it to settle so it doesn't reject during teardown.
    await server.db.collection('mongo-locks').createIndex({ id: 1 })
  })

  describe('Set up', () => {
    test('Server should have expected MongoDb decorators', () => {
      expect(server.db).toBeInstanceOf(Db)
      expect(server.mongoClient).toBeInstanceOf(MongoClient)
      expect(server.locker).toBeInstanceOf(LockManager)
    })

    test('MongoDb should have expected database name', () => {
      expect(server.db.databaseName).toBe(process.env.MONGO_DATABASE)
    })

    test('MongoDb should have expected namespace', () => {
      expect(server.db.namespace).toBe(process.env.MONGO_DATABASE)
    })
  })

  describe('Shut down', () => {
    test('Should close Mongo client on server stop', async () => {
      server.mongoClient.close = vi.fn().mockResolvedValue()
      await server.stop({ timeout: 1000 })

      // Hapi emits 'stop' without awaiting async listeners, so close runs after
      // waitForMongoIdle yields back to the event loop.
      await vi.waitFor(() => {
        expect(server.mongoClient.close).toHaveBeenCalled()
      })
    })
  })
})

describe('#closeMongoClient', () => {
  test('Should log when waiting for mongo idle fails and still close', async () => {
    const logger = { info: vi.fn(), error: vi.fn() }
    const close = vi.fn().mockResolvedValue()
    const client = {
      close,
      s: {
        activeSessions: {
          size: 1,
          [Symbol.iterator]: () => {
            throw new Error('idle boom')
          }
        }
      }
    }

    await closeMongoClient({ logger }, client)

    expect(logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'failed waiting for mongo idle'
    )
    expect(close).toHaveBeenCalled()
  })

  test('Should log when closing the mongo client fails', async () => {
    const logger = { info: vi.fn(), error: vi.fn() }
    const client = {
      close: vi.fn().mockRejectedValue(new Error('close boom'))
    }

    await closeMongoClient({ logger }, client)

    expect(logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'failed to close mongo client'
    )
  })
})
