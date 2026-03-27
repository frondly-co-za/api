import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
    resolve: {
        alias: {
            $domain: resolve(__dirname, 'src/domain'),
            $application: resolve(__dirname, 'src/application'),
            $infrastructure: resolve(__dirname, 'src/infrastructure'),
        },
    },
    test: {
        environment: 'node', // explicit, but also the default
    },
})