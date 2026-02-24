# Pipeline Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up three rendering pipeline issues: move test-only Node fs code out of production, consolidate the rendering entry point, and replace global style injection with scoped CSS custom properties.

**Architecture:** Three independent changes. Task 1 extracts `ChoproFile.load()` to a test helper. Task 2 makes `renderBlock()` public so the code block processor uses the dispatcher. Task 3 replaces `ChoproStyleManager`'s global `<style>` injection with CSS custom properties set on `.chopro-container` elements.

**Tech Stack:** TypeScript, Obsidian Plugin API, CSS custom properties, Jest

**Design doc:** `docs/plans/2026-02-24-pipeline-cleanup-design.md`

**Branch:** `pipeline-cleanup` (from `main`)

---

### Task 0: Create feature branch

**Step 1: Create and switch to feature branch**

```bash
git checkout -b pipeline-cleanup main
```

**Step 2: Verify clean state**

Run: `git status`
Expected: On branch `pipeline-cleanup`, clean working tree.

---

### Task 1: Extract ChoproFile.load() to test helper

This removes `require("fs")` from production code. The `load()` method is only called from tests.

**Files:**

- Create: `test/helpers.ts`
- Modify: `src/parser.ts:896-900`
- Modify: `test/parser.test.ts:7,790-803`
- Modify: `test/transpose.test.ts:1,216,231-234`
- Modify: `test/convert.test.ts:4,97`

**Step 1: Create test/helpers.ts**

```typescript
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
```

**Step 2: Delete ChoproFile.load() from parser.ts**

Remove the `load` static method (lines 896-900):

```typescript
    static load(path: string): ChoproFile {
        const fs = require("fs");
        const fileContent = fs.readFileSync(path, "utf-8");
        return ChoproFile.parse(fileContent);
    }
```

**Step 3: Update test/parser.test.ts**

Add import:

```typescript
import { loadChoproFile } from "./helpers";
```

Remove `ChoproFile` from the `../src/parser` import (it's only used for `.load()`; check if it's used elsewhere in the file first -- if so, keep it).

Update the `prepareTestFile` helper (around line 790-803) to use `loadChoproFile`:

```typescript
function prepareTestFile(filename: string): ChoproFile {
    const filePath = path.join(testDir, filename)
    const file = loadChoproFile(filePath)
    // ... rest of function unchanged
```

**Step 4: Update test/transpose.test.ts**

Add import:

```typescript
import { loadChoproFile } from "./helpers";
```

Update line 216 -- change `ChoproFile.load(filePath)` to `loadChoproFile(filePath)`.

Update `loadTestFile` helper (lines 231-234) -- change `ChoproFile.load(filePath)` to `loadChoproFile(filePath)`.

Remove `ChoproFile` from the `../src/parser` import if no longer used directly.

**Step 5: Update test/convert.test.ts**

Add import:

```typescript
import { loadChoproFile } from "./helpers";
```

Update line 97 -- change `ChoproFile.load(testFilePath)` to `loadChoproFile(testFilePath)`.

Remove `ChoproFile` from the `../src/parser` import if no longer used directly.

**Step 6: Build to verify**

Run: `npm run build`
Expected: Clean build. No references to `require("fs")` in production code.

**Step 7: Run tests**

Run: `npx jest`
Expected: All existing tests pass.

**Step 8: Commit**

```bash
git add test/helpers.ts src/parser.ts test/parser.test.ts test/transpose.test.ts test/convert.test.ts
git commit -m "refactor: extract ChoproFile.load() to test helper

Moves the Node fs-based file loading out of the production parser
class and into test/helpers.ts. The load() method was only used by
tests and would fail in Obsidian's runtime."
```

---

### Task 2: Make renderBlock() public

Route all block rendering through the dispatcher.

**Files:**

- Modify: `src/render.ts:54`
- Modify: `src/main.ts:213`

**Step 1: Make renderBlock() public in render.ts**

The method at line 54 is already public (no `private` keyword). Verify this is the case. The key change is in main.ts.

**Step 2: Update processChoproBlock in main.ts**

Change line 213 from:

```typescript
this.renderer.renderChoproBlock(block, container);
```

to:

```typescript
await this.renderer.renderBlock(block, container);
```

Note: `processChoproBlock` is already `async`, so adding `await` is safe.

**Step 3: Build to verify**

Run: `npm run build`
Expected: Clean build with no type errors.

**Step 4: Run tests**

Run: `npx jest`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/main.ts
git commit -m "refactor: route code block rendering through renderBlock dispatcher

processChoproBlock now calls renderer.renderBlock() instead of
renderer.renderChoproBlock() directly, ensuring all block rendering
goes through the common dispatcher."
```

---

### Task 3: Replace global style injection with CSS custom properties

This is the largest change. It replaces `ChoproStyleManager`'s `<style>` injection with CSS custom properties set on `.chopro-container` elements.

**Files:**

- Modify: `styles.css:44-65`
- Modify: `src/styles.ts` (full rewrite)
- Modify: `src/main.ts:111,128-143,204-220`

**Step 1: Update styles.css**

Replace the static chord/annotation rules (lines 44-65) with variable-driven versions. The existing rules set fixed values; the new ones use `var()` with defaults matching `DEFAULT_SETTINGS`.

Replace lines 44-65:

```css
/* ===== Chord and Annotation Styles ===== */
.chopro-chord,
.chopro-annotation {
    font-weight: bold;
    white-space: nowrap;
    font-family: var(--font-monospace);
    display: inline;
    margin-right: 0.5em;
    text-overflow: ellipsis;
}
```

with:

```css
/* ===== Chord and Annotation Styles ===== */
.chopro-chord,
.chopro-annotation {
    color: var(--chopro-chord-color, #2563eb);
    font-size: calc(var(--chopro-chord-size, 1) * 1em);
    font-weight: bold;
    white-space: nowrap;
    font-family: var(--font-monospace);
    display: inline;
    margin-right: 0.5em;
    text-overflow: ellipsis;
}
```

Replace the existing `.chopro-line:has(.chopro-pair)` rule (lines 30-33):

```css
.chopro-line:has(.chopro-pair) {
    padding-top: 1.5em;
    align-items: baseline;
}
```

with:

```css
.chopro-line:has(.chopro-pair) {
    padding-top: calc(var(--chopro-chord-size, 1) * 1.5em);
    min-height: calc(1.5em + var(--chopro-chord-size, 1) * 1em);
    align-items: baseline;
}
```

Add class-gated rules for boolean toggles after the chord modifier rule (after line 65):

```css
.chopro-italic-annotations .chopro-annotation {
    font-style: italic;
}

.chopro-superscript-mods .chopro-chord-modifier {
    vertical-align: top;
    font-size: 0.75em;
}
```

**Step 2: Rewrite styles.ts**

Replace the entire contents of `src/styles.ts`:

```typescript
// styles - Style Manager for the ChoPro plugin in Obsidian

import { RenderSettings } from "./config";

export class ChoproStyleManager {
    /**
     * Apply style settings to a container element using CSS custom properties.
     * Sets CSS variables and toggles classes for boolean settings.
     */
    static applyToContainer(el: HTMLElement, settings: RenderSettings): void {
        const color = this.sanitizeColorValue(settings.chordColor);
        const size = this.sanitizeSizeValue(settings.chordSize);

        el.style.setProperty("--chopro-chord-color", color);
        el.style.setProperty("--chopro-chord-size", String(size));

        el.classList.toggle("chopro-italic-annotations", settings.italicAnnotations);
        el.classList.toggle("chopro-superscript-mods", settings.superscriptChordMods);
    }

    /**
     * Update all existing .chopro-container elements with current settings.
     * Called when settings change so existing rendered views update immediately.
     */
    static updateAllContainers(settings: RenderSettings): void {
        const containers = document.querySelectorAll<HTMLElement>(".chopro-container");
        for (const container of containers) {
            this.applyToContainer(container, settings);
        }
    }

    private static sanitizeColorValue(color: string): string {
        if (!color || typeof color !== "string") {
            return "#2563eb";
        }

        const colorPattern = /^(#([0-9a-fA-F]{3}){1,2}|rgb\(.*\)|hsl\(.*\)|[a-zA-Z]+)$/;
        return colorPattern.test(color.trim()) ? color.trim() : "#2563eb";
    }

    private static sanitizeSizeValue(size: number): number {
        if (typeof size !== "number" || isNaN(size)) {
            return 1.0;
        }
        return Math.max(0.5, Math.min(3.0, size));
    }
}
```

**Step 3: Update main.ts -- applySettings()**

Replace `applySettings()` (lines 128-143). Remove `ChoproStyleManager.applyStyles()` and add `updateAllContainers()`:

```typescript
    private applySettings(): void {
        Logger.setGlobalLogLevel(this.settings.logLevel);

        this.renderer = new ContentRenderer(this.settings.rendering, (content, container) =>
            MarkdownRenderer.render(this.app, content, container, "", this)
        );
        this.flowManager = new FlowManager(this, this.settings.flow);
        this.calloutProcessor = new CalloutProcessor(
            this,
            this.flowManager,
            this.renderer,
            this.settings.rendering
        );

        ChoproStyleManager.updateAllContainers(this.settings.rendering);
    }
```

**Step 4: Update main.ts -- processChoproBlock()**

Add style application after creating the container (line 209). After Task 2, the block rendering uses `renderBlock`:

```typescript
    async processChoproBlock(source: string, el: HTMLElement): Promise<void> {
        this.logger.debug(`Processing ChoPro block with ${source.length} characters`);

        el.empty();

        const container = el.createDiv({ cls: "chopro-container" });
        ChoproStyleManager.applyToContainer(container, this.settings.rendering);

        try {
            const block = ChoproBlock.parseRaw(source);
            await this.renderer.renderBlock(block, container);
            this.logger.debug("ChoPro block rendered successfully");
        } catch (error) {
            this.logger.error("Failed to process ChoPro block: ", error);
            el.empty();
            el.createDiv({ cls: "chopro-error", text: "Error parsing ChoPro content" });
        }
    }
```

**Step 5: Update main.ts -- onunload()**

Remove `ChoproStyleManager.removeStyles()` from `onunload()` (line 111):

```typescript
    onunload(): void {
        this.logger.info("Plugin unloaded");
    }
```

**Step 6: Build to verify**

Run: `npm run build`
Expected: Clean build with no type errors. No references to `document.head`, `document.getElementById`, `STYLE_ID`, or `removeStyles`.

**Step 7: Run tests**

Run: `npx jest`
Expected: All tests pass.

**Step 8: Commit**

```bash
git add styles.css src/styles.ts src/main.ts
git commit -m "refactor: replace global style injection with CSS custom properties

ChoproStyleManager now sets CSS variables (--chopro-chord-color,
--chopro-chord-size) and toggles CSS classes on .chopro-container
elements instead of injecting a <style> into document.head. Removes
all global DOM manipulation from the style manager.

Settings changes update existing containers via updateAllContainers()
so styles reflect immediately without re-rendering."
```

---

### Task 4: Final verification

**Step 1: Full build**

Run: `npm run build`
Expected: Clean build.

**Step 2: Full test suite**

Run: `npx jest`
Expected: All tests pass.

**Step 3: Preflight**

Run: `just preflight`
Expected: All checks pass.

**Step 4: Review all changes**

Run: `git diff main --stat` and `git log --oneline main..HEAD`
Verify: 3 commits, no unintended changes, no leftover TODOs.
