import { swagger } from '@elysiajs/swagger'
import { Elysia, t } from 'elysia'

import staticPlugin from '@elysiajs/static'
import config from '../config/config'
import { ID } from '../models/common'
import { ProbesResponse } from '../models/probes'
import { Scan } from '../models/scan'
import { OidcAuth } from './auth/oidc'
import { ProbesControllerImpl, type Decider } from './probes'
import { ScanControllerImpl } from './scan'

import cors from '@elysiajs/cors'
import { existsSync } from 'fs'
const ALLOWED_CONTENT_TYPES = ['application/json', 'application/yaml']

export function setup() {

    const oidcAuth = new OidcAuth(config.get<string>('oidc.issuer')!)

    const apiUrl = config.get<string>('api.url')!
    let editorUrl: string | undefined;
    let editorApiBase = config.get<string>('ui.apiBase') ?? "/"
    if (config.get<boolean>('ui.enabled')) {
        editorUrl = config.get<string>('ui.url')
    } else {
        editorUrl = undefined
    }

    const app = new Elysia({
        name: 'scan-api'
    })

    app.use(cors({
        origin: /.*/,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        preflight: true
    }))

    app.onError(({ code, error }) => {
        console.error(`Error ${code}:`, error)
        return { code, error: error.message }
    })

    if (config.get<boolean>('ui.enabled') && existsSync('public')) {
        app.use(staticPlugin({
            indexHTML: true,
            prefix: '/',
        }))
    }

    app.use(swagger({
        provider: 'swagger-ui',
        autoDarkMode: true,
        path: '/docs',
        swaggerOptions: {
            deepLinking: true,
            displayOperationId: true,
            defaultModelsExpandDepth: 2,
            defaultModelExpandDepth: 2,
            defaultModelRendering: 'model',
            displayRequestDuration: true,
            docExpansion: 'none',
            filter: true,
            showExtensions: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
            showCommonExtensions: true
        },
        documentation: {
            info: {
                title: 'Scan API',
                description: 'API for scanning OpenAPI specs',
                version: '1.0.0'
            },
            servers: [
                {
                    url: apiUrl
                }
            ],
            security: [
                {
                    OAuth2: []
                }
            ],
            components: {
                securitySchemes: {
                    OAuth2: {
                        type: 'oauth2',
                        flows: {
                            clientCredentials: {
                                tokenUrl: `${config.get('oidc.issuer')}/protocol/openid-connect/token`,
                                scopes: {}
                            }
                        }
                    }
                }
            },
            tags: [
                {
                    name: 'scans',
                    description: 'Operations related to scans'
                },
                {
                    name: 'config',
                    description: 'Operations related to configuration'
                },
                {
                    name: 'default',
                    description: 'Some general operations'
                }
            ]
        }
    }))



    // scan routes
    const scanCtl = new ScanControllerImpl()
    const rulesetCfg = config.get<Array<{ name: string, url: string, refreshInterval: number }>>('rulesets')
    if (rulesetCfg) {
        rulesetCfg.forEach(({ name, url, refreshInterval }) => {
            scanCtl.linter.addRulesetFromURL(name, url, refreshInterval)
        })
    }

    app.group('/api/v1', (app) =>

        app // .use(oidcAuth.auth())

            .onBeforeHandle(({ headers, set }) => {
                const contentType = headers['content-type']
                if (contentType && !ALLOWED_CONTENT_TYPES.includes(contentType)) {
                    set.status = 415
                    return {
                        code: "UNSUPPORTED_CONTENT_TYPE",
                        error: `Unsupported content type: ${contentType}`
                    }
                }
            })

            .onParse(async ({ request }, contentType) => {
                if (contentType === 'application/json') {
                    return request.json()
                } else if (contentType === 'application/yaml') {
                    return request.text()
                }
                return request.text()
            })

            .get('/scans/:id', async ({ params: { id }, query: { includeSpec } }) => {
                return scanCtl.getScan(id, Boolean(includeSpec))
            }, {
                params: t.Object({ id: ID }),
                query: t.Object({
                    includeSpec: t.Optional(t.String({ enum: ['true', 'false'] }))
                }),
                response: Scan,
                detail: {
                    summary: 'Get a scan result',
                    description: 'Get a scan result by its ID',
                    tags: ['scans']
                }
            })

            .get('/scans/:id/spec', async ({ params: { id } }) => {
                const scan = await scanCtl.getScan(id, true)
                return scan.spec!
            }, {
                params: t.Object({ id: ID }),
                response: t.String(),
                detail: {
                    summary: 'Get a scan result',
                    description: 'Get a scan result by its ID',
                    tags: ['scans']
                }
            })

            .get('/scans', ({ query: { tags, status } }) => scanCtl.getScans(status, tags?.split(",")), {
                response: t.Array(Scan),
                query: t.Object({
                    tags: t.Optional(t.String()),
                    status: t.Optional(t.String({ enum: ['done', 'failed'] }))
                }),
                detail: {
                    summary: 'List scan results',
                    description: 'List scan results with optional filtering by tags and status',
                    tags: ['scans']
                }
            })

            .use(oidcAuth.auth())
            .post('/scans', async ({ auth, body, query: { tags, ruleset, includeSpec } }) => {
                const splitTags = tags?.split(",")
                splitTags?.push(auth.profile.clientId)

                const scan = scanCtl.scan(body as any, ruleset, splitTags, Boolean(includeSpec))
                if (editorUrl !== undefined) {
                    const _scan = await scan
                    _scan.editor_href = `${editorUrl}?input=${editorApiBase}/api/v1/scans/${_scan.id}/spec&ruleset=${ruleset}&schema=openapi.v3.0`
                    return _scan
                }
                return scan
            }, {
                body: t.Any({ description: 'OpenAPI spec' }),
                response: Scan,
                query: t.Object({
                    tags: t.Optional(t.String()),
                    ruleset: t.Optional(t.String()),
                    includeSpec: t.Optional(t.String({ enum: ['true', 'false'] }))
                }),
                detail: {
                    summary: 'Scan an OpenAPI spec',
                    description: 'Scan an OpenAPI spec and return the scan result',
                    tags: ['scans']
                }
            })

    )

    app.group('/api/v1/config', (app) =>

        app // .use(oidcAuth.auth())

            .get('/rulesets', () => scanCtl.linter.getSupportedRulesets(), {
                response: t.Array(t.String()),
                detail: {
                    summary: 'Get supported rulesets',
                    description: 'Get a list of supported rulesets',
                    tags: ['config']
                }

            })

            .get('/rulesets/:name', ({ params: { name } }) => scanCtl.linter.getRuleset(name), {
                params: t.Object({ name: t.String() }),
                response: t.Object({ ok: t.Boolean(), ruleset: t.Any(), raw: t.Optional(t.Any()), error: t.Optional(t.String()) }),
                detail: {
                    summary: 'Get a ruleset',
                    description: 'Get a ruleset by its name',
                    tags: ['config']
                }

            })

            .get('/schemas', () => scanCtl.schemaLinter.getSupportedSchemas(), {
                response: t.Array(t.String()),
                detail: {
                    summary: 'Get supported json-schemas',
                    description: 'Get a list of supported schema versions for OpenAPI and AsyncAPI schemas',
                    tags: ['config']
                }

            })

            .get('/schemas/:type/:version', ({ params: { type, version } }) => scanCtl.schemaLinter.findSchema(type as any, version),
                {
                    params: t.Object({
                        type: t.String({ enum: ['openapi', 'asyncapi'] }),
                        version: t.String({ enum: ['2.0', '3.0', '3.1', '2.6.0'] })
                    }),
                    response: t.Any(),
                    detail: {
                        summary: 'Get a schema',
                        description: 'Get a schema by its type and version',
                        tags: ['config']
                    }
                })
    )

    // probe routes
    const linterDecider: Decider = {
        name: "linter",
        decide: () => scanCtl.linter.isOk()
    }
    const probesCtl = new ProbesControllerImpl()
        .withReadyDecider(linterDecider)
        .withLiveDecider(linterDecider)
        .withStartupDecider(linterDecider);

    const jsonSchemaDecider: Decider = {
        name: "json-schema",
        decide: () => scanCtl.schemaLinter.isOk()
    }
    probesCtl.withReadyDecider(jsonSchemaDecider)
        .withLiveDecider(jsonSchemaDecider)
        .withStartupDecider(jsonSchemaDecider);

    app.group('/q', (app) =>
        app.get('/health/ready', () => probesCtl.ready(), {
            response: ProbesResponse,
            detail: {
                summary: 'Readiness probe',
                description: 'Check if the service is ready to accept traffic',
                tags: ['default']
            }
        })

            .get('/health/live', () => probesCtl.live(), {
                response: ProbesResponse,
                detail: {
                    summary: 'Liveness probe',
                    description: 'Check if the service is alive',
                    tags: ['default']
                }
            })

            .get('/health/started', () => probesCtl.startup(), {
                response: ProbesResponse,
                detail: {
                    summary: 'Liveness probe',
                    description: 'Check if the service is alive',
                    tags: ['default']
                }
            })
    )




    return app
}