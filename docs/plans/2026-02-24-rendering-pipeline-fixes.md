# Rendering Pipeline Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix fragile DOM walking in metadata header injection, add per-song metadata headers to callouts (#235), and fix the renderMarkdownBlock TODO.

**Architecture:** Three independent changes to the rendering pipeline: (1) replace post-processor metadata header injection with a `layout-change` workspace event, (2) add per-song metadata headers inside the callout processor, (3) accept a markdown render callback in `ContentRenderer` to properly render markdown blocks.

**Tech Stack:** TypeScript, Obsidian Plugin API (`MarkdownView`, `MarkdownRenderer`, workspace events, `metadataCache`)

**Design doc:** `docs/plans/2026-02-24-rendering-pipeline-fixes-design.md`

---

### Task 1: Add markdown render callback to ContentRenderer

This task is independent and touches the fewest files. It adds the callback type and wires it through the constructor.

**Files:**

- Modify: `src/render.ts:26-64`
- Modify: `src/main.ts:4,111`

**Step 1: Add the callback type and constructor parameter to ContentRenderer**

In `src/render.ts`, add a type alias before the class and update the constructor:

```typescript
/**
 * Optional callback for rendering markdown content into DOM elements.
 * Injected by the plugin to avoid coupling the renderer to Obsidian's API.
 */
export type MarkdownRenderFn = (content: string, container: HTMLElement) => Promise<void>;
```

Update the constructor to accept the callback:

```typescript
export class ContentRenderer {
    private logger = Logger.getLogger("ContentRenderer")
    private settings: RenderSettings
    private renderMarkdownFn?: MarkdownRenderFn

    constructor(settings: RenderSettings, renderMarkdownFn?: MarkdownRenderFn) {
        this.settings = settings
        this.renderMarkdownFn = renderMarkdownFn
    }
```

**Step 2: Update renderMarkdownBlock to use the callback**

Replace the current `renderMarkdownBlock` method (lines 57-64) with:

```typescript
    /**
     * Render a markdown block into DOM elements.
     * Uses the injected render callback if available, otherwise falls back to plain text.
     */
    async renderMarkdownBlock(block: MarkdownBlock, container: HTMLElement): Promise<void> {
        const content = block.content
        const markdown = container.createDiv({ cls: "markdown" })

        if (this.renderMarkdownFn) {
            await this.renderMarkdownFn(content, markdown)
        } else {
            markdown.setText(content)
        }
    }
```

Note: `renderMarkdownBlock` becomes `async` since the callback returns a `Promise`. This also means `renderBlock` needs to become async, and the `render` method needs to await block rendering.

Update `renderBlock`:

```typescript
    async renderBlock(block: ContentBlock, container: HTMLElement): Promise<void> {
        if (block instanceof MarkdownBlock) {
            await this.renderMarkdownBlock(block, container)
        } else if (block instanceof ChoproBlock) {
            this.renderChoproBlock(block, container)
        }
    }
```

Update `render`:

```typescript
    async render(file: ChoproFile, container: HTMLElement): Promise<void> {
        for (const block of file.blocks) {
            await this.renderBlock(block, container)
        }
    }
```

**Step 3: Pass the callback from main.ts**

In `src/main.ts`, add `MarkdownRenderer` to the obsidian import (line 4):

```typescript
import {
    Plugin,
    Notice,
    MarkdownView,
    Editor,
    MarkdownPostProcessorContext,
    MarkdownRenderer,
} from "obsidian";
```

Update `applySettings()` (line 111) to pass the callback:

```typescript
    private applySettings(): void {
        Logger.setGlobalLogLevel(this.settings.logLevel)

        this.renderer = new ContentRenderer(this.settings.rendering, (content, container) =>
            MarkdownRenderer.render(this.app, content, container, "", this)
        )
        this.flowManager = new FlowManager(this, this.settings.flow)
        this.calloutProcessor = new CalloutProcessor(this, this.flowManager)

        ChoproStyleManager.applyStyles(this.settings.rendering)
    }
```

Also update the import from render.ts (line 7) to include the type:

```typescript
import { ContentRenderer } from "./render";
```

(The `MarkdownRenderFn` type doesn't need to be imported in main.ts since it's inferred from the callback parameter.)

**Step 4: Build to verify**

Run: `npm run build`
Expected: Clean build with no type errors.

**Step 5: Run existing tests**

Run: `npx jest`
Expected: All existing tests pass (none test render.ts, so no breakage expected).

**Step 6: Commit**

```bash
git add src/render.ts src/main.ts
git commit -m "feat: add markdown render callback to ContentRenderer

Accepts an optional MarkdownRenderFn callback to render markdown blocks
using Obsidian's MarkdownRenderer.render() without coupling the renderer
directly to the Obsidian API. Falls back to setText() when no callback
is provided (e.g., in tests)."
```

---

### Task 2: Add per-song metadata headers to callout processor

This task makes the callout processor render each linked song's metadata header from that song's own frontmatter. It requires the renderer (from Task 1) to be available.

**Files:**

- Modify: `src/callout.ts:1-6,34-43,149-173`
- Modify: `src/main.ts:113`

**Step 1: Add renderer and settings to CalloutProcessor constructor**

In `src/callout.ts`, update imports to include the parser types:

```typescript
import { Logger } from "obskit";
import { TFile, MarkdownPostProcessorContext, Plugin, MarkdownRenderer, parseYaml } from "obsidian";

import { FlowManager } from "./flow";
import { ContentRenderer } from "./render";
import { ChoproFile } from "./parser";
import { RenderSettings } from "./config";
```

Update the class to accept the renderer and settings:

```typescript
export class CalloutProcessor {
    private logger = Logger.getLogger("CalloutProcessor")

    private plugin: Plugin
    private flowManager: FlowManager
    private renderer: ContentRenderer
    private renderSettings: RenderSettings

    constructor(
        plugin: Plugin,
        flowManager: FlowManager,
        renderer: ContentRenderer,
        renderSettings: RenderSettings
    ) {
        this.plugin = plugin
        this.flowManager = flowManager
        this.renderer = renderer
        this.renderSettings = renderSettings
    }
```

**Step 2: Render metadata header in the callout's render method**

Update the `render` method (lines 149-173) to parse frontmatter and render a metadata header before the content:

```typescript
    /**
     * Render the callout content file with the specified features.
     */
    private async render(
        callout: HTMLElement,
        file: TFile,
        features: CalloutFeatures
    ): Promise<void> {
        callout.empty()

        let content: string

        if (features.flow && this.flowManager.hasFlowDefinition(file)) {
            this.logger.debug("Rendering flow content")
            content = await this.flowManager.getResolvedFlowContent(file)
        } else {
            this.logger.debug("Rendering markdown content")
            content = await this.plugin.app.vault.read(file)
        }

        const container = callout.createEl("blockquote")

        // Render per-song metadata header from the target file's frontmatter
        if (this.renderSettings.showMetadataHeader) {
            const parsed = ChoproFile.parse(content)
            if (parsed.frontmatter) {
                this.renderer.renderMetadataHeader(parsed.frontmatter, container)
            }
        }

        await MarkdownRenderer.render(this.plugin.app, content, container, file.path, this.plugin)
    }
```

**Step 3: Update main.ts to pass renderer and settings to CalloutProcessor**

In `src/main.ts`, update the `applySettings()` method to pass the new arguments:

```typescript
    private applySettings(): void {
        Logger.setGlobalLogLevel(this.settings.logLevel)

        this.renderer = new ContentRenderer(this.settings.rendering, (content, container) =>
            MarkdownRenderer.render(this.app, content, container, "", this)
        )
        this.flowManager = new FlowManager(this, this.settings.flow)
        this.calloutProcessor = new CalloutProcessor(
            this,
            this.flowManager,
            this.renderer,
            this.settings.rendering
        )

        ChoproStyleManager.applyStyles(this.settings.rendering)
    }
```

**Step 4: Build to verify**

Run: `npm run build`
Expected: Clean build with no type errors.

**Step 5: Run existing tests**

Run: `npx jest`
Expected: All existing tests pass.

**Step 6: Commit**

```bash
git add src/callout.ts src/main.ts
git commit -m "feat: render per-song metadata headers in callouts (#235)

The callout processor now parses the target file's frontmatter and
renders its metadata header at the top of the callout container. This
fixes set lists where each song should show its own title/artist
header, not the set list document's metadata."
```

---

### Task 3: Replace post-processor metadata header with workspace event

This task removes the fragile DOM-walking header injection and replaces it with a `layout-change` event listener. This is the core fix for #235.

**Files:**

- Modify: `src/main.ts:47-59,108-116,195-253`
- Modify: `styles.css:122-126`

**Step 1: Register layout-change event in onload**

In `src/main.ts`, replace the post-processor registration (lines 56-59) with a simpler version that only handles callouts, and add a layout-change listener:

```typescript
    async onload() {
        this.logger.debug("Initializing plugin")

        await this.loadSettings()

        this.registerMarkdownCodeBlockProcessor("chopro", async (source, el) => {
            await this.processChoproBlock(source, el)
        })

        this.registerMarkdownPostProcessor(async (el, ctx) => {
            await this.calloutProcessor.processCallouts(el, ctx)
        })

        this.registerEvent(
            this.app.workspace.on("layout-change", () => {
                this.handleLayoutChange()
            })
        )

        // ... rest of onload (commands, settings tab, etc.)
    }
```

**Step 2: Add the handleLayoutChange method**

Add a new method to `ChoproPlugin` that implements the guard pattern:

```typescript
    /**
     * Handle layout changes to inject/update the document-level metadata header.
     * Uses a guard pattern to short-circuit quickly in the common case.
     */
    private handleLayoutChange(): void {
        if (!this.settings.rendering.showMetadataHeader) {
            return
        }

        const view = this.app.workspace.getActiveViewOfType(MarkdownView)
        if (!view) {
            return
        }

        const file = view.file
        if (!file) {
            return
        }

        const contentEl = view.contentEl

        // Already injected for this view
        if (contentEl.querySelector(":scope > .chopro-header")) {
            return
        }

        // Not a chopro document
        if (!contentEl.querySelector(".chopro-container")) {
            return
        }

        // Check frontmatter for song metadata
        const cache = this.app.metadataCache.getFileCache(file)
        const frontmatter = cache?.frontmatter

        if (!frontmatter) {
            return
        }

        const metadata = new Frontmatter(frontmatter as Record<string, any>)
        const header = this.createMetadataHeader(metadata)

        if (header) {
            contentEl.prepend(header)
            this.logger.info("Document metadata header injected via layout-change")
        }
    }
```

Note the `:scope > .chopro-header` selector: this checks for a header that is a direct child of `contentEl`, not headers inside callouts (which are nested deeper). This prevents deconfliction issues with callout-level headers.

**Step 3: Remove old header injection code**

Delete the following methods from `ChoproPlugin` in `src/main.ts`:

- `injectMetadataHeader` (lines 198-232)
- `findDocumentContainer` (lines 237-243)

Keep `createMetadataHeader` (lines 249-253) as it's still used by the new `handleLayoutChange`.

**Step 4: Update CSS**

In `styles.css`, remove the fragile view-mode filtering rule (lines 122-126):

```css
/* only show in Reading View (not Live Preview) */
.markdown-source-view:not(.is-live-preview) .chopro-header {
    display: none;
}
```

The workspace event approach naturally handles this because `view.contentEl` is always the active view's content area. If view-mode filtering is needed later, it can be done in the `handleLayoutChange` guard (checking `view.getMode()` or similar).

**Step 5: Build to verify**

Run: `npm run build`
Expected: Clean build with no type errors. No references to removed methods.

**Step 6: Run existing tests**

Run: `npx jest`
Expected: All existing tests pass.

**Step 7: Commit**

```bash
git add src/main.ts styles.css
git commit -m "fix: replace fragile DOM-walking header injection with workspace event (#235)

Metadata header injection now uses a layout-change event listener with
a guard pattern instead of walking up the DOM with .closest() in the
post-processor. Removes findDocumentContainer and the coupling to
Obsidian's internal .markdown-preview-sizer class names.

Combined with per-song callout headers, this fixes #235 where only the
first callout in a set list would get a metadata header."
```

---

### Task 4: Manual testing

These tests must be performed in Obsidian after loading the plugin.

**Test 1: Single song document with metadata header enabled**

1. Open a song document that has frontmatter with `title` and `artist`
2. Enable "Show metadata header" in plugin settings
3. Verify the header appears at the top of the reading view with title/artist

**Test 2: Set list with multiple callouts (#235)**

1. Create a set list document with two `[!chopro]` callouts linking to different songs
2. Each song should have its own frontmatter with different titles/artists
3. Verify each callout renders its own per-song metadata header
4. Verify the set list's own metadata header appears at the document level (if the set list has title/artist)

**Test 3: Document without chopro content**

1. Open a regular markdown document with title/artist frontmatter
2. Verify no metadata header is injected (the guard checks for `.chopro-container`)

**Test 4: Markdown blocks render properly**

1. Create a document that has non-chopro markdown content mixed with chopro code blocks
2. Verify the markdown content is rendered properly (not as plain text)

**Test 5: Metadata header disabled**

1. Disable "Show metadata header" in plugin settings
2. Verify no headers appear in any view

---

### Task 5: Final build and commit

**Step 1: Full build**

Run: `npm run build`
Expected: Clean build.

**Step 2: Full test suite**

Run: `npx jest`
Expected: All tests pass.

**Step 3: Review all changes**

Run: `git diff main --stat` and `git diff main` to review the complete changeset.
Verify no unintended changes, no leftover TODOs from this work, and no debug code.
