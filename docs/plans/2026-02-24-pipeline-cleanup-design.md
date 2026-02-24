# Rendering Pipeline Cleanup

**Date:** 2026-02-24
**Scope:** Three independent cleanups identified during the metadata header investigation
**Branch:** `pipeline-cleanup` (from `main`)

## Goals

- Replace global `<style>` injection with CSS custom properties scoped to containers
- Consolidate rendering entry point so all block rendering goes through `renderBlock()`
- Move test-only `ChoproFile.load()` out of production code

## Design

### 1. Style Manager: CSS Custom Properties

**Problem:** `ChoproStyleManager` injects a `<style>` element into `document.head`
on every settings change. This is global DOM manipulation that persists outside the
plugin's lifecycle scope.

**Solution:** Set CSS custom properties on `.chopro-container` elements and use CSS
classes for boolean toggles. Move all configurable rules into `styles.css` using
`var()` with defaults.

**CSS variables (set on container element):**

- `--chopro-chord-color` (default: `#2563eb`)
- `--chopro-chord-size` (default: `1`)

**CSS classes (toggled on container element):**

- `.chopro-italic-annotations` -- enables `font-style: italic` on annotations
- `.chopro-superscript-mods` -- enables `vertical-align: top; font-size: 0.75em`
  on chord modifiers

**Affected rules in `styles.css`:**

```css
.chopro-chord,
.chopro-annotation {
    color: var(--chopro-chord-color, #2563eb);
    font-size: calc(var(--chopro-chord-size, 1) * 1em);
}

.chopro-line:has(.chopro-pair) {
    min-height: calc(1.5em + var(--chopro-chord-size, 1) * 1em);
}

.chopro-italic-annotations .chopro-annotation {
    font-style: italic;
}

.chopro-superscript-mods .chopro-chord-modifier {
    vertical-align: top;
    font-size: 0.75em;
}
```

**Changes:**

- `styles.ts`: Replace `applyStyles()` / `removeStyles()` with
  `applyToContainer(el, settings)`. Remove all `document.head` manipulation.
- `styles.css`: Add variable-driven rules. Remove any rules that were only needed
  for the injected `<style>` approach.
- `main.ts`: Call `applyToContainer()` in `processChoproBlock()` after creating the
  container div. Remove `applyStyles()` from `applySettings()` and `removeStyles()`
  from `onunload()`.
- `callout.ts`: Apply styles to callout containers via `applyToContainer()`.

### 2. ContentRenderer Entry Point Consolidation

**Problem:** `processChoproBlock()` in `main.ts` calls
`renderer.renderChoproBlock()` directly, bypassing the `renderBlock()` dispatcher.

**Solution:** Make `renderBlock()` public. Change `processChoproBlock()` to call
`renderer.renderBlock(block, container)`. This routes all rendering through the
dispatcher so any future shared pre/post logic applies consistently.

**Changes:**

- `render.ts`: Change `renderBlock()` visibility from private to public (it's
  currently already `async` with correct signature)
- `main.ts`: Change `renderer.renderChoproBlock(block, container)` to
  `await renderer.renderBlock(block, container)` in `processChoproBlock()`

### 3. Extract ChoproFile.load() to Test Helper

**Problem:** `ChoproFile.load()` uses `require("fs")` (Node API) which works in
Jest but is dead code in Obsidian's runtime. It lives in the production parser
class.

**Solution:** Move to a test helper.

- Delete `load()` from `ChoproFile` in `parser.ts`
- Create `test/helpers.ts` with a `loadChoproFile(path)` utility
- Update imports in `parser.test.ts`, `transpose.test.ts`, `convert.test.ts`

## Out of Scope

- Callout direct rendering (#71) -- separate effort
- Transposition AST mutation safety -- separate effort
