import Ajv from "ajv"
import addFormats from "ajv-formats"
import type { LintResult } from "."

export interface Spec {
    openapi?: string
    swagger?: string
    asyncapi?: string
}

type SchemaType = "openapi" | "asyncapi"

export interface SchemaWrapper {
    ok: boolean
    type: SchemaType
    version: string
    schema: any
    error: string
}

export class JsonSchemaLinter {
    private ajv;
    private ajv4;
    private schemas: Map<string, SchemaWrapper> = new Map()

    constructor() {
        this.ajv = addFormats(new Ajv({ allErrors: true, strict: false }))
        const Ajv4 = require("ajv-draft-04")
        this.ajv4 = addFormats(new Ajv4({ allErrors: true, strict: false }))

        this.loadSchemaFromUrl("openapi", "2.0", "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/schemas/v2.0/schema.json")
        this.loadSchemaFromUrl("openapi", "3.0", "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/schemas/v3.0/schema.json")
        this.loadSchemaFromUrl("openapi", "3.1", "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/schemas/v3.1/schema.json")
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

    public async downloadSchema(type: SchemaType, version: string, url: string): Promise<SchemaWrapper> {
        const res = await fetch(url)
        if (res.status !== 200) {
            return {
                ok: false,
                type: type,
                version: version,
                schema: null,
                error: `Failed to download schema ${type} ${version} from ${url}`

            }
        }
        return {
            ok: true,
            type: type,
            version: version,
            schema: await res.json(),
            error: ""
        }
    }

    public async loadSchemaFromUrl(type: SchemaType, version: string, url: string) {
        const schema = await this.downloadSchema(type, version, url)
        this.schemas.set(`${type}:${version}`, schema)
        if (schema.ok) {
            console.log(`Loaded schema ${type} ${version}`)
        } else {
            console.log(`Failed to load schema ${type} ${version}: ${schema.error}`)
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
        let schema = null;
        let ajv = this.ajv
        if (spec.openapi || spec.swagger) {
            schema = this.findSchema("openapi", spec.openapi ?? spec.swagger!)
            ajv = this.ajv4

        } else if (spec.asyncapi) {
            schema = this.findSchema("asyncapi", spec.asyncapi)
        }

        if (schema) {
            console.log(`Linting ${schema.type} ${schema.version} `)
            const validate = ajv.compile(schema.schema)
            const valid = validate(spec)
            if (valid) {
                return { valid: true, instance: "schema", violations: [], infos: 0, warnings: 0, errors: 0 }
            }
            return {
                valid: false, instance: "schema", violations: validate.errors!.map((error) => {
                    return {
                        severity: "error",
                        code: error.keyword,
                        message: error.message ?? "Unknown error",
                        location: {
                            path: error.instancePath,
                        },
                        schemaLocation: error.schemaPath
                    }
                }),
                infos: 0,
                warnings: 0,
                errors: validate.errors!.length
            }

        } else {
            console.log("No schema found")
        }
        return {
            valid: false, instance: "schema", violations: [{ severity: "error", message: "No schema found" }],
            infos: 0,
            warnings: 0,
            errors: 1
        }
    }
}