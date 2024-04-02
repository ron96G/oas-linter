import { Elysia } from 'elysia'
import { newLogger } from '../../log'

const TRACE_ID_HEADER = 'X-B3-TraceId'

export interface Options {
    level?: string
    traceIdHeader?: string
    ignoredPaths?: RegExp[]
}

export const logger = (options?: Options) => {
    const LOG = newLogger('access-log', options?.level ?? 'info')

    return new Elysia({
        name: 'logger',
    })

        .derive(() => {
            return {
                log: LOG,
                responseTime: 0,
            }
        })

        .onBeforeHandle((ctx) => {
            ctx.log = LOG.child({
                traceId: ctx.headers[options?.traceIdHeader ?? TRACE_ID_HEADER],
            })
            ctx.responseTime = Date.now()
        })

        .onAfterHandle((ctx) => {
            if (
                options?.ignoredPaths?.some((path) =>
                    path.test(ctx.request.url)
                )
            ) {
                return
            }

            ctx.log.warn({
                method: ctx.request.method,
                url: ctx.request.url,
                status: ctx.set.status,
                responseTime: Date.now() - ctx.responseTime,
            })
        })
}
