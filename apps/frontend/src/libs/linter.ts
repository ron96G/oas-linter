import { Document, Ruleset, Spectral, type ISpectralDiagnostic, type RulesetDefinition } from "@stoplight/spectral-core";
import { Json as JsonParser, Yaml as YamlParser, type IParser } from "@stoplight/spectral-parsers";
import { bundleAndLoadRuleset } from "@stoplight/spectral-ruleset-bundler/with-loader";
import * as Rulesets from '@stoplight/spectral-rulesets';

import { Storage } from "@/libs/storage";
import * as log from "./log";

export interface RuleRef {
    name: string
    href?: string
    value?: string
}

export interface ResultItem {
    severity: 'information' | 'warning' | 'error'
    code: string | number,
    message: string
    start: {
        line: number,
        column: number
    }
    end: {
        line: number,
        column: number
    }
}

export class Linter {

    private readonly rulesets = new Map<string, Ruleset | RulesetDefinition>();

    constructor() {
        this.setRuleset('oas', new Ruleset(Rulesets.oas));
        // this.setRuleset('asyncapi', new Ruleset(Rulesets.asyncapi));
    }

    get supportedRulesets() {
        return Array.from(this.rulesets.keys())
    }

    private setRuleset(name: string, ruleset: Ruleset) {
        this.rulesets.set(name, ruleset)
    }

    async addRuleset(name: string, value: string) {
        const fs = {
            promises: {
                async readFile(path: any): Promise<any> {
                    if (path === ".spectral.yaml") {
                        return value
                    }
                },
            },
        };

        this.setRuleset(name, await bundleAndLoadRuleset(".spectral.yaml", { fs, fetch }))
    }

    async addRulesetFromURL(name: string, href: string) {
        const fs = {
            promises: {
                async readFile(path: any): Promise<any> {
                    if (path.startsWith("rules")) {
                        const res = await fetch(path)
                        if (res.status === 200) {
                            return res.text()
                        }
                        throw new Error(`Rule '${path}' not found`)
                    }

                },
            },
        };

        this.setRuleset(name, await bundleAndLoadRuleset(href, { fs, fetch }))
    }


    async setupFromRef(ref: RuleRef) {
        try {
            log.info('Setting up ruleset: ' + ref.name)
            if (ref['value']) {
                log.debug('Setting up ruleset from value: ' + ref.value)
                await this.addRuleset(ref.name, ref.value)
            } else if (ref['href']) {
                await this.addRulesetFromURL(ref.name, ref.href)
            } else {
                log.error('No value or href found for ruleset: ' + ref.name)
            }
        } catch (e) {
            log.error('Error setting up ruleset: ' + ref.name + ' ' + e)
        }
    }

    async setup(storage: Storage) {
        log.info('Setting up linter')
        for (const ruleRef of storage.iterateRulesets()) {
            log.info('Setting up ruleset: ' + ruleRef.name)
            await this.setupFromRef(ruleRef)
        }
    }

    async lint(document: Document, ruleset: Ruleset | RulesetDefinition) {
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

export function determineInputType(input: string) { // TODO improve this
    if (input[0] == "{") {
        return 'json'
    }
    return 'yaml'
}

function determineSeverity(severity: number, code: string | number): ResultItem['severity'] {
    if (code === "unrecognized-format") {
        return 'error'
    }
    if (severity == 0) {
        return "error"
    } else if (severity == 1) {
        return "warning"
    }
    return "information"
}

function formatResult(inputs: Array<ISpectralDiagnostic>) {
    const results: Array<ResultItem> = []

    for (const input of inputs) {
        results.push({
            message: input.message,
            start: {
                line: input.range.start.line + 1,
                column: input.range.start.character + 1
            },
            end: {
                line: input.range.end.line + 1,
                column: input.range.end.character + 1
            },
            severity: determineSeverity(input.severity, input.code),
            code: input.code
        })
    }

    return results
}
