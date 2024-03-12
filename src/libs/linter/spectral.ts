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

export class Linter {

    private readonly rulesets = new Map<string, Ruleset | RulesetDefinition>();

    constructor() {
        this.setRuleset('oas', new Ruleset(Rulesets.oas));
        this.setRuleset('asyncapi', new Ruleset(Rulesets.asyncapi));
    }

    getSupportedRulesets() {
        return Array.from(this.rulesets.keys())
    }

    getRulesets() {
        return this.rulesets.values()
    }

    getRuleset(name: string) {
        return this.rulesets.get(name)
    }

    private setRuleset(name: string, ruleset: Ruleset) {
        this.rulesets.set(name, ruleset)
    }

    public addRuleset(name: string, ruleset: Ruleset | RulesetDefinition) {
        this.rulesets.set(name, ruleset)
    }

    public async addRulesetFromURL(name: string, url: string, refreshInterval?: number) {
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
                throw new Error(`Failed to fetch ${finalUri}: ${await res.text()}`)
            }
            return res.text()
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
        console.log(`Fetching ruleset ${filename}`)
        this.setRuleset(name, await bundleAndLoadRuleset(filename, io))

        if (refreshInterval) {
            setInterval(async () => {
                console.log(`Refreshing ruleset ${filename}`)
                this.setRuleset(name, await bundleAndLoadRuleset(filename, io))
            }, refreshInterval * 1000)
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


    async lintRaw(input: string, rulesetName: string) {
        const inputType = determineInputType(input)
        const parser: IParser<any> = (inputType === "json") ? JsonParser : YamlParser;
        const document = new Document(input, parser, "openapi." + inputType);

        if (!this.rulesets.has(rulesetName)) {
            throw Error(`No ruleset called '${rulesetName}' exists.`)
        }
        const ruleset = this.rulesets.get(rulesetName)!;
        return this.lint(document, ruleset)
    }
}
