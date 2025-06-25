# Directive Tests

Test cases for ChoPro directives (metadata and commands).

## Directives
```chopro
{title: Song Title Here}
{artist: Artist Name}
{album: Album Name}
{tempo: 120}
{key: C}
{capo: 2}
{verse}
{chorus}
{custom_field: Custom Value}
{another-directive: Another Value}
{no_value_directive}

[C]Test song with various [F]standard and [G]custom directives
```

## Directive Visibility Test
```chopro
{title: Directive Toggle Test}
{artist: Test Artist}
{key: C}

[C]This tests whether directives
[F]are shown or hidden based
[G]on the showDirectives [C]setting
```
