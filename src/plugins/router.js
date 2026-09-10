import { health } from '#/routes/health.js'
import { applicationSubmissions } from '#/routes/application-submissions.js'

export const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([health, ...applicationSubmissions])
    }
  }
}
