import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { signPhotoUrl, verifyPhotoSignature } from '$infrastructure/http/signing/photo-url.js';

const secret = 'test-secret';
const photoId = '507f1f77bcf86cd799439011';

function makeHmac(photoId: string, expires: number): string {
    return createHmac('sha256', secret).update(`${photoId}:${expires}`).digest('hex');
}

function parseSignedUrl(url: string) {
    const params = new URL(url, 'http://x').searchParams;
    return { expires: params.get('expires')!, sig: params.get('sig')! };
}

describe('signPhotoUrl', () => {
    it('returns a URL with the correct shape', () => {
        const url = signPhotoUrl(photoId, secret);
        expect(url).toMatch(new RegExp(`^/photos/${photoId}\\?expires=\\d+&sig=[a-f0-9]{64}$`));
    });

    it('sets an expiry approximately 5 minutes in the future', () => {
        const before = Math.floor(Date.now() / 1000);
        const { expires } = parseSignedUrl(signPhotoUrl(photoId, secret));
        const after = Math.floor(Date.now() / 1000);
        expect(parseInt(expires)).toBeGreaterThanOrEqual(before + 5 * 60);
        expect(parseInt(expires)).toBeLessThanOrEqual(after + 5 * 60);
    });
});

describe('verifyPhotoSignature', () => {
    it('returns true for a freshly signed URL', () => {
        const { expires, sig } = parseSignedUrl(signPhotoUrl(photoId, secret));
        expect(verifyPhotoSignature(photoId, expires, sig, secret)).toBe(true);
    });

    it('returns false when the timestamp is expired', () => {
        const expires = Math.floor(Date.now() / 1000) - 1;
        const sig = makeHmac(photoId, expires);
        expect(verifyPhotoSignature(photoId, String(expires), sig, secret)).toBe(false);
    });

    it('returns false when expires is not a number', () => {
        expect(verifyPhotoSignature(photoId, 'not-a-number', 'somesig', secret)).toBe(false);
    });

    it('returns false when the photoId has been tampered with', () => {
        const { expires, sig } = parseSignedUrl(signPhotoUrl(photoId, secret));
        const differentId = '507f1f77bcf86cd799439099';
        expect(verifyPhotoSignature(differentId, expires, sig, secret)).toBe(false);
    });

    it('returns false when the signature has been tampered with', () => {
        const { expires } = parseSignedUrl(signPhotoUrl(photoId, secret));
        const tamperedSig = 'a'.repeat(64);
        expect(verifyPhotoSignature(photoId, expires, tamperedSig, secret)).toBe(false);
    });

    it('returns false when the wrong secret is used', () => {
        const { expires, sig } = parseSignedUrl(signPhotoUrl(photoId, secret));
        expect(verifyPhotoSignature(photoId, expires, sig, 'wrong-secret')).toBe(false);
    });

    it('returns false when the sig is not valid hex', () => {
        const { expires } = parseSignedUrl(signPhotoUrl(photoId, secret));
        expect(verifyPhotoSignature(photoId, expires, 'not-valid-hex!!!', secret)).toBe(false);
    });
});
