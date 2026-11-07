import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["test/epubcheck/**/*.test.ts"],
        // These tests involve starting a JVM each time so can take some time
        testTimeout: 60_000,
        slowTestThreshold: 30_000,
    },
});
