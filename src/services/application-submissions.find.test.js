import {
  APPLICATION_SUBMISSIONS_COLLECTION,
  findAllApplicationSubmissions,
  upsertApplicationSubmission
} from './application-submissions.js'

describe('#findAllApplicationSubmissions', () => {
  let server

  beforeAll(async () => {
    const { createServer } = await import('#/server.js')

    server = await createServer()
    await server.initialize()
    await server.db
      .collection('mongo-locks')
      .createIndex({ action: 1 }, { unique: true })
  })

  beforeEach(async () => {
    await server.db
      .collection(APPLICATION_SUBMISSIONS_COLLECTION)
      .deleteMany({})
  })

  afterAll(async () => {
    await server.stop({ timeout: 1000 })
  })

  test('Should return all stored application submissions', async () => {
    await upsertApplicationSubmission(server.db, {
      applicationType: 'exemption',
      eventType: 'submitted',
      applicationId: '64f1abc',
      applicationReference: 'EXE/2026/00012'
    })
    await upsertApplicationSubmission(server.db, {
      applicationType: 'exemption',
      eventType: 'submitted',
      applicationId: '64f1def',
      applicationReference: 'EXE/2026/00008'
    })

    const submissions = await findAllApplicationSubmissions(server.db)

    expect(submissions).toHaveLength(2)
    expect(submissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          applicationId: '64f1abc',
          applicationReference: 'EXE/2026/00012'
        }),
        expect.objectContaining({
          applicationId: '64f1def',
          applicationReference: 'EXE/2026/00008'
        })
      ])
    )
  })
})
