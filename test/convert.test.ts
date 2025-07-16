// convert.test.ts - unit tests for converter.ts

import { ChordLineConverter } from '../src/convert';
import { ChoproFile } from '../src/parser';
import { TextLine, ChordLyricsLine, InstrumentalLine, ChordLine } from '../src/parser';

describe('ChordLineConverter', () => {
    describe('combine', () => {

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
                const chordLine = ChordLine.parse(chords);
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
                chords: "A#   F#m7b5   Pause",
                lyrics: "Special chords here.",
                expected: "[A#]Speci[F#m7b5]al chords[*Pause] here.",
            }
        ];

        test.each(combineTestCases)(
            'should combine lines -- $expected',
            ({ chords, lyrics, expected }) => {
                const chordLine = ChordLine.parse(chords);
                const lyricLine = new TextLine(lyrics);

                const converter = new ChordLineConverter();
                const result = converter.combine(chordLine, lyricLine);

                expect(result).toBeDefined();
                expect(result).toBeInstanceOf(ChordLyricsLine);
                expect(result?.toString()).toBe(expected);
            }
        );
    });

    describe('file conversion', () => {
        const path = require("path");

        test('should convert convert.md file to bracketed chord patterns', () => {
            const testFilePath = path.join(__dirname, 'convert.md');

            const choproFile = ChoproFile.load(testFilePath);
            expect(choproFile).toBeDefined();
            expect(choproFile.blocks.length).toBeGreaterThan(0);

            const converter = new ChordLineConverter();
            const wasConverted = converter.convert(choproFile);
            expect(wasConverted).toBe(true);

            // Verify the conversion results contain expected patterns
            const convertedContent = choproFile.toString();
            
            expect(convertedContent).toContain('Swing [D]low, sweet [G]chari[D]ot,');
            expect(convertedContent).toContain('Comin\' for to carry me [A7]home.');
            expect(convertedContent).toContain('Swing l[D7]ow, sweet [G]char[D]iot,');
            expect(convertedContent).toContain('Comin\' for to [A7]carry me [D]home.');
        });
    });
});
