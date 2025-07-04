# Performance Tests

Test cases for performance validation with large content and complex songs featuring all available features and comprehensive edge cases.

## Intro

_Test coverage: complex chord structures, extended harmonies, annotations_

```chopro
[*Andante] [*pp] [Cmaj9#11]Lorem [Dm7add13]ipsum [G7alt]dolor [Am9]sit
[Em11]Amet [F#m7b5]consectetur [B7alt]adipiscing [Em7]elit
[Am7]Sed [Dm9]do [G13]eiusmod [Cmaj7/E]tempor [F6/9]incididunt
[Bb7#11]Ut [Am7]labore [Dm7]et [G7sus4]dolore [C]magna [*Crescendo]
```

## Verse 1

_Test coverage: standard chord progressions, slash chords, dynamics_

```chopro
[*Moderato] [C]Lorem [C/E]ipsum [F]dolor [F/A]sit [G]amet [G/B]consectetur
[Am]Adipiscing [Am/C]elit [F]sed [Fmaj7]do [G]eiusmod [G7]tempor
[C]Incididunt [C7]ut [F]labore [Fm]et [G]dolore [G7]magna [Am]aliqua
[Dm7]Ut [G7]enim [Em7]ad [Am7]minim [F]veniam [G]quis [C]nostrud

[C#dim]Exercitation [Dm]ullamco [Dm/F]laboris [G]nisi [Gsus4]ut [G]aliquip
[Am]Ex [Am7]ea [F]commodo [Fmaj7]consequat [G]duis [G7]aute [C]irure
[C/E]Dolor [F]in [F#dim]reprehenderit [G]in [Am]voluptate [Am7]velit
[Dm]Esse [G]cillum [Em]dolore [Am]eu [F]fugiat [G]nulla [C]pariatur [*mf]
```

## Chorus 1

_Test coverage: consecutive chords, spacing edge cases, special characters_

```chopro
[*Forte] [C]Excepteur [Cmaj7]sint [F]occaecat [Fmaj7]cupidatat [G]non [G7]proident
[Am]Sunt [Am7]in [F]culpa [F6]qui [G]officia [G7]deserunt [C]mollit
[C7]Anim [F]id [F/A]est [G]laborum [G/B]sed [Am]ut [Am/C]perspiciatis
[Dm]Unde [G]omnis [Em]iste [Am]natus [F]error [G]sit [C]voluptatem [*Crescendo]

[C][F][G][Am] [Dm][G][Em][Am] Lorem ipsum consecutive chords
[C]No[F]space[G]between[Am]words [Dm]testing [G]edge [Em]cases [Am]here
[C]    Wide    [F]    spacing    [G]    test    [Am]    pattern
[C]	Tab[F]	separated[G]	chord[Am]	positioning [*ff]
```

## Verse 2

_Test coverage: diminuendo dynamics, major 7th chords, chromatic movements_

```chopro
[*Diminuendo] [Bbmaj7]Lorem [Am7]ipsum [Dm7]dolor [G7]sit
[C]Amet [C/E]consectetur [F]adipiscing [F/A]elit [G]sed [G/B]do
[Am]Eiusmod [Am/C]tempor [F]incididunt [Fmaj7]ut [G]labore [G7]et
[C]Dolore [C7]magna [F]aliqua [Fm]ut [G]enim [G7]ad [Am]minim

[Dm7]Veniam [G7]quis [Em7]nostrud [Am7]exercitation [F]ullamco [G]laboris
[C]Nisi [C#dim]ut [Dm]aliquip [Dm/F]ex [G]ea [Gsus4]commodo [G]consequat
[Am]Duis [Am7]aute [F]irure [Fmaj7]dolor [G]in [G7]reprehenderit
[C]In [C/E]voluptate [F]velit [F#dim]esse [G]cillum [Am]dolore [*mp]
```

## Bridge

_Test coverage: bridge section, sostenuto articulation, rallentando_

```chopro
[*Sostenuto] [*p] [Em]Lorem [Em7]ipsum [Am]dolor [Am7]sit [Dm]amet [Dm7]consectetur
[G]Adipiscing [G7]elit [C]sed [Cmaj7]do [F]eiusmod [Fmaj7]tempor
[Em]Incididunt [Em7]ut [Am]labore [Am7]et [Dm]dolore [Dm7]magna
[G]Aliqua [G7]ut [C]enim [C7]ad [F]minim [G]veniam [C]quis [*Rallentando]

[Am]Nostrud [F]exercitation [C]ullamco [G]laboris [Am]nisi [F]ut
[Dm]Aliquip [Am]ex [Bb]ea [F]commodo
[G]Consequat [Am]duis [F]aute [G]irure [C]dolor [*Begin fade]
{end_of_bridge}
```

## Verse 3

_Test coverage: accelerando, complex extended chords, empty brackets, wide spacing_

```chopro
[*Allegro] [*mf] [C]Lorem [Cmaj9]ipsum [F]dolor [Fadd9]sit [G]amet [G13]consectetur
[Am9]Adipiscing [Em11]elit [F#m7b5]sed [B7alt]do [Em7]eiusmod
[Am7]Tempor [Dm9]incididunt [G13]ut [Cmaj7/E]labore [F6add9]et [Bb7#11]dolore
[Am7]Magna [Dm7]aliqua [G7sus4]ut [C]enim [*Accelerando]

[] [F] [G] Lorem ipsum empty brackets
[Em] [Am] [Dm] [G] ipsum dolor sit
[C]                                                            [F]lorem ipsum
Lorem ipsum dolor sit amet consectetur adipiscing elit
[Cmaj7#5]Lorem [Dm6add9]ipsum [G7#9b13]dolor [Am7add11]sit [*Fortissimo]
```

## Chorus 2

_Test coverage: vivace tempo, chorus variations, crescendo builds_

```chopro
[*Vivace] [C]Lorem [C/E]ipsum [F]dolor [F/A]sit [G]amet [G/B]consectetur
[Am]Adipiscing [Am/C]elit [F]sed [Fmaj7]do [G]eiusmod [G7]tempor
[C]Incididunt [C7]ut [F]labore [Fm]et [G]dolore [G7]magna [Am]aliqua
[Dm7]Ut [G7]enim [Em7]ad [Am7]minim [F]veniam [G]quis [C]nostrud

[*Begin crescendo] [C#dim]Exercitation [Dm]ullamco [Dm/F]laboris [G]nisi [Gsus4]ut [G]aliquip
[Am]Ex [Am7]ea [F]commodo [Fmaj7]consequat [G]duis [G7]aute
[C]Irure [C/E]dolor [F]in [F#dim]reprehenderit [G]in [Am]voluptate [Am7]velit
[Dm]Esse [G]cillum [Em]dolore [Am]eu [F]fugiat [G]nulla [C]pariatur [*ff]
```

## Outro

_Test coverage: outro section, ritardando, fade effects, fine marking_

```chopro
[*Ritardando] [*Begin fade] [C]Lorem [Cmaj7]ipsum [F]dolor [Fmaj7]sit
[G]Amet [G7]consectetur [Am]adipiscing [Am7]elit [F]sed [F6]do
[G]Eiusmod [G7]tempor [C]incididunt [C7]ut [F]labore [F/A]et
[G]Dolore [G/B]magna [Am]aliqua [Am/C]ut [Dm]enim [G]ad [*Diminuendo]

[Em]Minim [Am]veniam [F]quis [C]nostrud [G]exercitation [Am]ullamco
[F]Laboris [C]nisi [G]ut [C]aliquip [*pp]
[C]Ex [F]ea [G]commodo [*Ritardando] [Am]consequat [*ppp]
[F]Duis [G]aute [C]irure [*Fine]
```
