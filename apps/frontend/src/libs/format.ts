import YAML from 'js-yaml';

import { determineInputType } from "@/libs/linter"

export function formatInput(input: string) {
    try {
        if (determineInputType(input) == 'json') {
            return JSON.stringify(JSON.parse(input), null, 2)
        } else {
            return YAML.dump(YAML.load(input), { indent: 2 })
        }
    } catch (e) {
        throw e
    }
}

export function convertInput(input: string) {
    try {
        if (determineInputType(input) == 'json') {
            return YAML.dump(JSON.parse(input))
        } else {
            return JSON.stringify(YAML.load(input), null, 2)
        }

    } catch (e) {
        throw e
    }
}

