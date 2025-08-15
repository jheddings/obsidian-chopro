# ChoPro Callout Feature

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

## How Flow Content is Processed

When flow is enabled, the callout processor:

1. **Resolves section references**: `![[#Section]]` items extract and include the actual section content
2. **Processes inline callouts**: `>[!note] Text` items create proper Obsidian callouts
3. **Includes plain text**: Other items are rendered as styled text
4. **Handles missing content**: Shows warnings for missing files or sections

## Song File Structure

For flow to work properly, your song files should be structured like this:

````markdown
---
title: Amazing Grace
key: C
flow:
  - "![[#Verse 1]]"
  - "![[#Verse 2]]"
  - ">[!note] Key Change"
  - "![[#Verse 3]]"
---

# Amazing Grace

## Verse 1

```chopro
[C]Amazing grace, how [F]sweet the [C]sound
That saved a [Am]wretch like [G]me
```

## Verse 2

```chopro
'Twas [C]grace that taught my [F]heart to [C]fear
And grace my [Am]fears rel[G]ieved
```
````

## Error Handling

The plugin will display helpful error messages if:

- The referenced file doesn't exist
- A section referenced in flow doesn't exist
- Invalid YAML syntax in the callout content

## Styling

The callout content is styled with CSS classes:

- `.chopro-callout-container` - Main container
- `.chopro-flow-item` - Individual flow items
- `.chopro-flow-callout` - Inline callout items
- `.chopro-flow-text` - Plain text items
- `.chopro-callout-error` - Error messages

You can customize these in your CSS snippets or theme.

## Related Features

- **Flow System**: See [flow.md](flow.md) for detailed information about the flow system and the "Insert flow content from file" command
- **Transpose Command**: Use the "Transpose chords in current file" command to transpose entire files between keys
```
