import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import os from 'os';
import { mkdtemp, rm, access } from 'fs/promises';
import sharp from 'sharp';
import { LocalPhotoStorage } from '$infrastructure/storage/local-photo-storage.js';

let tmpDir: string;
let storage: LocalPhotoStorage;

// A minimal valid 1×1 green JPEG for use as test input
let testImageBuffer: Buffer;

beforeAll(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'frondly-test-'));
    storage = new LocalPhotoStorage(tmpDir);
    testImageBuffer = await sharp({
        create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 128, b: 0 } }
    })
        .jpeg()
        .toBuffer();
});

afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
});

describe('save', () => {
    it('creates intermediate directories and writes a WebP file', async () => {
        const uri = 'user1/plant1/photo1.webp';
        await storage.save(uri, testImageBuffer);

        const fullPath = path.join(tmpDir, uri);
        await expect(access(fullPath)).resolves.toBeUndefined();

        const metadata = await sharp(fullPath).metadata();
        expect(metadata.format).toBe('webp');
    });

    it('overwrites an existing file', async () => {
        const uri = 'user1/plant1/overwrite.webp';
        await storage.save(uri, testImageBuffer);
        await storage.save(uri, testImageBuffer);

        const fullPath = path.join(tmpDir, uri);
        await expect(access(fullPath)).resolves.toBeUndefined();
    });
});

describe('delete', () => {
    it('removes the file', async () => {
        const uri = 'user1/plant1/to-delete.webp';
        await storage.save(uri, testImageBuffer);

        await storage.delete(uri);

        await expect(access(path.join(tmpDir, uri))).rejects.toThrow();
    });

    it('throws when the file does not exist', async () => {
        await expect(storage.delete('nonexistent/photo.webp')).rejects.toThrow();
    });
});

describe('createReadStream', () => {
    it('returns a readable stream of the file contents', async () => {
        const uri = 'user1/plant1/readable.webp';
        await storage.save(uri, testImageBuffer);

        const stream = storage.createReadStream(uri);
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on('end', resolve);
            stream.on('error', reject);
        });

        const content = Buffer.concat(chunks);
        expect(content.length).toBeGreaterThan(0);
        expect(await sharp(content).metadata()).toMatchObject({ format: 'webp' });
    });

    it('emits an error when the file does not exist', async () => {
        const stream = storage.createReadStream('nonexistent/photo.webp');
        await expect(
            new Promise<void>((resolve, reject) => {
                stream.on('data', () => {});
                stream.on('end', resolve);
                stream.on('error', reject);
            })
        ).rejects.toThrow();
    });
});
