# Error Handling & Special Cases

Test cases for error handling, malformed input, and special cases.

## Error Handling & Special Cases
```chopro
[C]Normal [F]chord []Empty bracket [G]recovery
[C]Good [invalid chord notation]Bad [G]Good again
[[Double]brackets] [C]recovery test
[C]Testing [F♯]unicode [G♭]sharp [A♭]flat symbols
[C]Café [F]naïve [G]résumé [Am]piñata lyrics

{empty_directive}
{directive_with_colon:}
{directive:with:multiple:colons}
(Empty instruction line test)
()

Another plain line
[C] [F] [G] [Am]
(Another instruction)
Final [C]chord [F]line
```

## Comment Handling
```chopro
# This is a single hash comment
## Double hash comment
### Triple hash comment
#    Comment with spaces after hash
#No space after hash
# Comment with [C]chord notation inside
# Comment with {directive:value} inside

[C]Verse with [F]chords
# Another comment in the middle
[G]More chords [Am]here
# Final comment at the end
```
