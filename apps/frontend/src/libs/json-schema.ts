import * as log from '@/libs/log'
import { Storage } from './storage'

export interface SchemaItem {
    uri: string,
    fileMatch: Array<string>,
    schema: any
}

const currentHost = window.location.origin

export async function loadAllSchemas(store: Storage) {
    log.info("Loading schemas")
    const res: Array<SchemaItem> = []

    for (const item of store.iterateSchemas()) {
        log.info("Adding schema: " + item.name)
        res.push({
            fileMatch: [`${item.type}.v${item.version}`],
            schema: item.value,
            uri: `${currentHost}/schemas/${item.type}/v${item.version}/schema.json`,
        })
    }
    return res
}
