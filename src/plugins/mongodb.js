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
        try {
          // MongoDB 7 interrupts checked-out connections on close before sessions
          // finish releasing them, which becomes an unhandled MongoClientClosedError.
          await waitForMongoIdle(client)
        } catch (e) {
          server.logger.error(e, 'failed waiting for mongo idle')
        }

        try {
          await client.close()
        } catch (e) {
          server.logger.error(e, 'failed to close mongo client')
        }
      })
    }
  }
}

async function endActiveSessions(client) {
  const sessions = client.s?.activeSessions
  if (!sessions?.size) {
    return
  }

  await Promise.all(
    Array.from(sessions, (session) =>
      session.endSession().catch(() => undefined)
    )
  )
}

function checkedOutConnectionCount(client) {
  const servers = client.topology?.s?.servers
  if (!servers) {
    return 0
  }

  let count = 0
  for (const server of servers.values()) {
    count += server.pool?.checkedOut?.size ?? 0
  }
  return count
}

async function waitForMongoIdle(client, timeoutMs = 200) {
  const deadline = Date.now() + timeoutMs

  do {
    await endActiveSessions(client)
    if (checkedOutConnectionCount(client) === 0) {
      return
    }
    await new Promise((resolve) => setImmediate(resolve))
  } while (Date.now() < deadline)
}

async function createIndexes(db) {
  await db.collection('mongo-locks').createIndex({ id: 1 })

  await db
    .collection(APPLICATION_SUBMISSIONS_COLLECTION)
    .createIndex({ applicationId: 1 }, { unique: true })
}
