# Basic Functionality Tests

Test cases for core ChoPro functionality.

## Simple Chord-Lyric Pairs
_Test coverage: basic major/minor chords with lyrics_
```chopro
[C]Amazing [F]grace how [G]sweet the sound
That [C]saved a [Am]wretch like [F]me[G]
[C]I once was [F]lost but [G]now am found
Was [C]blind but [Am]now I [F]see[C]
```

## Text Without Chords
_Test coverage: plain text lines mixed with chord lines_
```chopro
This line has no chords at all
Another plain text line
Mixed with [Ab]chord [F#]lines
Back to plain text
```

## Instrumental
_Test coverage: chord-only lines without lyrics_
```chopro
[C]     [F]     [G]     [C]
[Am]    [F]     [G]     [C]
```
