# ChoPro Callout Feature

The ChoPro plugin now supports a custom callout type `chopro` that allows you to transclude and render ChoPro songs with advanced features like flow control and key transposition.

## Basic Usage

Create a ChoPro callout by using the `[!chopro]` syntax with a link to your song file:

```markdown
> [!chopro] [[song-name]]
```

This will render the entire song file as ChoPro content.

## Features

### 1. Flow Control

Control which sections of a song are rendered and in what order using the `flow` property.

#### Enable Flow from Frontmatter

```markdown
> [!chopro] [[standard]]
> flow: on
```

This uses the `flow` array defined in the song file's frontmatter to determine the rendering order.

#### Custom Flow Array

```markdown
> [!chopro] [[standard]]
> flow:
>
> - "[[#Verse 1]]"
> - ">[!note] Key Change to D"
> - "[[#Verse 4]]"
```

This renders only the specified sections in the given order, including inline callouts for notes.

### 2. Key Transposition

Transpose the song to a different key:

```markdown
> [!chopro] [[standard]]
> key: G
```

This will transpose all chords in the song from the original key to G major.

### 3. Combined Features

You can combine flow control and transposition:

```markdown
> [!chopro] [[standard]]
> flow: on
> key: D
```

This will use the frontmatter flow and transpose to D major.

## Examples

### Example 1: Basic Song Inclusion

```markdown
> [!chopro] [[amazing-grace]]
```

Renders the entire "Amazing Grace" song file.

### Example 2: Custom Set List

```markdown
# Sunday Morning Set List

> [!chopro] [[amazing-grace]]
> flow:
>
> - "[[#Verse 1]]"
> - "[[#Verse 2]]"
> - ">[!note] Key change for harmony"
> - "[[#Verse 3]]"
>   key: G

> [!chopro] [[how-great-thou-art]]
> flow: on
> key: C
```

### Example 3: Practice Session

```markdown
# Guitar Practice - Key of D

> [!chopro] [[song1]]
> key: D

> [!chopro] [[song2]]  
> key: D

> [!chopro] [[song3]]
> key: D
```

## Flow Syntax

### Section References

- `"[[#Section Name]]"` - Renders the specified section from the song file
- Sections must exist as `## Section Name` headings in the target file

### Inline Callouts

- `">[!note] Message"` - Creates an inline callout/note
- `">[!tip] Practice slowly"` - Creates a tip callout
- Any Obsidian callout type is supported

### Plain Text

- `"Any other text"` - Renders as styled flow text

## Song File Structure

For flow to work properly, your song files should be structured like this:

````markdown
---
title: Amazing Grace
key: C
flow:
    - "[[#Verse 1]]"
    - "[[#Verse 2]]"
    - "[[#Verse 3]]"
    - ">[!note] Key Change"
    - "[[#Verse 4]]"
---

# Amazing Grace

## Verse 1

```chopro
[C]Amazing grace, how [F]sweet the [C]sound
That saved a [Am]wretch like [G]me
```
````

## Verse 2

```chopro
'Twas [C]grace that taught my [F]heart to [C]fear
And grace my [Am]fears rel[G]ieved
```

```

## Error Handling

The plugin will display helpful error messages if:

- The referenced file doesn't exist
- A section referenced in flow doesn't exist
- Invalid YAML syntax in flow arrays
- Invalid key names for transposition

## Styling

The callout content is styled with CSS classes:

- `.chopro-callout-container` - Main container
- `.chopro-flow-item` - Individual flow items
- `.chopro-flow-callout` - Inline callout items
- `.chopro-flow-text` - Plain text items
- `.chopro-callout-error` - Error messages

You can customize these in your CSS snippets or theme.
```
