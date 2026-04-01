import path from 'path';
import { mkdir, unlink } from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import sharp from 'sharp';
import { FastifyBaseLogger } from 'fastify';
import { PhotoStorage } from '$domain/photo.js';

export class LocalPhotoStorage implements PhotoStorage {
    private readonly resolvedBase: string;

    constructor(
        private readonly storagePath: string,
        private readonly log: FastifyBaseLogger
    ) {
        this.resolvedBase = path.resolve(storagePath);
    }

    private resolveSafe(uri: string): string {
        const fullPath = path.resolve(this.resolvedBase, uri);
        if (!fullPath.startsWith(this.resolvedBase + path.sep)) {
            this.log.warn({ uri }, 'Path traversal attempt detected in photo storage');
            throw new Error('Invalid photo URI');
        }
        return fullPath;
    }

    async save(uri: string, buffer: Buffer): Promise<void> {
        const metadata = await sharp(buffer).metadata();
        if (!metadata.format) {
            this.log.warn({ uri }, 'Photo upload rejected: unrecognised image format');
            throw new Error('Invalid image content');
        }

        const fullPath = this.resolveSafe(uri);
        await mkdir(path.dirname(fullPath), { recursive: true });
        await sharp(buffer).webp({ quality: 80 }).toFile(fullPath);
    }

    async delete(uri: string): Promise<void> {
        await unlink(this.resolveSafe(uri));
    }

    createReadStream(uri: string): Readable {
        return createReadStream(this.resolveSafe(uri));
    }
}
