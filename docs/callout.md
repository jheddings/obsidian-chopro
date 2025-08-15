# ChoPro Callouts

The ChoPro plugin supports a custom callout type `chopro` that allows you to transclude and render ChoPro songs with advanced flow control features.

## Basic Usage

Create a ChoPro callout by using the `[!chopro]` syntax with a link to your song file:

```markdown
> [!chopro] [[song-name]]
```

This will render the entire song file as ChoPro content.

## Flow Control

Control which sections of a song are rendered and in what order using the `flow` property.

### Enable Flow from Frontmatter

```markdown
> [!chopro] [[standard]]
> flow: on
```

When `flow: on` is specified and the target file has a `flow` property in its frontmatter, the callout will render the content according to the flow definition instead of showing the entire file.

### Disable Flow

```markdown
> [!chopro] [[standard]]
> flow: off
```

When `flow: off` is specified (or when no flow property is provided), the callout renders the entire file content, ignoring any flow definition.

### Default Behavior

If no flow property is specified in the callout, flow is enabled by default. This means:

- If the target file has flow frontmatter, it will be used
- If the target file has no flow frontmatter, the entire file is rendered

## Examples

### Example 1: Basic Song Inclusion

```markdown
> [!chopro] [[amazing-grace]]
```

Renders the entire "Amazing Grace" song file.

### Example 2: Using Flow Control

```markdown
# Sunday Morning Set List

> [!chopro] [[amazing-grace]]
> flow: on
```

This renders the song using its frontmatter flow definition.

### Example 3: Disabling Flow

```markdown
> [!chopro] [[amazing-grace]]
> flow: off
```

This renders the entire file content, ignoring any flow definition.

### Example 4: Mixed Set List

```markdown
# Practice Session

> [!chopro] [[song-with-flow]]
> flow: on

> [!chopro] [[simple-song]]
> flow: off
```

## Styling

The callout content is styled with CSS classes:

- `.chopro-callout-container` - Main container
- `.chopro-flow-item` - Individual flow items
- `.chopro-flow-callout` - Inline callout items
- `.chopro-flow-text` - Plain text items
- `.chopro-callout-error` - Error messages

You can customize these in your CSS snippets or theme.

## Related Features

- **Flow System**: See [flow.md](flow.md) for detailed information about the flow system and how content is processed
- **Transpose Command**: Use the "Transpose chords in current file" command to transpose entire files between keys
