import { Elysia } from 'elysia'

const parseMatchHeader = (header: string = '') => {
    return header.split(', ') ?? []
}

export const etag = () => {
    return new Elysia({
        name: 'etag',
    })

        .derive((ctx) => {
            let matchEtagValues: string[]
            let noneMatchEtagValues: string[]

            return {
                setETag: (etag: string) => {
                    ctx.set.headers['Cache-Control'] = 'public, max-age=0'
                    ctx.set.headers['etag'] = etag
                },
                getETag: () => {
                    return ctx.set.headers['etag']
                },
                isMatch(etag: string) {
                    if (!matchEtagValues) {
                        matchEtagValues = parseMatchHeader(
                            ctx.headers['if-match']
                        )
                    }

                    return (
                        matchEtagValues.includes(etag) ||
                        matchEtagValues.includes('*')
                    )
                },
                isNoneMatch(etag: string) {
                    if (!noneMatchEtagValues) {
                        noneMatchEtagValues = parseMatchHeader(
                            ctx.headers['if-none-match']
                        )
                    }

                    return (
                        noneMatchEtagValues.includes(etag) ||
                        noneMatchEtagValues.includes('*')
                    )
                },
                setVary(headers: string | string[]) {
                    ctx.set.headers['vary'] =
                        typeof headers === 'string'
                            ? headers
                            : headers.join(', ')
                },
            }
        })

        .onAfterHandle((ctx) => {
            const etag = ctx.getETag()
            if (etag) {
                if (ctx.isNoneMatch(etag)) {
                    switch (ctx.request.method) {
                        case 'GET':
                        case 'HEAD':
                            ctx.set.status = 304
                            break
                        default:
                            ctx.set.status = 412
                            break
                    }

                    ctx.response = null
                }
            }
        })
}
