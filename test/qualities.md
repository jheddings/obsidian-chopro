# Chord Quality Notation Tests

Test cases for alternative chord quality symbols and notations.

## Delta (Δ) for Major Quality
_Test coverage: Delta symbol for major chord quality_
```chopro
[CΔ]Traditional [FΔ]major [GΔ]delta [AmΔ]notation
[CΔ7]Major [FΔ7]seventh [BbΔ9]ninth [DΔ#11]sharp eleven
[CΔ7/E]Major [FΔ9/A]seventh [GΔ#11/B]slash [AmΔ13/C]chords
```

## Circle (o) for Diminished Quality
_Test coverage: Circle symbol for diminished chords_
```chopro
[Co]Diminished [Fo]circle [Go]notation [Ao]basic
[Co7]Diminished [F#o7]seventh [Bbo7]flat [Do7]seventh
[Co/E]Diminished [Fo7/A]slash [Go/B]bass [Ao7/C]notes
```

## Half-Diminished (ø) Symbol
_Test coverage: Half-diminished symbol for m7b5 quality_
```chopro
[Cø]Half [Fø]diminished [Gø]circle [Aø]basic
[Cø7]Half [F#ø7]diminished [Bbø7]seventh [Dø7]chords
[Cø/E]Half [Fø7/A]diminished [Gø/B]slash [Aø7/C]bass
```

## Plus (+) for Augmented Quality
_Test coverage: Plus symbol for augmented chords_
```chopro
[C+]Augmented [F+]plus [G+]symbol [A+]basic
[C+7]Augmented [F#+7]seventh [Bb+7]flat [D+7]chords
[C+/E]Augmented [F+7/A]slash [G+/B]bass [A+7/C]notes
```

## Mixed Alternative Notations
_Test coverage: Multiple alternative symbols in one line_
```chopro
[CΔ]Major [Fo]diminished [Gø]half-dim [A+]augmented
[CΔ7]Major [F#o7]dim7 [Bbø7]half-dim7 [D+7]aug7
[CΔ9/E]Complex [Fo7/A]mixed [Gø/B]alternative [A+add9/C#]notation
```

## With Extensions and Alterations
_Test coverage: Alternative symbols with complex extensions_
```chopro
[CΔ#11]Sharp [FΔb13]flat [GΔadd9]added [AΔsus4]suspended
[Co7b9]Diminished [F#o7#9]altered [Bbo7add11]extended [Do7sus2]suspended
[Cø7b9]Half-dim [Fø7#11]altered [Gø7add13]extended [Aø7sus4]suspended
[C+maj7]Aug [F#+9]major [G+add11]extended [A+sus4]suspended
```

## Unicode Mixed with Traditional
_Test coverage: Unicode accidentals with alternative chord qualities_
```chopro
[C♯Δ]Sharp [F♭o]flat [G♯ø]unicode [A♭+]mixed
[C♯Δ7]Major [F♭o7]diminished [G♯ø7]half-dim [A♭+7]augmented
[C♯Δ9/E♯]Complex [F♭o7/A♭]unicode [G♯ø/B♯]alternative [A♭+add9/C]notation
```

## Complex Real-World Examples
_Test coverage: Realistic chord progressions with alternative notations_
```chopro
[CΔ7]I've [Fo7]got [Gø7]sunshine [C+]on a cloudy day
[FΔ9]When it's [Co7]winter [Gø7]what can I [C+7]say
[AmΔ7]About my [Fo7/A]girl [Gø7/B]talking bout [C+/E]my girl

[CΔ]My [Aø7]girl [Dm7]don't [G7]care about [CΔ]me
[F#o7]She's got [Gø7]her [C+7]own [FΔ]philosophy
```
