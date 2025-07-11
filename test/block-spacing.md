# Mixed Spacing Between `chopro` Blocks

Various spacing between ContentBlocks to ensure that the parser retains whitespace content.

## No Spacing

_There should not be a MarkdownBlock between these blocks_

```chopro
[C]Verse 1 line 1
[F]Verse 1 line 2
```
```chopro
[G]Verse 2 line 1
[Am]Verse 2 line 2
```

## Single Empty Line

_These blocks are separated by a single empty newline_

```chopro
[C]Verse 3 line 1
[F]Verse 3 line 2
```

```chopro
[G]Verse 4 line 1
[Am]Verse 4 line 2
```

## Multiple Empty Lines

_These blocks contain additional spacing between them_

```chopro
[C]Verse 5 line 1
[F]Verse 5 line 2
```



```chopro
[G]Verse 6 line 1
[Am]Verse 6 line 2
```


## Extra Markdown Spacing

_Making sure spacing with markdown is preserved_

```chopro
[C]Amazing [F]grace how [G]sweet the sound
That [C]saved a [Am]wretch like [F]me[G]
```


And some text after with multiple blank lines.



```chopro
[C]I [F]once was [G]lost but [C]now am [F]found
Was [C]blind but [G]now I [C]see
```


_This file intentionally ends with multiple blank lines_


