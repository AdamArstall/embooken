import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["test/**/*.test.ts"],
        // These suites need Java/EPUBCheck or a real browser and have their own scripts.
        exclude: [
            ...configDefaults.exclude,
            "test/epubcheck/**",
            "test/e2e/**",
        ],
    },
});
