import * as log from "./log"

export interface FileRef {
    name: string
    href?: string
    value?: string
}

export interface Item extends FileRef {
    type?: string
    version?: string
}

export interface Index {
    rules: {
        [key: string]: FileRef
    },
    schemas: {
        [key: string]: FileRef
    }
}

export interface Storage {
    loadIndex(): Promise<Storage>
    getRuleset(key: string): Item
    getSchema(type: string, version: string): Item
    set(key: string, value: Item): void
    save(): void

    iterateRulesets(): Generator<Item>
    iterateSchemas(): Generator<Item>

    getAllRulesets(): Map<string, Item>
    getAllSchemas(): Map<string, Item>
}

abstract class AbstractStorage implements Storage {

    protected jsonSchemas: Map<string, Item> = new Map()
    protected rulesets: Map<string, Item> = new Map()

    abstract loadIndex(): Promise<Storage>

    getAllRulesets(): Map<string, Item> {
        return this.rulesets
    }
    getAllSchemas(): Map<string, Item> {
        return this.jsonSchemas
    }

    getRuleset(key: string): Item {
        if (!this.rulesets.has(key)) {
            throw Error("No ruleset found")
        }
        return this.rulesets.get(key)!
    }

    getSchema(type: string, version: string): Item {
        const key = type + ":" + version
        if (!this.jsonSchemas.has(key)) {
            throw Error("No schema found")
        }
        return this.jsonSchemas.get(key)!
    }

    set(key: string, value: Item): void {
        log.warn("Setting not implemented")
        return;
    }

    save(): void {
        return;
    }

    *iterateRulesets() {
        for (const item of this.rulesets.values()) {
            yield item
        }
    }

    *iterateSchemas() {
        for (const item of this.jsonSchemas.values()) {
            yield item
        }
    }

}

export class BackendStorage extends AbstractStorage {

    static BACKEND_HOST = "" // Set to the backend host, e.g. http://localhost:3000
    static BASE_PATH = BackendStorage.BACKEND_HOST + "/api/v1/config"
    static RULESETS_INDEX_PATH = this.BASE_PATH + "/rulesets/"
    static JSON_SCHEMAS_INDEX_PATH = this.BASE_PATH + "/schemas/"

    static async isUp(): Promise<boolean> {
        try {
            const res = await fetch(this.RULESETS_INDEX_PATH)
            return res.status === 200
        } catch (e) {
            return false
        }
    }

    async loadIndex(): Promise<BackendStorage> {
        const rulesetIndexRes = await fetch(BackendStorage.RULESETS_INDEX_PATH)
        log.info("Loading rulesets")
        if (rulesetIndexRes.status === 200) {
            const availableRulesets: Array<string> = await rulesetIndexRes.json()
            for (const rulesetId of availableRulesets) {
                log.info("Loading ruleset: " + rulesetId)
                this.rulesets.set(rulesetId, await this.fetchRuleset(rulesetId))
            }
        }

        const schemaIndexRes = await fetch(BackendStorage.JSON_SCHEMAS_INDEX_PATH)
        log.info("Loading schemas")
        if (schemaIndexRes.status === 200) {
            const availableSchemas: Array<string> = await schemaIndexRes.json()
            for (const schemaId of availableSchemas) {
                log.info("Loading schema: " + schemaId)
                const [type, version] = schemaId.split(":")
                this.jsonSchemas.set(schemaId, await this.fetchSchema(type, version))
            }

        }
        return this
    }

    private async fetchSchema(schemaType: string, schemaVersion: string): Promise<Item> {
        const href = BackendStorage.JSON_SCHEMAS_INDEX_PATH + schemaType + "/" + schemaVersion
        const res = await fetch(href)
        if (res.status === 200) {
            const body = await res.json()
            return {
                name: schemaType + ":" + schemaVersion,
                value: JSON.stringify(body.schema),
                href: href,
                type: schemaType,
                version: schemaVersion
            }
        }
        throw Error("No schema found")
    }

    private async fetchRuleset(rulesetId: string) {
        const href = BackendStorage.RULESETS_INDEX_PATH + rulesetId
        const res = await fetch(href)
        if (res.status === 200) {
            const body = await res.json()

            return {
                name: rulesetId,
                value: body.raw,
                href: href
            }
        }
        throw Error("No ruleset found")
    }
}

export class LocalStorage extends AbstractStorage {

    async loadIndex(): Promise<Storage> {
        const rawRulesets = localStorage.getItem("rulesets")
        log.info("Loading rulesets from local storage")
        if (rawRulesets && rawRulesets !== "{}") {
            log.debug(rawRulesets)
            this.rulesets = new Map(JSON.parse(rawRulesets))
        }

        const rawJsonSchemas = localStorage.getItem("jsonSchemas")
        log.info("Loading schemas from local storage")
        if (rawJsonSchemas && rawJsonSchemas !== "{}") {
            log.debug(rawJsonSchemas)
            this.jsonSchemas = new Map(JSON.parse(rawJsonSchemas))
        }
        return this
    }

    set(key: string, value: Item): void {
        log.info("Setting " + key + " in local storage")
        this.rulesets.set(key, value)
    }

    save(): void {
        log.info(this.rulesets.entries())
        localStorage.setItem("rulesets", JSON.stringify(Array.from(this.rulesets.entries())))

        log.info(this.jsonSchemas.entries())
        localStorage.setItem("jsonSchemas", JSON.stringify(Array.from(this.jsonSchemas.entries())))
        log.info("Saved to local storage")
    }

}

export class StaticStorage extends AbstractStorage {
    JSON_SCHEMA_INDEX_PATH = "/schemas/index.json"
    RULESETS_INDEX_PATH = "/rulesets/index.json"

    async loadIndex(): Promise<Storage> {
        try {

            await Promise.all([this.loadSchemas(), this.loadRulesets()])

        } catch (e) {
            log.error("Failed to load index: " + e)
        }


        return this
    }

    async loadSchemas() {
        const res = await fetch(this.JSON_SCHEMA_INDEX_PATH)
        const all: Array<Promise<Item>> = []
        if (res.status === 200) {
            const index: Index = await res.json()
            for (const key in index.schemas) {
                try {
                    const schema = index.schemas[key]
                    log.info("Loading schema: " + schema.name)
                    all.push(this.loadFileRef(schema))
                } catch (e) {
                    log.error("Failed to load schema: " + e)
                }
            }
        } else {
            log.error("Failed to fetch schema index")
        }
        return Promise.all(all).then((items) => {
            for (const item of items) {
                this.jsonSchemas.set(item.name, item)
            }
        })
    }
    async loadRulesets() {
        const rulesetIndexRes = await fetch(this.RULESETS_INDEX_PATH)
        const all: Array<Promise<Item>> = []
        if (rulesetIndexRes.status === 200) {
            const index: Index = await rulesetIndexRes.json()
            for (const key in index.rules) {
                try {

                    const rule = index.rules[key]
                    log.info("Loading ruleset: " + rule.name)
                    all.push(this.loadFileRef(rule))
                } catch (e) {
                    log.error("Failed to load ruleset: " + e)
                }
            }
        } else {
            log.error("Failed to fetch ruleset index")
        }

        return Promise.all(all).then((items) => {
            for (const item of items) {
                this.rulesets.set(item.name, item)
            }
        })
    }


    async loadFileRef(ref: FileRef): Promise<Item> {
        log.info("Loading file ref: " + ref.name)
        if (ref.href) {
            const res = await fetch(ref.href)
            if (res.status === 200) {
                if (res.headers.get("content-type") === "application/json") {
                    return {
                        name: ref.name,
                        value: await res.text(),
                        href: ref.href,
                        type: ref.name.split(":")[0],
                        version: ref.name.split(":")[1]
                    }
                } else {
                    log.error("Invalid content type for file ref: " + ref.href)
                }
            }

        }
        return {
            name: ref.name,
            value: ref.value,
            href: ref.href,
            type: ref.name.split(":")[0],
            version: ref.name.split(":")[1]
        }
    }
}

export class WrappedStore extends AbstractStorage {

    store: Array<Storage> = []

    constructor(stores: Array<Storage>) {
        super();
        this.store = stores
    }

    async loadIndex(): Promise<Storage> {
        for (const store of this.store) {
            await store.loadIndex()

            for (const item of store.iterateRulesets()) {
                log.info("Adding ruleset: " + item.name)
                this.rulesets.set(item.name, item)
            }
            log.info(`Loaded ${this.rulesets.size} rulesets from store ${store.constructor.name}`)

            for (const item of store.iterateSchemas()) {
                log.info("Adding schema: " + item.name)
                this.jsonSchemas.set(item.name, item)
            }
            log.info(`Loaded ${this.jsonSchemas.size} schemas from store ${store.constructor.name}`)
        }
        return this
    }

    getRuleset(key: string): Item {
        for (const store of this.store) {
            try {
                return store.getRuleset(key)
            } catch (e) {
                continue
            }
        }
        throw Error("No ruleset found")
    }

    getSchema(type: string, version: string): Item {
        for (const store of this.store) {
            try {
                return store.getSchema(type, version)
            } catch (e) {
                continue
            }
        }
        throw Error("No schema found")
    }

    set(key: string, value: Item): void {
        for (const store of this.store) {
            store.set(key, value)
        }
    }

    save(): void {
        for (const store of this.store) {
            store.save()
        }
    }
}


export async function createStorage(): Promise<Storage> {
    if (await BackendStorage.isUp()) {
        log.info("Using backend storage")
        return new BackendStorage().loadIndex()
    }
    log.info("Using static and local storage")
    return new WrappedStore([new StaticStorage(), new LocalStorage()]).loadIndex()
}