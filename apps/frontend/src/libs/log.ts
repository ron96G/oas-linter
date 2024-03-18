export type LEVEL = 'debug' | 'info' | 'warn' | 'error'

export const LEVEL = [
    'debug',
    'info',
    'warn',
    'error'
]

let ACTIVE_LOG_LEVEL: LEVEL = 'info'

export function getLogLevel() {
    return ACTIVE_LOG_LEVEL;
}

export function setLogLevel(logLevel: LEVEL) {
    if (LEVEL.includes(logLevel)) {
        ACTIVE_LOG_LEVEL = logLevel
    }
}

/**
 * Log the message only if the log level allows it
 * @param level 
 * @param msg 
 */
function log(level: LEVEL, msg?: any) {
    if (LEVEL.indexOf(level) >= LEVEL.indexOf(ACTIVE_LOG_LEVEL)) {
        console.log(`${level}: ${msg}`);
    }
}

export function debug(msg?: any) {
    log('debug', msg)
}
export function info(msg?: any) {
    log('info', msg)
}
export function warn(msg?: any) {
    log('warn', msg)
}
export function error(msg?: any) {
    log('error', msg)
}