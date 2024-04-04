import pino from 'pino'

export const newLogger = (name: string, logLevel: string) => {
    return pino({
        name,
        safe: true,
        timestamp: pino.stdTimeFunctions.isoTime,
        level: logLevel,
        formatters: {
            level: (label) => {
                return { level: label }
            },
        },
    })
}

export const logger = newLogger('access-log', process.env.LOG_LEVEL ?? 'info')
