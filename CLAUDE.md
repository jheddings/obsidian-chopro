# CLAUDE.md - obsidian-chopro

Obsidian plugin for rendering ChordPro format chord sheets. Parses bracketed
chord notation (e.g. `[Am]`) within `chopro` code blocks and renders them with
accurate chord-to-lyric alignment. Supports transposition, Nashville number
notation, flow-based song organization, and callout-driven rendering.

## Architecture

Source files live in `src/`, each with a single responsibility:

- **main.ts** - Plugin lifecycle (`onload`/`onunload`), command registration,
  settings persistence, markdown processor registration
- **config.ts** - Settings interfaces only (`RenderSettings`, `FlowSettings`,
  `ChoproPluginSettings`); no logic
- **settings.ts** - Settings UI using tabbed pages (obskit `SettingsTabPage`)
- **parser.ts** - Core AST: tokenizes ChordPro source into segment/line/block
  hierarchy; YAML frontmatter parsing
- **music.ts** - Music theory: `AbstractNote` hierarchy (`MusicNote`,
  `NashvilleNumber`), `KeyInfo` hierarchy, note/chord utilities
- **render.ts** - `ContentRenderer`: walks AST and produces HTML DOM elements
- **transpose.ts** - Transposition: `ChoproTransposer` walks AST, delegates to
  `NoteTransposer` / `NashvilleTransposer` for interval-based note shifting
- **convert.ts** - `ChordLineConverter`: converts chord-over-lyrics format to
  bracketed `[chord]` notation
- **flow.ts** - `FlowManager`: resolves transclusion references (`![[...]]`),
  manages file embeds for setlists and song structure
- **callout.ts** - `CalloutProcessor`: processes `[!chopro]` callouts with YAML
  feature extraction
- **styles.ts** - `ChoproStyleManager`: dynamic CSS injection based on settings
- **modals.ts** - `TransposeModal`, `FlowFileSelector`: user input dialogs

### Key Design Patterns

- **AST-based pipeline**: Source -> Parser (AST) -> Renderer (DOM). All
  transformations (transpose, convert) operate on the AST, not raw text.

- **Abstract base + static factory**: Type hierarchies use abstract base classes
  with static `parse()` and `test()` methods for construction. Pattern:
  `if (ClassName.test(input)) return ClassName.parse(input)`.

- **Strategy pattern** in transposition: `NoteTransposer` and
  `NashvilleTransposer` implement different transposition strategies.
  `ChoproTransposer` walks the AST and delegates to the appropriate transposer.

- **Observer-like settings**: `applySettings()` recreates renderer, flow
  manager, and style manager whenever settings change. Settings persist
  immediately; there is no apply/cancel pattern.

- **Segment hierarchy** for parsed elements: `LineSegment` base with
  `TextSegment`, `BracketChord`, `ChordSegment` (letter/nashville), and
  `Annotation` subtypes.

- **Line hierarchy** for parsed lines: `ChoproLine` base with `EmptyLine`,
  `TextLine`, `DirectiveLine`, `CommentLine`, `ChordLine`, `ChordLyricsLine`,
  and `InstrumentalLine` subtypes.

### Settings Management

Settings use nested interfaces (`rendering`, `flow`, `logLevel`). When loading
persisted data, a deep merge with `DEFAULT_SETTINGS` is required to handle new
or restructured settings across plugin versions. Shallow `Object.assign` is
insufficient for nested objects.

When modifying settings interfaces, always update `DEFAULT_SETTINGS` in main.ts
to ensure backwards compatibility with existing user data.

## Dependencies

- **obskit** (production) - Logger, settings UI base classes (`SettingsTabPage`,
  typed setting controls). Shared library across Obsidian plugins.
- **yaml** (production) - YAML parsing for frontmatter and callout features.
- **obsidian** (dev/external) - Obsidian API, externalized from the bundle.

## Build & Tooling

| Command         | Purpose                                    |
| --------------- | ------------------------------------------ |
| `npm run dev`   | Watch mode with inline sourcemaps          |
| `npm run build` | Type-check (`tsc -noEmit`) + prod bundle   |
| `npx jest`      | Run test suite                             |

- **Bundler**: esbuild targeting ES6, CommonJS output to `main.js`
- **Externals**: obsidian, electron, @codemirror/\*, @lezer/\*, builtin-modules
- **Pre-commit hooks**: husky + lint-staged runs prettier --check and eslint
- **Test framework**: Jest with ts-jest; tests live in `test/`

## Code Conventions

- **Formatting**: Prettier (no semicolons)
- **Linting**: ESLint with TypeScript parser; curly braces always required
- **Logging**: one `Logger.getLogger("moduleName")` per module; global level
  controlled via settings
- **Unused params**: underscore prefix (`_editor`)

## Testing

Tests live in `test/` and use Jest with `ts-jest`. The `test/__mocks__/`
directory contains mocks for external dependencies (obskit). Tests use
`test.each()` for property-based patterns.

When adding new parsing or transposition logic, add corresponding test cases.
The parser and music theory modules have the most comprehensive coverage.

## Workflow Guardrails

- **Never push directly to `main`**. Create a feature branch or use a worktree
  based on `main` for all changes.
- **Do not use git worktrees when already on a feature branch**. Worktrees are
  for isolating new work from `main`; feature branches are already isolated.
- **Run `npm run build` before committing** to catch type errors. The build
  includes `tsc -noEmit` for type checking.
- **Run tests (`npx jest`) before marking work complete**. Ensure existing tests
  pass and new logic has test coverage where applicable.
- **Pre-commit hooks enforce formatting and linting**. If a commit is rejected,
  fix the issues rather than bypassing hooks.
- **Do not commit `main.js` or `data.json`**. The bundle is a build artifact
  and `data.json` contains local user settings.

## Best Practices

- Keep single-responsibility per file; avoid adding subdirectories unless source
  count grows significantly.
- New notation systems should extend `AbstractNote`; new line types should
  extend `ChoproLine`. Follow the existing hierarchy patterns.
- All transformations (transpose, convert) should operate on the AST, never on
  raw text strings.
- Error handling at the plugin level: processors catch errors and show `Notice`
  to the user or render error divs gracefully.
- Chord positioning uses CSS absolute positioning (`.chopro-pair .chopro-chord`);
  avoid JavaScript-based layout calculations.
