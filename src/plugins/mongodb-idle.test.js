import {
  checkedOutConnectionCount,
  endActiveSessions,
  waitForMongoIdle
} from './mongodb.js'

describe('mongodb idle helpers', () => {
  describe('#endActiveSessions', () => {
    test('Should no-op when there are no active sessions', async () => {
      await expect(endActiveSessions({})).resolves.toBeUndefined()
      await expect(endActiveSessions({ s: {} })).resolves.toBeUndefined()
      await expect(
        endActiveSessions({ s: { activeSessions: new Set() } })
      ).resolves.toBeUndefined()
    })

    test('Should end each active session', async () => {
      const endSession = vi.fn().mockResolvedValue()
      const sessions = new Set([{ endSession }, { endSession }])

      await endActiveSessions({ s: { activeSessions: sessions } })

      expect(endSession).toHaveBeenCalledTimes(2)
    })

    test('Should ignore sessions that fail to end', async () => {
      const endSession = vi
        .fn()
        .mockRejectedValueOnce(new Error('already ended'))
        .mockResolvedValueOnce()

      await expect(
        endActiveSessions({
          s: {
            activeSessions: new Set([{ endSession }, { endSession }])
          }
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('#checkedOutConnectionCount', () => {
    test('Should return 0 when topology or servers are missing', () => {
      expect(checkedOutConnectionCount({})).toBe(0)
      expect(checkedOutConnectionCount({ topology: {} })).toBe(0)
      expect(checkedOutConnectionCount({ topology: { s: {} } })).toBe(0)
    })

    test('Should sum checked-out connections across servers', () => {
      const servers = new Map([
        ['a', { pool: { checkedOut: new Set([1, 2]) } }],
        ['b', { pool: { checkedOut: new Set([3]) } }],
        ['c', { pool: {} }],
        ['d', {}]
      ])

      expect(checkedOutConnectionCount({ topology: { s: { servers } } })).toBe(
        3
      )
    })
  })

  describe('#waitForMongoIdle', () => {
    test('Should return immediately when nothing is checked out', async () => {
      await expect(waitForMongoIdle({})).resolves.toBeUndefined()
    })

    test('Should wait until checked-out connections drain', async () => {
      const checkedOut = new Set([1])
      const client = {
        s: { activeSessions: new Set() },
        topology: {
          s: {
            servers: new Map([['a', { pool: { checkedOut } }]])
          }
        }
      }

      const wait = waitForMongoIdle(client, 500)
      setTimeout(() => checkedOut.clear(), 20)

      await expect(wait).resolves.toBeUndefined()
      expect(checkedOutConnectionCount(client)).toBe(0)
    })

    test('Should stop waiting when the timeout elapses', async () => {
      const client = {
        s: { activeSessions: new Set() },
        topology: {
          s: {
            servers: new Map([['a', { pool: { checkedOut: new Set([1]) } }]])
          }
        }
      }

      await expect(waitForMongoIdle(client, 30)).resolves.toBeUndefined()
      expect(checkedOutConnectionCount(client)).toBe(1)
    })
  })
})
