import { Elysia } from 'elysia';
import * as jose from 'jose';

export class OidcAuth {
    private readonly ISSUER: string;
    private readonly JWKS: any;

    constructor(issuer: string) {
        this.ISSUER = issuer.trim();
        this.JWKS = jose.createRemoteJWKSet(new URL(this.ISSUER + "/protocol/openid-connect/certs"));
    }

    validate = async (jwt: string): Promise<{ profile: any, scopes: string[] }> => {
        const { payload } = await jose.jwtVerify(jwt, this.JWKS, {
            issuer: this.ISSUER
        })
        const scopes = (payload['scope'] as string)?.split(' ')
        return {
            profile: payload,
            scopes
        }
    }

    auth = () => {
        return new Elysia({ name: 'auth' })

            .derive(() => {
                return {
                    auth: {
                        authenticated: false,
                        profile: {
                            clientId: 'system',
                        } as jose.JWTPayload & { clientId: string },
                        scopes: [] as string[]
                    }
                }
            })

            .onBeforeHandle(async ({ headers, set, auth }) => {
                const jwt = headers['authorization']?.split(' ')[1]

                if (jwt === undefined) {
                    set.status = 401
                    return {
                        error: 'Unauthorized'
                    }
                }

                try {
                    const p = await this.validate(jwt)
                    auth.profile = {
                        ...auth.profile,
                        ...p.profile
                    }
                    auth.authenticated = true
                    auth.scopes = p.scopes
                } catch (e) {
                    set.status = 403
                    if (e instanceof jose.errors.JOSEError) {
                        return {
                            error: 'Forbidden',
                            message: e.message
                        }
                    }
                    return {
                        error: 'Forbidden',
                        message: 'Invalid token'
                    }
                }
            })
    }
}