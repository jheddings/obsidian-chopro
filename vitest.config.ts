import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["test/**/*.test.ts"],
        alias: {
            obskit: path.resolve(__dirname, "test/__mocks__/obskit.ts"),
        },
    },
});
