# Chord Processing Tests

Test cases for chord parsing, positioning, and complex chord notation.

## Complex Chord Names & Modifiers
```chopro
[Am7]Seven [Bmaj7]major seven [C#dim]diminished
[F/A]Slash [G/B]chords [Dm/F#]with bass notes
[Csus4]Suspended [Dadd9]added tones [Em11]extensions
[F#m7b5]Half [G7alt]altered [Am9]nine chords
```

## Chord-Only Lines (Instrumental)
```chopro
Verse:
[C]Amazing [F]grace

Instrumental:
[C] [F] [G] [Am]
[F] [C/E] [Dm] [G]

Bridge:
[Am]That saved [F]a wretch
```

## Chord Positioning Edge Cases
```chopro
[C]Start of line
End of line [G]
[C][F][G] Multiple consecutive chords
[C]No[F]spaces[G]between[Am]words
[C]    Wide spacing    [F]test
```
