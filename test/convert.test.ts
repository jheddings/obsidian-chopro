// convert.test.ts - unit tests for converter.ts

import { ChordLineConverter } from '../src/convert';
import { TextLine, ChordLyricsLine, InstrumentalLine, EmptyLine } from '../src/parser';

describe('ChordLineConverter', () => {
    describe('combine', () => {

        const lyricsOnlyCases = [
            {
                chords: "    ",
                lyrics: "No chords here.",
            },
            {
                chords: "",
                lyrics: "Lyrics only.",
            }
        ];

        test.each(lyricsOnlyCases)(
            'should handle lyrics only lines -- $lyrics',
            ({ chords, lyrics }) => {
                const chordLine = new TextLine(chords);
                const lyricLine = new TextLine(lyrics);

                const converter = new ChordLineConverter();
                const result = converter.combine(chordLine, lyricLine);

                expect(result).toBeDefined();
                expect(result).toBeInstanceOf(TextLine);
                expect(result?.toString()).toBe(lyrics);
            }
        );

        const instrumentalCases = [
            {
                chords: "C    G    Am    F",
                lyrics: "",
                expected: "[C]    [G]    [Am]    [F]"
            },
            {
                chords: "Dm   F   C   G",
                lyrics: "   ",
                expected: "[Dm]   [F]   [C]   [G]"
            }
        ];

        test.each(instrumentalCases)(
            'should parse instrumental line -- $expected',
            ({ chords, lyrics, expected}) => {
                const chordLine = new TextLine(chords);
                const lyricLine = new TextLine(lyrics);

                const converter = new ChordLineConverter();
                const result = converter.combine(chordLine, lyricLine);

                expect(result).toBeDefined();
                expect(result).toBeInstanceOf(InstrumentalLine);
                expect(result?.toString()).toBe(expected);
            }
        );

        const combineTestCases = [
            {
                chords: "      D          G    D",
                lyrics: "Basic chord line with lyrics.",
                expected: "Basic [D]chord line [G]with [D]lyrics.",
            },
            {
                chords: "            Rit.           A7",
                lyrics: "Final line, slowing to a close.",
                expected: "Final line, [*Rit.]slowing to a cl[A7]ose.",
            },
            {
                chords: "D",
                lyrics: "  Delayed lyrics.",
                expected: "[D]  Delayed lyrics.",
            },
            {
                chords: "                       D  G  C",
                lyrics: "Chord after all lyrics.",
                expected: "Chord after all lyrics.[D]  [G]  [C]",
            },
            {
                chords: "   F#     Bm",
                lyrics: "Misaligned test.",
                expected: "Mis[F#]aligned[Bm] test.",
            },
            {
                chords: "G\t\tC    D",
                lyrics: "Tabs and spaces.",
                expected: "[G]Tab[C]s and[D] spaces.",
            },
            {
                chords: "A#   F#m7b5   *Pause",
                lyrics: "Special chords here.",
                expected: "[A#]Speci[F#m7b5]al chords[*Pause] here.",
            }
        ];

        test.each(combineTestCases)(
            'should combine lines -- $expected',
            ({ chords, lyrics, expected }) => {
                const chordLine = new TextLine(chords);
                const lyricLine = new TextLine(lyrics);

                const converter = new ChordLineConverter();
                const result = converter.combine(chordLine, lyricLine);

                expect(result).toBeDefined();
                expect(result).toBeInstanceOf(ChordLyricsLine);
                expect(result?.toString()).toBe(expected);
            }
        );

    });

    describe('convertLines', () => {
        const convertLinesTestCases = [
            {
                description: 'does not change multiple lines with lyrics',
                inputLines: [
                    "There are no chords here,",
                    "just some lyrics to test.",
                    "Even if A line has G chord-like text."
                ],
                expectedLength: 3,
                expectedTypes: [TextLine, TextLine, TextLine],
                expectedResults: [
                    "There are no chords here,",
                    "just some lyrics to test.",
                    "Even if A line has G chord-like text."
                ]
            },
            {
                description: 'converts line pairs to a single ChordLyricsLine',
                inputLines: [
                    "      D          G    D",
                    "Basic chord line with lyrics."
                ],
                expectedLength: 1,
                expectedTypes: [ChordLyricsLine],
                expectedResults: ["Basic [D]chord line [G]with [D]lyrics."]
            },
            {
                description: 'converts subsequent chord lines to Instrumentals',
                inputLines: [
                    "C    G    Am    F",
                    "C    G    F     F",
                    "C              G            Am            F  ",
                    "I woke up to the sound of rain upon the window"
                ],
                expectedLength: 3,
                expectedTypes: [InstrumentalLine, InstrumentalLine, ChordLyricsLine],
                expectedResults: [
                    "[C]    [G]    [Am]    [F]",
                    "[C]    [G]    [F]     [F]",
                    "[C]I woke up to th[G]e sound of ra[Am]in upon the wi[F]ndow"
                ]
            },
            {
                description: 'preserves empty lines',
                inputLines: [
                    "C         D",
                    "  Opening lyrics.",
                    "",
                    "        C",
                    "Closing lyrics."
                ],
                expectedLength: 3,
                expectedTypes: [ChordLyricsLine, EmptyLine, ChordLyricsLine],
                expectedResults: [
                    "[C]  Opening [D]lyrics.",
                    "",
                    "Closing [C]lyrics."
                ]
            }
        ];

        test.each(convertLinesTestCases)(
            '$description',
            ({ inputLines, expectedLength, expectedTypes, expectedResults }) => {
                const lines = inputLines.map(content => new TextLine(content));

                const converter = new ChordLineConverter();
                const result = converter.convertLines(lines);

                expect(result).toBeDefined();
                expect(result.length).toBe(expectedLength);

                for (let i = 0; i < expectedLength; i++) {
                    expect(result[i]).toBeInstanceOf(expectedTypes[i]);
                    expect(result[i].toString()).toBe(expectedResults[i]);
                }
            }
        );
    });
});
