import YAML from 'js-yaml';

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

export function determineInputType(input: string) {
    if (input[0] == "{") {
        return 'json'
    }
    return 'yaml'
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

export function toObject(input: string) {
    if (determineInputType(input) == 'json') {
        return JSON.parse(input)
    } else {
        return YAML.load(input)
    }
}