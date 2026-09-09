describe('#swagger', () => {
  let server

  beforeAll(async () => {
    const { createServer } = await import('#/server.js')

    server = await createServer()
    await server.initialize()
    await server.db
      .collection('mongo-locks')
      .createIndex({ action: 1 }, { unique: true })
  })

  afterAll(async () => {
    await server.stop({ timeout: 1000 })
  })

  test('Should serve Redoc documentation page', async () => {
    const { statusCode, headers, payload } = await server.inject({
      method: 'GET',
      url: '/documentation'
    })

    expect(statusCode).toBe(200)
    expect(headers['content-type']).toContain('text/html')
    expect(payload).toContain('redoc')
    expect(payload).toContain('/swagger.json')
    expect(payload).toContain(
      'Marine Licensing Public Register API Documentation'
    )
  })

  test('Should serve OpenAPI spec for the application submissions endpoint', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/swagger.json'
    })

    expect(statusCode).toBe(200)
    expect(result.info.title).toBe(
      'Marine Licensing Public Register API Documentation'
    )
    expect(result.info.version).toBe('1.0.0')
    expect(result.info.description).toBe(
      'API documentation for the Marine Licensing Public Register'
    )
    expect(result.paths['/application-submissions'].get).toEqual(
      expect.objectContaining({
        summary: 'List published application submissions',
        tags: expect.arrayContaining(['application-submissions'])
      })
    )
    expect(result.paths['/example']).toBeUndefined()
    expect(result.paths['/example/{exampleId}']).toBeUndefined()
  })
})
