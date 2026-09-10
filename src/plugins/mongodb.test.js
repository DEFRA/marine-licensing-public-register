import { Db, MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'

describe('#mongoDb', () => {
  let server

  beforeAll(async () => {
    const { createServer } = await import('#/server.js')

    server = await createServer()
    await server.initialize()
    await server.db
      .collection('mongo-locks')
      .createIndex({ action: 1 }, { unique: true })
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
      server.mongoClient.close = vi.fn()
      await server.stop({ timeout: 1000 })

      expect(server.mongoClient.close).toHaveBeenCalledWith(true)
    })
  })
})
