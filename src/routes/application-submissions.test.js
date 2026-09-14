import {
  APPLICATION_SUBMISSIONS_COLLECTION,
  upsertApplicationSubmission
} from '#/services/application-submissions.js'

describe('GET /application-submissions', () => {
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

  test('Should return an empty list when no submissions exist', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/application-submissions'
    })

    expect(statusCode).toBe(200)
    expect(result).toEqual([])
  })

  test('Should return stored application submissions', async () => {
    await upsertApplicationSubmission(server.db, {
      applicationType: 'exemption',
      eventType: 'submitted',
      applicationId: '64f1abc',
      applicationReference: 'EXE/2026/00012',
      projectName: 'South coast sea samples',
      marinePlanAreas: ['South'],
      dateSubmitted: '2026-03-18T10:00:00.000Z',
      status: 'Active'
    })

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/application-submissions'
    })

    expect(statusCode).toBe(200)
    expect(result).toEqual([
      expect.objectContaining({
        applicationId: '64f1abc',
        applicationType: 'exemption',
        applicationReference: 'EXE/2026/00012',
        projectName: 'South coast sea samples',
        marinePlanAreas: ['South'],
        dateSubmitted: '2026-03-18T10:00:00.000Z',
        status: 'Active'
      })
    ])
  })
})
