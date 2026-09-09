import {
  APPLICATION_SUBMISSIONS_COLLECTION,
  upsertApplicationSubmission
} from './application-submissions.js'

describe('#upsertApplicationSubmission', () => {
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

  const record = {
    applicationType: 'exemption',
    eventType: 'submitted',
    applicationId: '64f1abc',
    applicationReference: 'EXE/2026/00012'
  }

  test('Should insert a new application submission', async () => {
    await upsertApplicationSubmission(server.db, record)

    const stored = await server.db
      .collection(APPLICATION_SUBMISSIONS_COLLECTION)
      .find({ applicationId: record.applicationId }, { projection: { _id: 0 } })
      .toArray()

    expect(stored).toHaveLength(1)
    expect(stored[0]).toEqual(
      expect.objectContaining({
        applicationType: 'exemption',
        eventType: 'submitted',
        applicationId: '64f1abc',
        applicationReference: 'EXE/2026/00012'
      })
    )
    expect(stored[0].createdAt).toBeInstanceOf(Date)
    expect(stored[0].updatedAt).toBeInstanceOf(Date)
  })

  test('Should upsert by applicationId and not create a duplicate', async () => {
    await upsertApplicationSubmission(server.db, record)

    const [original] = await server.db
      .collection(APPLICATION_SUBMISSIONS_COLLECTION)
      .find({ applicationId: record.applicationId })
      .toArray()

    await upsertApplicationSubmission(server.db, {
      ...record,
      applicationReference: 'EXE/2026/00099'
    })

    const stored = await server.db
      .collection(APPLICATION_SUBMISSIONS_COLLECTION)
      .find({ applicationId: record.applicationId })
      .toArray()

    expect(stored).toHaveLength(1)
    expect(stored[0].applicationReference).toBe('EXE/2026/00099')
    expect(stored[0].createdAt).toEqual(original.createdAt)
  })

  test('Should store list fields when provided', async () => {
    await upsertApplicationSubmission(server.db, {
      ...record,
      projectName: 'South coast sea samples',
      marinePlanAreas: ['South'],
      dateSubmitted: '2026-03-18T10:00:00.000Z',
      status: 'Active'
    })

    const stored = await server.db
      .collection(APPLICATION_SUBMISSIONS_COLLECTION)
      .findOne(
        { applicationId: record.applicationId },
        { projection: { _id: 0 } }
      )

    expect(stored).toEqual(
      expect.objectContaining({
        projectName: 'South coast sea samples',
        marinePlanAreas: ['South'],
        dateSubmitted: '2026-03-18T10:00:00.000Z',
        status: 'Active'
      })
    )
  })

  test('Should update status on a later withdrawn event without creating a duplicate', async () => {
    await upsertApplicationSubmission(server.db, {
      ...record,
      projectName: 'South coast sea samples',
      marinePlanAreas: ['South'],
      dateSubmitted: '2026-03-18T10:00:00.000Z',
      status: 'Active'
    })

    await upsertApplicationSubmission(server.db, {
      ...record,
      eventType: 'withdrawn',
      status: 'Withdrawn'
    })

    const stored = await server.db
      .collection(APPLICATION_SUBMISSIONS_COLLECTION)
      .find({ applicationId: record.applicationId })
      .toArray()

    expect(stored).toHaveLength(1)
    expect(stored[0].status).toBe('Withdrawn')
    expect(stored[0].projectName).toBe('South coast sea samples')
  })
})
