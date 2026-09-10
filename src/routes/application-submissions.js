import Joi from 'joi'

import { findAllApplicationSubmissions } from '#/services/application-submissions.js'

const applicationSubmissionSchema = Joi.object({
  applicationId: Joi.string().required(),
  applicationType: Joi.string().required(),
  applicationReference: Joi.string().required(),
  projectName: Joi.string().optional(),
  marinePlanAreas: Joi.array().items(Joi.string()).optional(),
  dateSubmitted: Joi.string().optional(),
  status: Joi.string().optional()
})
  .unknown(true)
  .label('ApplicationSubmission')

export const applicationSubmissions = [
  {
    method: 'GET',
    path: '/application-submissions',
    options: {
      tags: ['api', 'application-submissions'],
      description: 'List published application submissions',
      notes:
        'Returns all application submissions stored in the public register.',
      response: {
        status: {
          200: Joi.array()
            .items(applicationSubmissionSchema)
            .label('ApplicationSubmissionList')
        }
      }
    },
    handler: async (request, h) => {
      const submissions = await findAllApplicationSubmissions(request.db)

      return h.response(submissions)
    }
  }
]
