import path from 'path';
import { mkdir, unlink } from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import sharp from 'sharp';
import { PhotoStorage } from '$domain/photo.js';

export class LocalPhotoStorage implements PhotoStorage {
    constructor(private readonly storagePath: string) {}

    async save(uri: string, buffer: Buffer): Promise<void> {
        const fullPath = path.join(this.storagePath, uri);
        await mkdir(path.dirname(fullPath), { recursive: true });
        await sharp(buffer).webp({ quality: 80 }).toFile(fullPath);
    }

    async delete(uri: string): Promise<void> {
        await unlink(path.join(this.storagePath, uri));
    }

    createReadStream(uri: string): Readable {
        return createReadStream(path.join(this.storagePath, uri));
    }
}
