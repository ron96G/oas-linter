import Ajv from "ajv"
import addFormats from "ajv-formats"
import type { LintResult } from "./common"

const OPENAPI_VERSIONS = ["2.0", "3.0", "3.1"]
const ASYNCAPI_VERSIONS = ["2.6.0"]


export interface Spec {
    openapi?: string
    swagger?: string
    asyncapi?: string
}

type SchemaType = "openapi" | "asyncapi"

export interface Schema {
    type: SchemaType
    version: string
    schema: any
}

export class JsonSchemaLinter {
    private ajv;
    private ajv4;
    private schemas: Array<Schema> = []

    constructor() {
        this.schemas = []
        this.ajv = addFormats(new Ajv({ allErrors: true, strict: false }))
        const Ajv4 = require("ajv-draft-04")
        this.ajv4 = addFormats(new Ajv4({ allErrors: true, strict: false }))

        // this.loadSchemaFromUrl("openapi", "3.0", "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/schemas/v3.0/schema.json")
        // this.loadSchemaFromUrl("openapi", "3.1", "https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/schemas/v3.1/schema.json")

    }

    public getSchemas() {
        return this.schemas
    }

    public loadSchema(type: SchemaType, version: string, schema: any) {
        this.schemas.push({ type, version, schema })
    }

    public async loadSchemaFromUrl(type: SchemaType, version: string, url: string) {
        const res = await fetch(url)
        this.loadSchema(type, version, await res.json())
        console.log(`Loaded schema ${type} ${version} from ${url}`)
    }

    public findSchema(type: SchemaType, version: string) {
        console.log(`Finding schema ${type} ${version}`)
        return this.schemas.find((schema) => schema.type === type && version.startsWith(schema.version))
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
            console.log(`Linting ${schema.type} ${schema.version}`)
            const validate = ajv.compile(schema.schema)
            const valid = validate(spec)
            if (valid) {
                return { valid: true, instance: "schema", violations: [] }
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
                })
            }

        } else {
            console.log("No schema found")
        }
        return {
            valid: false, instance: "schema", violations: [{ severity: "error", message: "No schema found" }]
        }
    }
}