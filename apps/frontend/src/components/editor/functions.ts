import * as monaco from 'monaco-editor';

import { SchemaItem } from "@/libs/json-schema";
import * as log from '@/libs/log';

export const FILE_PREFIX = "inmemory://inmemory/";

let currentSchemas: Array<SchemaItem> = []
let monacoYaml: any = null;

export async function configureSchemas(rawSchemas?: Array<SchemaItem>) {
    const deepCopy = JSON.parse(JSON.stringify(rawSchemas));
    const schemas = buildJsonSchemas(deepCopy)
    schemas.forEach(s => log.debug(JSON.stringify(s)))

    // make sure schemas are not duplicated
    const newSchemas = schemas.filter(s => !currentSchemas.some(cs => cs.uri === s.uri))
    log.info("New schemas: " + newSchemas.map(s => s.uri).join(", "))
    if (newSchemas.length === 0) {
        return
    }
    currentSchemas = currentSchemas.concat(newSchemas)

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        enableSchemaRequest: true,
        schemas: newSchemas,
    });

    // lazy load monaco-yaml
    if (!monacoYaml) {
        log.info("Loading monaco-yaml")
        monacoYaml = await import("monaco-yaml")
    }

    monacoYaml.configureMonacoYaml(monaco, {
        enableSchemaRequest: true,
        validate: true,
        schemas: newSchemas
    })
}


export function buildJsonSchemas(rawSchemas?: Array<SchemaItem>) {
    if (!rawSchemas) {
        return []
    }
    return rawSchemas.map(schema => {
        if (schema.fileMatch) {
            schema.schema = JSON.parse(schema.schema)
            schema.fileMatch = schema.fileMatch.map(f => monaco.Uri.parse(FILE_PREFIX + f).toString())
            log.info(`Adding schema ${schema.uri} with fileMatch ${schema.fileMatch}`)
        }
        return schema
    })
}

export function calculateMonacoFilename(line: string, defValue: string): string {
    if (!line || !line.includes(":")) {
        return defValue
    }
    const [type, version] = line.split(":")
    log.info(`Type: ${type}, Version: ${version}`)
    if (type !== undefined && version !== undefined) {
        return monaco.Uri.parse(FILE_PREFIX + `${type.trim()}.v${version.trim()}`).toString()
    }
    return defValue
}