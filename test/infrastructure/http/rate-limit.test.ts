import { describe, it, expect, afterAll } from 'vitest';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';

/**
 * Validates rate-limiter behavior and identity resolution under different proxy trust configs.
 *
 * fastify.inject() always connects from 127.0.0.1, which lets us use that address
 * as the "real" proxy IP in the trusted-proxy case without a real socket.
 */

async function buildApp(trustProxy: boolean | string, max = 3) {
    const app = Fastify({ trustProxy, logger: false });
    await app.register(rateLimit, { max, timeWindow: '1 minute' });
    app.get('/test', async () => ({ ok: true }));
    await app.ready();
    return app;
}

describe('threshold enforcement', () => {
    it('returns 429 after max requests are exceeded', async () => {
        const app = await buildApp(false, 3);
        afterAll(() => app.close());

        for (let i = 0; i < 3; i++) {
            const res = await app.inject({ method: 'GET', url: '/test' });
            expect(res.statusCode).toBe(200);
        }

        const limited = await app.inject({ method: 'GET', url: '/test' });
        expect(limited.statusCode).toBe(429);
    });
});

describe('trusted proxy — identity derived from X-Forwarded-For', () => {
    it('limits by the forwarded client IP, not the proxy socket address', async () => {
        // inject() connects from 127.0.0.1; setting trustProxy to that address
        // simulates a correctly configured reverse-proxy environment.
        const app = await buildApp('127.0.0.1', 3);
        afterAll(() => app.close());

        // Drain the limit for one client IP
        for (let i = 0; i < 3; i++) {
            await app.inject({
                method: 'GET',
                url: '/test',
                headers: { 'x-forwarded-for': '10.0.0.1' }
            });
        }

        const limitedRes = await app.inject({
            method: 'GET',
            url: '/test',
            headers: { 'x-forwarded-for': '10.0.0.1' }
        });
        expect(limitedRes.statusCode).toBe(429);

        // A different client IP still has its own budget
        const differentRes = await app.inject({
            method: 'GET',
            url: '/test',
            headers: { 'x-forwarded-for': '10.0.0.2' }
        });
        expect(differentRes.statusCode).toBe(200);
    });
});

describe('untrusted proxy — spoofed X-Forwarded-For does not alter limiter identity', () => {
    it('uses the socket address as the rate-limit key regardless of X-Forwarded-For', async () => {
        // The connecting IP (127.0.0.1) is NOT in the trusted list, so X-Forwarded-For
        // is ignored — all requests share the same socket-based identity.
        const app = await buildApp('10.0.0.1', 3);
        afterAll(() => app.close());

        // Drain the limit without any X-Forwarded-For header
        for (let i = 0; i < 3; i++) {
            await app.inject({ method: 'GET', url: '/test' });
        }

        // Spoofing a different IP does not bypass the limit
        const spoofedRes = await app.inject({
            method: 'GET',
            url: '/test',
            headers: { 'x-forwarded-for': '1.2.3.4' }
        });
        expect(spoofedRes.statusCode).toBe(429);
    });

    it('rotating spoofed IPs does not grant extra request budget', async () => {
        const app = await buildApp(false, 3);
        afterAll(() => app.close());

        for (let i = 0; i < 3; i++) {
            await app.inject({ method: 'GET', url: '/test' });
        }

        // Each request with a different spoofed IP still counts against the same socket key
        for (const ip of ['1.1.1.1', '2.2.2.2', '3.3.3.3']) {
            const res = await app.inject({
                method: 'GET',
                url: '/test',
                headers: { 'x-forwarded-for': ip }
            });
            expect(res.statusCode).toBe(429);
        }
    });
});
