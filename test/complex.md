# Advanced Features Tests

Test cases for advanced chord patterns and edge cases.

## Complex Chord Names & Modifiers
```chopro
[Am7]Seven [Bmaj7]major seven [C#dim]diminished
[F/A]Slash [G/B]chords [Dm/F#]with bass notes
[Csus4]Suspended [Dadd9]added tones [Em11]extensions
[F#m7b5]Half [G7alt]altered [Am9]nine chords
```

## Chord Positioning Edge Cases
```chopro
[C]Start of line
End of line [G]
[C][F][G] Multiple consecutive chords
[C]No[F]spaces[G]between[Am]words
[C]    Wide spacing    [F]test
```

## Advanced Features & Edge Cases
```chopro
[Cmaj9#11]Complex [Dm7add13]extended [G7alt]altered chords
[C]Start[F]No[G]Space[Am]Between consecutive chords
[C]  Wide  [F]  Spacing  [G]  Test
[C]	Tab[F]	Separated[G]	Chords
[C]                                                            [F]Wide gap
Line with no chords at all
[Em] [] [Dm] [G]
```
