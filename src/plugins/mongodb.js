import { MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'

import { APPLICATION_SUBMISSIONS_COLLECTION } from '#/services/application-submissions.js'

export const mongoDb = {
  plugin: {
    name: 'mongodb',
    version: '1.0.0',
    register: async function (server, options) {
      server.logger.info('Setting up MongoDb')

      const client = await MongoClient.connect(options.mongoUrl, {
        ...options.mongoOptions
      })

      const databaseName = options.databaseName
      const db = client.db(databaseName)
      const locker = new LockManager(db.collection('mongo-locks'))

      await createIndexes(db)

      server.logger.info(`MongoDb connected to ${databaseName}`)

      server.decorate('server', 'mongoClient', client)
      server.decorate('server', 'db', db)
      server.decorate('server', 'locker', locker)
      server.decorate('request', 'db', () => db, { apply: true })
      server.decorate('request', 'locker', () => locker, { apply: true })

      server.events.on('stop', async () => {
        server.logger.info('Closing Mongo client')
        await client.close(true)
      })
    }
  }
}

async function createIndexes(db) {
  // Ensure the mongo-locks unique index exists before we attempt to acquire a lock.
  // LockManager creates it in its constructor but does not await it.
  // See: node_modules/mongo-locks/dist/esm/index.js
  await db.collection('mongo-locks').createIndex({ action: 1 }, { unique: true })

  await db
    .collection(APPLICATION_SUBMISSIONS_COLLECTION)
    .createIndex({ applicationId: 1 }, { unique: true })
}
