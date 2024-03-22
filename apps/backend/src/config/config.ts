import * as fs from 'fs'
import jp from 'jsonpath'
import * as YAML from 'yaml'

export class Config {
    private readonly config: Record<string, any> = {}

    constructor() {
        const nodeEnv = process.env.NODE_ENV || 'development'
        this.set('NODE_ENV', nodeEnv)

        this.fromEnv()
        this.fromYaml(`config/${nodeEnv}.yaml`)
    }

    fromEnv() {
        for (const key in process.env) {
            this.set(Config.envKeyToKey(key), process.env[key])
        }
    }

    fromYaml(path: string) {
        const data = fs.readFileSync(path, 'utf8')
        const obj = YAML.parse(this.replaceEnvVars(data))
        for (const key in obj) {
            this.set(key, obj[key])
        }
    }

    private static keyToEnvKey(key: string) {
        return key.replace(/\./g, '_').toUpperCase()
    }

    private static envKeyToKey(envKey: string) {
        return envKey.replace(/_/g, '.').toLowerCase()
    }

    private static convertKey(key: string) {
        if (key[0].toUpperCase() === key[0]) {
            return Config.envKeyToKey(key)
        }
        return Config.keyToEnvKey(key)
    }

    get<T = string>(key: string, fallback = true): T | undefined {
        const val = jp.query(this.config, key)
        if (val === undefined && fallback) {
            return this.get(Config.convertKey(key), false)
        }
        if (val.length === 1) {
            return val[0] as T
        }
        return val as T
    }

    set(key: string, value: any) {
        this.config[key] = value
    }

    private replaceEnvVars(str: string): string {
        return str.replace(/\${(\w+)(:[^}]+)?}/g, (_, key, defValue) => {
            const val = process.env[key] || defValue?.slice(1)
            if (val === undefined) {
                throw new Error(`Environment variable ${key} not found`)
            }
            return val
        })
    }
}

export default new Config()
