import { describe, it, expect, afterAll } from 'vitest';
import Fastify from 'fastify';

/**
 * Verifies the trustProxy behaviour that server.ts configures via TRUSTED_PROXY_IP.
 *
 * fastify.inject() always connects from 127.0.0.1, which lets us use that address
 * as the "real" proxy IP in the trusted-proxy case without a real socket.
 */

function buildApp(trustProxy: boolean | string) {
    const app = Fastify({ trustProxy });
    app.get('/ip', async (request) => ({ ip: request.ip }));
    return app;
}

describe('trustProxy: false — TRUSTED_PROXY_IP not set (default)', () => {
    const app = buildApp(false);
    afterAll(() => app.close());

    it('ignores X-Forwarded-For and uses the socket address', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/ip',
            headers: { 'x-forwarded-for': '1.2.3.4' }
        });

        expect(res.json().ip).toBe('127.0.0.1');
    });

    it('returns the socket address even with multiple spoofed hops', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/ip',
            headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }
        });

        expect(res.json().ip).toBe('127.0.0.1');
    });
});

describe('trustProxy: matching IP — TRUSTED_PROXY_IP set to the connecting address', () => {
    // inject() connects from 127.0.0.1, so setting TRUSTED_PROXY_IP=127.0.0.1 simulates
    // a correctly configured reverse-proxy environment.
    const app = buildApp('127.0.0.1');
    afterAll(() => app.close());

    it('uses the X-Forwarded-For client IP when the proxy address is trusted', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/ip',
            headers: { 'x-forwarded-for': '1.2.3.4' }
        });

        expect(res.json().ip).toBe('1.2.3.4');
    });
});

describe('trustProxy: non-matching IP — TRUSTED_PROXY_IP set to a different address', () => {
    // The connecting IP (127.0.0.1) is NOT in the trusted list, so X-Forwarded-For
    // must be ignored — same protection as trustProxy: false.
    const app = buildApp('10.0.0.1');
    afterAll(() => app.close());

    it('ignores X-Forwarded-For when the connecting IP is not the trusted proxy', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/ip',
            headers: { 'x-forwarded-for': '1.2.3.4' }
        });

        expect(res.json().ip).toBe('127.0.0.1');
    });
});
