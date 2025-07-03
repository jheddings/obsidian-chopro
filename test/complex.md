# Advanced Features Tests

Test cases for advanced chord patterns and edge cases.

## Seventh Chords
_Test coverage: major 7th, minor 7th, dominant 7th variations_
```chopro
[Cmaj7]Major [Dm7]minor [G7]dominant [Am7]seventh chords
[Bmaj7]Major [Em7]minor [A7]dominant [Fm7]variations
[C7]Simple [Cmaj7]major [Cm7]minor [C7sus4]suspended sevenths
```

## Extended Chords
_Test coverage: 9th, 11th, 13th chord extensions_
```chopro
[Cmaj9]Major [Dm9]minor [G9]dominant [Am9]ninth chords
[Cmaj9#11]Sharp [Dm9]natural [G9sus4]suspended [Am9]extensions
[C11]Eleventh [F11]chords [G11]with [Am11]various roots
[Cmaj13]Thirteenth [Dm13]extended [G13]dominant [Am13]chords
```

## Altered & Complex Extensions
_Test coverage: altered tensions, complex chord symbols_
```chopro
[G7alt]Altered [G7#9]sharp nine [G7b9]flat nine [G7#11]sharp eleven
[G7b13]Flat [G7#9b13]multiple [C7#9#11]alterations [F7alt]complex
[Cmaj7#5]Augmented [Dm7b5]half-diminished [G7#5]altered dominants
[Am7add11]Added [Fmaj7add9]tones [G7add13]without [Cadd9]extensions
```

## Slash Chords & Inversions
_Test coverage: bass notes, chord inversions, slash notation_
```chopro
[C/E]First [C/G]second [F/A]inversion [F/C]slash chords
[Dm/F]Minor [G/B]major [Am/C]slash [Em/G]bass notes
[Cmaj7/E]Extended [Dm9/F#]complex [G13/B]slash [Am11/C]combinations
[F/A]Simple [Bb/D]basic [Gm/Bb]minor [C/E]major inversions
```

## Suspended & Add Chords
_Test coverage: suspended 2nd, 4th, add tones_
```chopro
[Csus2]Second [Csus4]fourth [Fsus2]suspended [Gsus4]variations
[Cadd9]Add [Fadd9]nine [Gadd11]eleven [Amadd9]added tones
[Csus2add9]Combined [Fsus4add9]suspended [Gsus2add11]complex additions
[Dsus4]Simple [Dsus2]second [Dadd9]added [Dsus4add9]combined
```

## Diminished & Augmented
_Test coverage: diminished, half-diminished, augmented chords_
```chopro
[Cdim]Diminished [C#dim]sharp [Ddim]natural [D#dim]chromatic
[Cm7b5]Half [Dm7b5]diminished [Em7b5]minor [F#m7b5]variations
[C+]Augmented [F+]simple [G+]major [Bb+]augmented triads
[Cmaj7#5]Aug [Fmaj7#5]major [G7#5]dominant [Am7#5]augmented sevenths
```

## Unicode & Special Characters
_Test coverage: Unicode sharp/flat symbols, special characters_
```chopro
[C♯]Sharp [D♭]flat [F♯m]minor [G♭maj7]unicode symbols
[A♯dim]Sharp [B♭7]flat [C♯m7]minor [D♭maj9]extended unicode
[E♭sus4]Suspended [F♯add9]added [G♯m7b5]complex [A♭13]unicode chords
```
