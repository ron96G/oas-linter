import { Document, Ruleset, Spectral, type RulesetDefinition } from "@stoplight/spectral-core";
import { Json as JsonParser, Yaml as YamlParser, type IParser } from "@stoplight/spectral-parsers";
import type { IO } from "@stoplight/spectral-ruleset-bundler";
import { bundleAndLoadRuleset } from "@stoplight/spectral-ruleset-bundler/with-loader";
import * as Rulesets from '@stoplight/spectral-rulesets';
import type { LintResult } from "./common";
import { determineInputType, formatResult } from "./util";
export interface RuleRef {
    name: string
    href?: string
    value?: string
}

interface RulesetDefinitionWrapper {
    ok: boolean
    ruleset: Ruleset | RulesetDefinition | null
    hash: string | null
    raw: string | null
    error?: string
}

export class Linter {

    private readonly rulesets = new Map<string, RulesetDefinitionWrapper>();
    private readonly hasher = new Bun.CryptoHasher("sha256")

    constructor() {
        const raw = "{\n\"extends\": \"spectral:oas\",\n\"rules\": {}\n}";
        this.rulesets.set("spectral:oas", {
            ok: true,
            ruleset: new Ruleset(Rulesets.oas),
            raw: raw,
            hash: this.hasher.update(raw).digest("hex"),
            error: ""
        })
    }

    isOk() {
        for (const item of this.rulesets.values()) {
            if (!item.ok) {
                return false
            }
        }
        return true
    }

    getSupportedRulesets() {
        return Array.from(this.rulesets.keys()).sort()
    }

    getRulesets() {
        return Array.from(this.rulesets.values())
    }

    hasRuleset(name: string) {
        return this.rulesets.has(name)
    }

    getRuleset(name: string) {
        if (!this.rulesets.has(name)) {
            throw Error(`No ruleset called '${name}' exists.`)
        }
        const ruleset = this.rulesets.get(name)!
        if (!ruleset.ok) {
            throw Error(ruleset.error)
        }
        return ruleset
    }

    private setRuleset(name: string, ruleset: Ruleset | RulesetDefinition, raw?: string, error?: string) {
        this.rulesets.set(name, {
            ok: true,
            ruleset: ruleset,
            hash: raw ? this.hasher.update(raw).digest("hex") : null,
            raw: raw || null,
            error: error
        })
    }

    public addRuleset(name: string, ruleset: Ruleset | RulesetDefinition) {
        this.rulesets.set(name, {
            ok: true,
            ruleset: ruleset,
            raw: null,
            hash: null,
            error: ""
        })
    }

    public async addRulesetFromURL(name: string, url: string, refreshInterval?: number) {
        let rawBody: string;
        const resolveFetch = async (uri: string, opts?: RequestInit) => {
            const match = uri.match(/(https?):\/\/(.+):(.+)@(.*)/)!
            const scheme = match[1]
            const username = match[2]
            const password = match[3]
            const uriWithoutCredentials = match[4]
            const finalUri = `${scheme}://${uriWithoutCredentials}`

            const res = await fetch(finalUri, {
                headers: {
                    "Authorization": "Basic " + Buffer.from(username + ":" + password).toString('base64')
                }
            })

            if (res.status !== 200) {
                rawBody = await res.text()
                throw new Error(`Failed to fetch ${uri}: ${res.status}`)
            } else {
                rawBody = await res.text()
                return rawBody
            }
        }

        const io: IO = {
            fetch: resolveFetch,
            fs: {
                promises: {
                    async readFile(path: any): Promise<any> {
                        return await resolveFetch(url)
                    }
                }
            }
        }

        const filename = url.split('/').pop()!

        const refresh = async () => {
            try {
                console.log(`Refreshing ruleset ${filename}`)
                this.setRuleset(name, await bundleAndLoadRuleset(filename, io), rawBody)
            } catch (e) {
                console.error(`Failed to refresh ruleset ${filename}:`, e)
                const cur = this.rulesets.get(name)
                this.rulesets.set(name, {
                    ok: false,
                    ruleset: cur?.ruleset || null,
                    raw: cur?.raw || null,
                    hash: cur?.hash || null,
                    error: (e as Error).message
                })
            }
        }
        await refresh()

        if (refreshInterval) {
            setInterval(refresh, refreshInterval * 1000)
        }
    }

    async lint(document: Document, ruleset: Ruleset | RulesetDefinition): Promise<LintResult> {
        const spectral = new Spectral();
        try {
            spectral.setRuleset(ruleset)
        } catch (e) {
            throw e
        }
        const result = await spectral.run(document)
        return formatResult(result)
    }


    async lintRaw(input: string, rulesetName: string): Promise<LintResult> {
        const inputType = determineInputType(input)
        const parser: IParser<any> = (inputType === "json") ? JsonParser : YamlParser;
        const document = new Document(input, parser, "openapi." + inputType);

        if (!this.rulesets.has(rulesetName)) {
            return {
                valid: false,
                instance: "spectral",
                violations: [{ severity: "error", message: `No ruleset called '${rulesetName}' exists.` }],
                infos: 0,
                warnings: 0,
                errors: 1
            }
        }
        const ruleset = this.rulesets.get(rulesetName)!;
        if (ruleset.ok) {
            return this.lint(document, ruleset.ruleset!)
        } else {
            return {
                valid: false,
                instance: "spectral",
                violations: [{ severity: "error", message: ruleset.error! }],
                infos: 0,
                warnings: 0,
                errors: 1
            }
        }

    }
}
