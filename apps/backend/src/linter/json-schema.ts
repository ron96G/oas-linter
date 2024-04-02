import $RefParser from '@apidevtools/json-schema-ref-parser'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { readFileSync } from 'fs'
import type { LintResult } from '.'
import { logger } from '../log'

export interface Spec {
    openapi?: string
    swagger?: string
    asyncapi?: string
}

export type SchemaType = 'openapi' | 'asyncapi'

export interface SchemaWrapper {
    ok: boolean
    hash?: string
    type: SchemaType
    version: string
    schema: any
    error: string
}

export class JsonSchemaLinter {
    private ajv
    private ajv4
    private readonly hasher = new Bun.CryptoHasher('sha256')
    private schemas: Map<string, SchemaWrapper> = new Map()

    constructor() {
        this.ajv = addFormats(new Ajv({ allErrors: true, strict: false }))
        const Ajv4 = require('ajv-draft-04')
        this.ajv4 = addFormats(new Ajv4({ allErrors: true, strict: false }))
    }

    public isOk(): boolean {
        for (const item of this.schemas.values()) {
            if (!item.ok) {
                return false
            }
        }
        return true
    }

    getSupportedSchemas() {
        return Array.from(this.schemas.keys()).sort()
    }

    public getSchemas(): Array<SchemaWrapper> {
        return Array.from(this.schemas.values())
    }

    public async downloadSchema(
        type: SchemaType,
        version: string,
        url: string
    ): Promise<SchemaWrapper> {
        let schema
        if (url.startsWith('file://')) {
            const content = readFileSync(url.replace('file://', ''))
            schema = JSON.parse(content.toString())
        } else {
            const res = await fetch(url)
            if (res.status !== 200) {
                return {
                    ok: false,
                    type: type,
                    version: version,
                    schema: null,
                    error: `Failed to download schema ${type} ${version} from ${url}`,
                } satisfies SchemaWrapper
            }

            schema = await res.json()
        }

        const bundledSchema = await $RefParser.bundle(schema)
        bundledSchema.id = bundledSchema.id?.replace('http://', 'https://')
        return {
            ok: true,
            type: type,
            hash: this.hasher
                .update(JSON.stringify(bundledSchema))
                .digest('hex'),
            version: version,
            schema: bundledSchema,
            error: '',
        } satisfies SchemaWrapper
    }

    public async addNamedSchemaFromUrl(name: string, url: string) {
        const [type, version] = name.split(':')
        await this.addSchemaFromUrl(type as SchemaType, version, url)
    }

    public async addSchemaFromUrl(
        type: SchemaType,
        version: string,
        url: string
    ) {
        try {
            const schema = await this.downloadSchema(type, version, url)

            this.schemas.set(`${type}:${version}`, schema)
            if (schema.ok) {
                logger.info(`Loaded schema ${type} ${version}`)
            } else {
                logger.info(
                    `Failed to load schema ${type} ${version}: ${schema.error}`
                )
            }
        } catch (error) {
            logger.info(`Failed to load schema ${type} ${version}: ${error}`)
        }
    }

    public findSchema(type: SchemaType, version: string) {
        const key = `${type}:${version}`
        if (!this.schemas.has(key)) {
            throw Error(`No schema found for ${type} ${version} `)
        }
        const schema = this.schemas.get(key)!
        if (!schema.ok) {
            throw Error(schema.error)
        }
        return schema
    }

    public async lint(spec: Spec): Promise<LintResult> {
        let schema = null
        let ajv = this.ajv
        if (spec.openapi || spec.swagger) {
            schema = this.findSchema('openapi', spec.openapi ?? spec.swagger!)
            ajv = this.ajv4
        } else if (spec.asyncapi) {
            schema = this.findSchema('asyncapi', spec.asyncapi)
        }

        if (schema) {
            logger.info(`Linting ${schema.type} ${schema.version} `)
            const validate = ajv.compile(schema.schema)
            const valid = validate(spec)
            if (valid) {
                return {
                    valid: true,
                    instance: 'schema',
                    violations: [],
                    infos: 0,
                    warnings: 0,
                    errors: 0,
                }
            }
            return {
                valid: false,
                instance: 'schema',
                violations: validate.errors!.map((error) => {
                    return {
                        severity: 'error',
                        code: error.keyword,
                        message: error.message ?? 'Unknown error',
                        location: {
                            path: error.instancePath,
                            end: {
                                line: 0,
                                column: 0,
                            },
                            start: {
                                line: 0,
                                column: 0,
                            },
                        },
                    }
                }),
                infos: 0,
                warnings: 0,
                errors: validate.errors!.length,
            } satisfies LintResult
        } else {
            logger.info('No schema found')
        }
        return {
            valid: false,
            instance: 'schema',
            violations: [
                {
                    severity: 'error',
                    message: 'No schema found',
                    code: 'unknown',
                    location: {
                        path: '',
                        start: { line: 0, column: 0 },
                        end: { line: 0, column: 0 },
                    },
                },
            ],
            infos: 0,
            warnings: 0,
            errors: 1,
        } satisfies LintResult
    }
}
