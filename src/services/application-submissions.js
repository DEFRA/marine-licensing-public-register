export const APPLICATION_SUBMISSIONS_COLLECTION = 'application-submissions'

const listProjection = {
  _id: 0,
  applicationId: 1,
  applicationType: 1,
  applicationReference: 1,
  projectName: 1,
  marinePlanAreas: 1,
  dateSubmitted: 1,
  status: 1
}

export async function findAllApplicationSubmissions(db) {
  return db
    .collection(APPLICATION_SUBMISSIONS_COLLECTION)
    .find({}, { projection: listProjection })
    .toArray()
}

const buildStoredFields = (record) => {
  const storedFields = {
    applicationId: record.applicationId,
    applicationType: record.applicationType,
    eventType: record.eventType,
    applicationReference: record.applicationReference
  }

  if (record.projectName) {
    storedFields.projectName = record.projectName
  }

  if (
    Array.isArray(record.marinePlanAreas) &&
    record.marinePlanAreas.length > 0
  ) {
    storedFields.marinePlanAreas = record.marinePlanAreas
  }

  if (record.dateSubmitted) {
    storedFields.dateSubmitted = record.dateSubmitted
  }

  if (record.status) {
    storedFields.status = record.status
  }

  return storedFields
}

export async function upsertApplicationSubmission(db, record) {
  const now = new Date()

  await db.collection(APPLICATION_SUBMISSIONS_COLLECTION).updateOne(
    { applicationId: record.applicationId },
    {
      $set: {
        ...buildStoredFields(record),
        updatedAt: now
      },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  )
}
