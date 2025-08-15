# Flow System

The ChoPro plugin includes a powerful flow system for organizing and reusing song content across different files. This feature allows you to define the structure of a song in one file and then insert that flow into other documents.

## Overview

The flow system works by defining a `flow` property in your song files' frontmatter, which can then be processed in two ways:

1. **Insert Command**: Use the "Insert flow content from file" command to insert flow content directly into your current document
2. **Callout Flow**: Use ChoPro callouts with flow control to render flow content dynamically

## Setting Up Flow Files

Add a `flow` property to your song files' frontmatter. The flow can be either a string or an array:

### String Flow

```yaml
---
title: Simple Song
flow: "This is direct content to insert"
---
```

### Array Flow

```yaml
---
title: Amazing Grace
flow:
  - "![[#Verse 1]]"
  - "![[#Verse 2]]"
  - "![[#Verse 3]]"
  - ">[!note] Key Change"
  - "![[#Verse 4]]"
---
```

## Flow Item Types

### Section References

Items starting with `![[#` create transclusion links to sections in the current file:

- `"![[#Verse 1]]"` becomes `![[filename#Verse 1]]`
- These will display the actual section content inline when rendered
- The section must exist as a heading (e.g., `## Verse 1`) in the file

### Inline Callouts

Items starting with `>[!` create inline Obsidian callouts:

- `">[!note] Key Change"` creates a note callout
- `">[!tip] Practice slowly"` creates a tip callout
- Any valid Obsidian callout type is supported

### Plain Text

Any other text is inserted literally:

- `"Repeat chorus twice"` appears exactly as written

## Using the Insert Flow Command

The "Insert flow content from file" command allows you to insert processed flow content directly into your current document:

1. Place your cursor where you want to insert the content
2. Run the command via the Command Palette
3. Select a file that has a `flow` property in its frontmatter
4. The flow content will be inserted at your cursor position

### Command Behavior

- **Section references** are converted to full embed links: `![[filename#Section]]`
- **Inline callouts** and **plain text** are inserted as-is
- Only files with a `flow` property in their frontmatter appear in the file selector
- Inserted content preserves Obsidian's transclusion system for live updates

### Example

Given a file `amazing-grace.md` with this frontmatter:

```yaml
---
flow:
  - "![[#Verse 1]]"
  - ">[!note] Key change for harmony"
  - "![[#Verse 2]]"
---
```

The insert command would generate:

```markdown
![[amazing-grace#Verse 1]]
>[!note] Key change for harmony
![[amazing-grace#Verse 2]]
```

## Using Flow with Callouts

ChoPro callouts can use the flow system for dynamic rendering. See [callout.md](callout.md) for details on callout-specific flow features.

## Configuration

Flow behavior can be configured in the plugin settings:

- **Song Folder**: Limit file selection to a specific folder (e.g., "Songs/")
- **Extra Line**: Add extra spacing between flow items when inserting

## Best Practices

### File Organization

Structure your song files with clear headings:

```markdown
---
title: Song Title
flow:
  - "![[#Verse 1]]"
  - "![[#Chorus]]"
  - "![[#Verse 2]]"
  - "![[#Chorus]]"
---

# Song Title

## Verse 1

```chopro
[C]Lyrics with [F]chords
```

## Chorus

```chopro
[G]Chorus lyrics [C]here
```
```

### Flow Design

- Use descriptive section names that match your headings exactly
- Include performance notes as inline callouts
- Keep flow arrays logical and easy to follow
- Test your flow with both insert command and callouts

### Set Lists and Practice Sheets

Flow is particularly useful for creating:

- **Set lists**: Combine multiple songs with custom flow
- **Practice sheets**: Focus on specific sections
- **Service planning**: Include notes and key changes
- **Teaching materials**: Break down songs into learnable parts

## Troubleshooting

### Common Issues

- **"Selected file has no flow"**: The file doesn't have a `flow` property in its frontmatter
- **Missing sections**: Section names in flow don't match headings in the file (case-sensitive)
- **Empty output**: Sections exist but contain no content

### Debugging

- Check that section names exactly match heading text
- Ensure proper YAML formatting in frontmatter
- Verify that target files exist and are accessible
- Use the developer console to see detailed error messages

## Examples

### Simple Song Structure

```yaml
---
title: Simple Hymn
flow:
  - "![[#Verse 1]]"
  - "![[#Chorus]]"
  - "![[#Verse 2]]"
  - "![[#Chorus]]"
---
```

### Complex Arrangement

```yaml
---
title: Complex Song
flow:
  - "![[#Intro]]"
  - "![[#Verse 1]]"
  - "![[#Chorus]]"
  - ">[!note] Guitar solo"
  - "![[#Verse 2]]"
  - "![[#Chorus]]"
  - ">[!tip] Slow down for ending"
  - "![[#Outro]]"
---
```

### Multi-Part Song

```yaml
---
title: Medley
flow:
  - ">[!info] Part 1 - Amazing Grace"
  - "![[#Amazing Grace Verse 1]]"
  - "![[#Amazing Grace Chorus]]"
  - ">[!info] Part 2 - How Great Thou Art"
  - "![[#How Great Verse 1]]"
  - "![[#How Great Chorus]]"
---
```
