const required = ['MONGODB_URI', 'AUTH0_DOMAIN', 'AUTH0_AUDIENCE', 'PHOTO_SIGNING_SECRET'] as const;
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

import server from '$infrastructure/http/server.js';

try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
} catch (err) {
    server.log.error(err);
    process.exit(1);
}
