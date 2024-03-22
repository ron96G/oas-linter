import { Elysia } from 'elysia'
import * as jose from 'jose'

export const jwks = (issuer: string) => {
    const ISSUER = issuer.trim()
    const JWKS = jose.createRemoteJWKSet(
        new URL(ISSUER + '/protocol/openid-connect/certs')
    )

    const validate = async (
        jwt: string
    ): Promise<{ profile: any; scopes: string[] }> => {
        const { payload } = await jose.jwtVerify(jwt, JWKS, {
            issuer: ISSUER,
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
                            message: 'Invalid token',
                        }
                    }

                    return null
                },
            }
        })
}
