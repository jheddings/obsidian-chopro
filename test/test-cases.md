# ChoPro Plugin Test Cases

Test various ChoPro formatting scenarios to validate the plugin improvements.

## Basic Chord-Lyric Pairs

```chopro
{title: Amazing Grace}
{artist: Traditional}

[C]Amazing [F]grace how [G]sweet the sound
That [C]saved a [Am]wretch like [F]me[G]
[C]I once was [F]lost but [G]now am found
Was [C]blind but [Am]now I [F]see[C]
```

## Complex Chord Positioning

```chopro
{title: Chord Positioning Test}

[C]Word [F]after [G]word [Am]after [F]word
[C]Multiple[F]consecutive[G]chords[Am]test
[C]    Chord with spaces    [F]another
End[C]ing [F]with [G]chords[Am]
```

## Edge Cases

```chopro
{title: Edge Cases}

[C][F][G] Multiple chords at start
Text without chords at all
[C] Chord at beginning only
Ending with chord [C]
[C]Single[F]
[Am7]Complex [Bmaj7]chord [C#dim]names [F/A]with [G/B]modifiers
```

## Directives Test

```chopro
{title: Song Title Here}
{artist: Artist Name}
{album: Album Name}
{tempo: 120}
{key: C}
{capo: 2}

[C]Test song with various directives
```

## Escape Sequences

```chopro
{title: Escape Test}

This has \[brackets\] in the text
And \{braces\} too
Line with \\n newline escape
Tab\\t escape sequence
```

## Mixed Content

```chopro
{title: Mixed Content}

Verse:
[C]This is a [F]normal verse
[G]With chords [C]above

Chorus:
[F]This is the [C]chorus
[G]With different [C]chords

Bridge:
[Am]Instrumental [F]section
[G] [C] [F] [G]
```

## Nashville Numbers

```chopro
{title: Nashville Numbers Test}
{key: C}

[1]Amazing [4]grace how [5]sweet the sound
That [1]saved a [6m]wretch like [4]me[5]
[1]I once was [4]lost but [5]now am found
Was [1]blind but [6m]now I [4]see[1]
```

## Nashville Numbers with Extensions

```chopro
{title: Nashville Extensions}
{key: G}

[1]Basic [1maj7]major seven [17]dominant seven
[2m]Minor [2m7]minor seven [2m7b5]half diminished
[4]Subdominant [4maj7]four major seven
[5]Dominant [5sus4]five suspended [5add9]five add nine
[6m]Relative [6m7]minor seven [6m9]minor nine
```

## Mixed Nashville and Traditional Chords

```chopro
{title: Mixed Notation}
{key: A}

Verse (Nashville):
[1]When I [4]find my[5]self in [1]trouble
[6m]Mother [4]Mary [1/3]comes to [5]me

Chorus (Traditional):
[A]Speaking [D]words of [E]wisdom, [A]let it be
[F#m]Let it [D]be, [A/C#]let it [E]be
```

## Nashville Numbers Complex Progressions

```chopro
{title: Complex Nashville}
{key: F}

[1] [5/7] [6m] [6m/b3]
[4] [4/6] [1/3] [5]
[1]Circle of [5/2]fifths with [6m]slash [4/6]chords
[2m7b5]Complex [5alt]altered [1maj9]extensions
```
