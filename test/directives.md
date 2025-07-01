# Directive Tests

Test cases for ChoPro directives (metadata and commands).

## Metadata Directives
```chopro
{title: Song Title Here}
{artist: Artist Name}
{album: Album Name}
{tempo: 120}
{key: C}
{capo: 2}

[C]Test song with various [F]metadata [G]directives
```

## Custom Directives
```chopro
{x_custom_field: Custom Value}
{x_custom_tag}
{x_version: 1.0}

[Am]Song with custom [F]directives at the [C]top
[G]These should be parsed but not [Am]interfere with rendering
```

## Environment Directives (Song Structure)
```chopro
{title: Song Structure Test}
{artist: Structure Tester}

{start_of_verse}
[C]This is the first verse [F]line
[G]Second line of the [Am]verse
[C]Third line with [F]chords [G]throughout
{end_of_verse}

{start_of_chorus}
[F]This is the chorus [C]everyone sings
[G]Catchy melody [Am]that really rings
[F]Repeat this part [C]over and [G]over
{end_of_chorus}

{start_of_verse}
[C]Second verse has [F]different words
[G]But the same [Am]melody
[C]Building up to the [F]chorus [G]return
{end_of_verse}

{start_of_bridge}
[Am]Bridge section [F]changes things up
[C]Different progression [G]here
[Am]Before we go [F]back to what we [C]know [G]
{end_of_bridge}
```

## Directives After Content
```chopro
[C]This song has directives [F]mixed throughout
[G]The lyrics come [Am]first

{comment: This is a mid-song comment}
{x_section: verse}

[C]More lyrics after [F]directives
[G]Should still parse [Am]correctly

{x_performance_note: Play softly here}
{tempo: 140}
```

## Mixed Standard and Custom
```chopro
{title: Mixed Directive Test}
{x_custom_start: Beginning}

[C]Opening [F]line
{artist: Test Artist}
{x_mid_song: Middle directive}

[G]Second [Am]verse
{key: G}
{x_custom_end: Ending}
```
