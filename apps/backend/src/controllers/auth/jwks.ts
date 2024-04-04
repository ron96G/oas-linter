import { logger } from '@/log'
import { Elysia } from 'elysia'
import * as jose from 'jose'

type JwksFunction = (
    protectedHeader?: jose.JWSHeaderParameters,
    token?: jose.FlattenedJWSInput
) => Promise<jose.KeyLike>

const trustedIssuers: string[] = []
const jwksMap = new Map<string, JwksFunction>()

export const addTrustedIssuer = (issuer: string) => {
    issuer = issuer.trim()
    logger.info('Adding trusted issuer: ' + issuer)
    const jwks = jose.createRemoteJWKSet(
        new URL(issuer + '/protocol/openid-connect/certs')
    )
    trustedIssuers.push(issuer)
    jwksMap.set(issuer, jwks)
}

const findIssuer = (issuer: string): JwksFunction => {
    if (trustedIssuers.includes(issuer)) {
        return jwksMap.get(issuer)!
    }
    throw new Error('Issuer not trusted')
}

export const jwks = () => {
    const validate = async (
        jwt: string
    ): Promise<{ profile: any; scopes: string[] }> => {
        const payload = jose.decodeJwt(jwt)
        const issuer = payload.iss
        if (!issuer) {
            throw new Error('Issuer not found in token')
        }
        const JWKS = findIssuer(issuer)

        await jose.jwtVerify(jwt, JWKS, {
            issuer,
        })

        const scopes = (payload['scope'] as string)?.split(' ')
        return {
            profile: payload,
            scopes,
        }
    }

    return new Elysia({ name: 'jwks-auth' })
        .derive(() => {
            return {
                auth: {
                    authenticated: false,
                    profile: {
                        clientId: 'system',
                    } as jose.JWTPayload & { clientId: string },
                    scopes: [] as string[],
                },
            }
        })

        .derive(({ auth, headers, set }) => {
            return {
                authenticate: async () => {
                    const jwt = headers['authorization']?.split(' ')[1]

                    if (jwt === undefined) {
                        set.status = 401
                        return {
                            error: 'Unauthorized',
                            message: 'No token provided',
                        }
                    }

                    try {
                        const p = await validate(jwt)
                        auth.profile = {
                            ...auth.profile,
                            ...p.profile,
                        }
                        auth.authenticated = true
                        auth.scopes = p.scopes
                    } catch (e) {
                        set.status = 403
                        if (e instanceof jose.errors.JOSEError) {
                            return {
                                error: 'Forbidden',
                                message: e.message,
                            }
                        }
                        return {
                            error: 'Forbidden',
                            message: 'Token is invalid',
                        }
                    }

                    return null
                },
            }
        })
}
