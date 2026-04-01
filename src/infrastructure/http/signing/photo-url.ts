import { createHmac, timingSafeEqual } from 'crypto';

const TTL_SECONDS = 5 * 60;

export function signPhotoUrl(photoId: string, secret: string): string {
    const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
    const sig = computeHmac(photoId, expires, secret);
    return `/photos/${photoId}?expires=${expires}&sig=${sig}`;
}

export function verifyPhotoSignature(
    photoId: string,
    expires: string,
    sig: string,
    secret: string
): boolean {
    const expiresNum = parseInt(expires, 10);
    if (isNaN(expiresNum) || expiresNum < Math.floor(Date.now() / 1000)) return false;
    const expected = computeHmac(photoId, expiresNum, secret);
    try {
        return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
        return false;
    }
}

function computeHmac(photoId: string, expires: number, secret: string): string {
    return createHmac('sha256', secret).update(`${photoId}:${expires}`).digest('hex');
}
