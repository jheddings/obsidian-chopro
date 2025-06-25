# ChoPro Plugin Test Cases

Comprehensive test cases to validate all features of the ChoPro Obsidian plugin.

## Basic Functionality

### Simple Chord-Lyric Pairs
```chopro
{title: Amazing Grace}
{artist: Traditional}

[C]Amazing [F]grace how [G]sweet the sound
That [C]saved a [Am]wretch like [F]me[G]
[C]I once was [F]lost but [G]now am found
Was [C]blind but [Am]now I [F]see[C]
```

### Text Without Chords
```chopro
{title: Plain Text Test}

This line has no chords at all
Another plain text line
Mixed with [C]chord [F]lines
Back to plain text
```

## Chord Processing Features

### Complex Chord Names & Modifiers
```chopro
{title: Chord Modifiers Test}

[Am7]Seven [Bmaj7]major seven [C#dim]diminished
[F/A]Slash [G/B]chords [Dm/F#]with bass notes
[Csus4]Suspended [Dadd9]added tones [Em11]extensions
[F#m7b5]Half [G7alt]altered [Am9]nine chords
```

### Chord-Only Lines (Instrumental)
```chopro
{title: Instrumental Section}

Verse:
[C]Amazing [F]grace

Instrumental:
[C] [F] [G] [Am]
[F] [C/E] [Dm] [G]

Bridge:
[Am]That saved [F]a wretch
```

### Chord Positioning Edge Cases
```chopro
{title: Chord Positioning}

[C]Start of line
End of line [G]
[C][F][G] Multiple consecutive chords
[C]No[F]spaces[G]between[Am]words
[C]    Wide spacing    [F]test
```

## Nashville Number System

### Basic Nashville Numbers
```chopro
{title: Nashville Numbers}
{key: C}

[1]Amazing [4]grace how [5]sweet the sound
That [1]saved a [6m]wretch like [4]me[5]
[1]I once was [4]lost but [5]now am found
Was [1]blind but [6m]now I [4]see[1]
```

### Nashville with Extensions & Slash Chords
```chopro
{title: Advanced Nashville}
{key: G}

[1maj7]Major seven [2m7]minor seven [17]dominant
[4]Sub [4/6]slash [1/3]inversions [5/7]bass notes
[2m7b5]Half dim [5alt]altered [6m9]extensions
```

### Mixed Nashville & Traditional Notation
```chopro
{title: Mixed Notation}
{key: A}

Nashville: [1]When I [4]find my[5]self
Traditional: [A]Speaking [D]words of [E]wisdom
```

## Directive Processing

### Standard Directives
```chopro
{title: Song Title Here}
{artist: Artist Name}
{album: Album Name}
{tempo: 120}
{key: C}
{capo: 2}

[C]Test song with various directives
```

### Directives Without Values
```chopro
{verse}
{chorus}
{bridge}

[C]Section markers without values
```

### Custom Directives
```chopro
{custom_field: Custom Value}
{another-directive: Another Value}
{no_value_directive}

[C]Testing custom directive support
```

## Settings Validation Tests

### Chord Color & Size Variations
```chopro
{title: Style Test}

[C]These [F]chords [G]should
[Am]reflect [F]current [C]settings
For [Dm]color [G]and [C]size
```

### Superscript Modifier Test
```chopro
{title: Modifier Display Test}

[Cmaj7]Major [Dm7]minor [G7]dominant
[Am7b5]Half [F#dim7]diminished [Bb13]thirteenth
[Esus4]Suspended [Aadd9]added [Bm11]eleventh
```

### Directive Visibility Test
```chopro
{title: Directive Toggle Test}
{artist: Test Artist}
{key: C}

[C]This tests whether directives
[F]are shown or hidden based
[G]on the showDirectives [C]setting
```
