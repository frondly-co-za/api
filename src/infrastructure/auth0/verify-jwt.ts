import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
    new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
);

export interface Auth0JwtPayload {
    sub: string;
    email?: string;
    name?: string;
}

export async function verifyJwt(token: string): Promise<Auth0JwtPayload> {
    const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
        audience: process.env.AUTH0_AUDIENCE
    });

    return payload as Auth0JwtPayload;
}
