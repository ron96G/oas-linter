import { Elysia, t } from 'elysia';
import { Issuer, TokenSet, generators, type Client } from 'openid-client';

export interface Storage {
    get: (id: string) => Promise<TokenSet>;
    set: (id: string, tokens: TokenSet) => Promise<void>;
    remove: (id: string) => Promise<void>;
}

export class DefaultStorage implements Storage {

    private profiles = new Map<string, TokenSet>()

    async get(id: string) {
        if (!this.profiles.has(id)) {
            throw new Error('Profile not found')
        }
        return this.profiles.get(id)!
    }

    async set(id: string, tokens: TokenSet) {
        this.profiles.set(id, tokens)
    }

    async remove(id: string) {
        this.profiles.delete(id)
    }
}

export interface Options {
    realmUrl: string;
    clientId: string;
    clientSecret: string;
    redirectHost: string;
    cookieSecrets: string[];
    defaultRedirectPath: string
}

export const oidc = async (options: Options) => {
    let issuer: Issuer
    let client: Client
    const storage = new DefaultStorage()

    const cookieName = 'oidcSession'
    const prefix = ''
    const codeVerifier = generators.codeVerifier()
    const postLogoutRedirectUri = undefined;

    const { realmUrl, clientId, clientSecret, redirectHost, cookieSecrets, defaultRedirectPath } = options
    const wellKnownConfigEndpoint = realmUrl + '/.well-known/openid-configuration'
    const redirectUri = redirectHost + prefix + '/callback'

    const res = await fetch(wellKnownConfigEndpoint)
    if (!res.ok) {
        throw new Error('Failed to fetch well-known config')
    }
    issuer = new Issuer(await res.json())
    client = new issuer.Client({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [redirectUri],
        response_types: ['code'],
    })

    const validateToken = async (id?: string) => {
        try {
            if (id === undefined) {
                return false
            }
            const profile = await storage.get(id)
            if (profile.expired()) {
                console.log('Token expired')
                storage.remove(id)
                return false
            }
        } catch (e) {
            return false
        }

        return true
    }

    const createAuthorizationURL = async (state: string, options?: { scopes?: string[] }): Promise<string> => {
        return client!.authorizationUrl({
            scope: options?.scopes?.join(' '),
            state: state,
            code_challenge: generators.codeChallenge(codeVerifier),
            code_challenge_method: 'S256',
        })
    }

    const refreshAccessToken = async (refreshToken: string) => {
        const tokenSet = await client!.refresh(refreshToken)
        console.log('refreshed and validated tokens %j', tokenSet);
        console.log('refreshed ID Token claims %j', tokenSet.claims());
        return tokenSet
    }


    return new Elysia({
        name: 'oidc-auth',
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 30,
            secrets: cookieSecrets,
            sign: [cookieName],
        }
    })
        .guard({
            cookie: t.Cookie({
                oidcSession: t.Optional(t.Object({
                    uid: t.String(),
                    oidcAuthorized: t.Boolean(),
                    oidcState: t.Optional(t.String()),
                    oidcOriginalRequestUrl: t.Optional(t.String()),
                }))
            })
        })

        .get('/login', async ({ set, cookie: { oidcSession } }) => {
            const currentSession = oidcSession.get()
            console.log(`[oidc.login] Session=${JSON.stringify(currentSession)}`)


            if (currentSession === undefined) {
                console.log(`[oidc.login] Setting session cookie`)
                oidcSession.value = {
                    uid: generators.random(),
                    oidcAuthorized: false,
                    oidcState: generators.state(),
                    oidcOriginalRequestUrl: defaultRedirectPath
                }
                set.redirect = prefix + '/login'
                return
            }

            if (await validateToken(currentSession?.uid)) { // Already authorized
                set.redirect = currentSession.oidcOriginalRequestUrl ?? defaultRedirectPath
                return
            }

            const { oidcState } = oidcSession.get()!

            const url = await createAuthorizationURL(oidcState!, { scopes: ['openid', 'profile'] })

            set.status = 302
            set.headers = {
                'Location': url
            }
        })

        .get('/callback', async ({ request, cookie: { oidcSession }, set }) => {
            const { uid, oidcState, oidcOriginalRequestUrl } = oidcSession.get()!
            console.log('[oidc.callback] oidcOriginalRequestUrl', oidcOriginalRequestUrl)
            const params = client!.callbackParams(request.url)
            const tokenSet = await client!.callback(redirectUri, params, { code_verifier: codeVerifier, state: oidcState })
            console.log('received and validated tokens %j', tokenSet);

            console.log(`[oidc.callback] Setting session cookie. Authorized=true`)
            oidcSession.value = {
                uid: uid,
                oidcAuthorized: true,
            }

            storage.set(uid, tokenSet)

            set.redirect = oidcOriginalRequestUrl ?? defaultRedirectPath
        })


        .get('/refresh', async ({ query, set }) => {
            const refreshToken = query['refreshToken']!
            const tokens = await refreshAccessToken(refreshToken)
            // console.log('refreshed tokens %j', tokens);
            set.status = 200
            return tokens
        })

        .get('/logout', async ({ set, cookie: { oidcSession } }) => {
            set.status = 302
            set.headers = {
                'Location': client!.endSessionUrl({
                    logout_hint: 'Successfully logged out',
                    post_logout_redirect_uri: postLogoutRedirectUri
                })
            }
            storage.remove(oidcSession.get()?.uid!)
            oidcSession.remove()
        })

        .derive((ctx) => {
            return {
                authorized: async (): Promise<boolean> => {
                    const session = ctx.cookie.oidcSession.get()
                    return validateToken(session?.uid)
                },

                authorizedWithRedirect: async (): Promise<boolean> => {
                    const session = ctx.cookie.oidcSession.get()
                    console.log('[oidc.authorizedWithRedirect] active-session', session)
                    if (await validateToken(session?.uid)) {
                        console.log('active-session-authorized')
                        return true
                    }
                    console.log(`[oidc.authorizedWithRedirect] Setting session cookie`)
                    ctx.cookie.oidcSession.value = {
                        uid: generators.random(),
                        oidcAuthorized: false,
                        oidcState: generators.state(),
                        oidcOriginalRequestUrl: ctx.request.url
                    }

                    ctx.set.redirect = prefix + "/login"
                    return false
                }
            }
        })
}
