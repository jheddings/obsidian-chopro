# Rendering Pipeline Targeted Fixes

**Date:** 2026-02-24
**Scope:** Targeted fixes to reduce fragility and complexity in the rendering pipeline
**Related issues:** #235 (inconsistent metadata header)

## Goals

- Remove fragile DOM walking (`findDocumentContainer` with `.closest()`)
- Fix #235: callout-rendered songs in set lists get per-song metadata headers
- Fix `renderMarkdownBlock` TODO: render markdown content properly

## Design

### 1. Document-level metadata header via workspace events

**Problem:** `injectMetadataHeader` in `main.ts` walks up the DOM with
`.closest('.markdown-preview-sizer')` to find the document container and check
for existing headers. This couples to Obsidian's internal class names and causes
#235 (only the first callout in a set list gets a header; uses the document's
frontmatter instead of the song's).

**Solution:** Replace the post-processor-based header injection with a
`layout-change` workspace event listener. The event fires after rendering is
complete, so rendered elements are available for inspection.

Guard pattern for `layout-change`:

1. Get the active `MarkdownView` -- bail if none
2. Check `view.contentEl` for existing `.chopro-header` -- bail if found
3. Check `view.contentEl` for `.chopro-container` -- bail if none (not chopro)
4. Check `metadataCache.getFileCache(file)?.frontmatter` for song metadata
   (title/artist) -- bail if none
5. Inject header into `view.contentEl`

Steps 2-3 are fast DOM queries that short-circuit. No caching mechanism needed.

**Changes:**

- `main.ts`: Remove `findDocumentContainer`, remove `injectMetadataHeader` call
  from the post-processor, add `layout-change` event registration, add new
  header injection method using `view.contentEl`
- Remove the `.markdown-source-view:not(.is-live-preview)` CSS rule in
  `styles.css` if it's no longer needed (the workspace event approach can handle
  view-mode filtering in code)

### 2. Callout-level metadata header

**Problem:** Callout-rendered songs in set lists (#235) don't get per-song
metadata headers because the current header injection uses the document's
frontmatter, not the linked song's frontmatter.

**Solution:** The callout processor renders per-song metadata headers
independently:

1. After loading the target file's content, parse it with `ChoproFile.parse()`
   to extract frontmatter
2. If `showMetadataHeader` is enabled and frontmatter has song metadata
   (title/artist), call `renderer.renderMetadataHeader()` at the top of the
   callout container
3. Pass the `ContentRenderer` (or render settings) to `CalloutProcessor`

This is completely self-contained within the callout's DOM. No DOM traversal.

**Deconfliction with document header:** The two paths are independent. The
document header is injected by the workspace event into `view.contentEl`. The
callout header is injected by the callout processor into the callout element.
Both check for existing `.chopro-header` within their scope to prevent
duplicates.

**Changes:**

- `callout.ts`: Accept renderer (or settings) in constructor, parse target
  file's frontmatter, render metadata header before content
- `main.ts`: Pass renderer to `CalloutProcessor` constructor

### 3. Fix `renderMarkdownBlock` TODO

**Problem:** `renderMarkdownBlock` in `render.ts:57-64` uses `setText()` which
treats markdown as plain text. There's a commented-out
`MarkdownRenderer.render()` call.

**Solution:** Accept a markdown render callback in `ContentRenderer` to enable
proper markdown rendering without coupling to Obsidian's API:

```typescript
type MarkdownRenderFn = (content: string, container: HTMLElement) => Promise<void>;

class ContentRenderer {
    constructor(
        settings: RenderSettings,
        private renderMarkdown?: MarkdownRenderFn
    ) {}
}
```

The plugin passes the callback when constructing the renderer:

```typescript
this.renderer = new ContentRenderer(this.settings.rendering, (content, container) =>
    MarkdownRenderer.render(this.app, content, container, "", this)
);
```

This keeps `ContentRenderer` testable (no Obsidian dependency) while enabling
proper markdown rendering.

**Changes:**

- `render.ts`: Accept optional callback in constructor, use in
  `renderMarkdownBlock` (fall back to `setText` if no callback provided)
- `main.ts`: Pass callback when constructing `ContentRenderer`

## Follow-up findings (future work)

These opportunities were identified during the review but are out of scope:

1. **Style manager injection** (`styles.ts`) -- Injects `<style>` into
   `document.head`. Could use CSS custom properties on `.chopro-container`
   elements instead, scoping overrides and removing global DOM manipulation.

2. **`ContentRenderer.render()` is bypassed** -- The code block processor
   calls `renderChoproBlock()` directly, skipping `render()`. In a future
   consolidation, `render()` could become the canonical entry point.

3. **Callout direct rendering (#71)** -- Callouts use
   `MarkdownRenderer.render()` causing a double rendering pass. #71 proposes
   rendering directly through the AST pipeline, enabling per-callout
   transposition.

4. **Transposition mutates AST in place** -- `ChoproTransposer` modifies the
   AST with no rollback. A future fix could clone the AST or use a transaction
   pattern.

5. **`ChoproFile.load()` uses Node fs** -- `parser.ts:896-899` bypasses
   Obsidian Vault API. Needs investigation to determine if dead code or
   production risk.
