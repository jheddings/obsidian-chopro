import { ChoproFile } from "../src/parser";
import * as fs from "fs";

/**
 * Load a ChoproFile from a file path using Node fs.
 * Test-only utility -- not available in the Obsidian runtime.
 */
export function loadChoproFile(path: string): ChoproFile {
    const content = fs.readFileSync(path, "utf-8");
    return ChoproFile.parse(content);
}
