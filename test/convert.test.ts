// convert.test.ts - unit tests for converter.ts

import { ChordLineConverter } from '../src/convert';
import { TextLine, ChordLyricsLine, InstrumentalLine, EmptyLine } from '../src/parser';

describe('ChordLineConverter', () => {
    describe('combine', () => {
        it('should convert basic chord-over-lyrics format to bracketed chords', () => {
            const chordLine = new TextLine("      D          G    D");
            const lyricLine = new TextLine("Basic chord line with lyrics.");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result).toBeDefined();
            expect(result).toBeInstanceOf(ChordLyricsLine);

            expect(result?.toString()).toBe("Basic [D]chord line [G]with [D]lyrics.");

        });

        it('handles invalid chords as Annotations', () => {
            const chordLine = new TextLine("            Rit.           A7");
            const lyricLine = new TextLine("Final line, slowing to a close.");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result).toBeDefined();
            expect(result).toBeInstanceOf(ChordLyricsLine);

            expect(result?.toString()).toBe("Final line, [*Rit.]slowing to a cl[A7]ose.");
        });

        it('handles chord placement before lyrice', () => {
            const chordLine = new TextLine("D");
            const lyricLine = new TextLine("  Delayed lyrics.");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result).toBeDefined();
            expect(result).toBeInstanceOf(ChordLyricsLine);

            expect(result?.toString()).toBe("[D]  Delayed lyrics.");
        });

        it('handles chord placement at the end of the line', () => {
            const chordLine = new TextLine("                       D  G  C");
            const lyricLine = new TextLine("Chord after all lyrics.");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result).toBeDefined();
            expect(result).toBeInstanceOf(ChordLyricsLine);

            expect(result?.toString()).toBe("Chord after all lyrics.[D]  [G]  [C]");
        });

        it('handles chord line with only spaces', () => {
            const chordLine = new TextLine("    ");
            const lyricLine = new TextLine("No chords here.");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result?.toString()).toBe("No chords here.");
        });

        it('handles empty lyric line', () => {
            const chordLine = new TextLine("A   D   E");
            const lyricLine = new TextLine("");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result?.toString()).toBe("[A]   [D]   [E]");
        });

        it('handles empty chord line', () => {
            const chordLine = new TextLine("");
            const lyricLine = new TextLine("Lyrics only.");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result?.toString()).toBe("Lyrics only.");
        });

        it('handles misaligned chord and lyric lines', () => {
            const chordLine = new TextLine("   F#     Bm");
            const lyricLine = new TextLine("Misaligned test.");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result?.toString()).toBe("Mis[F#]aligned[Bm] test.");
        });

        it('handles chord line with tabs and multiple spaces', () => {
            const chordLine = new TextLine("G\t\tC    D");
            const lyricLine = new TextLine("Tabs and spaces.");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result?.toString()).toBe("[G]Tab[C]s and[D] spaces.");
        });

        it('handles chord line with special characters', () => {
            const chordLine = new TextLine("A#   F#m7b5   *Pause");
            const lyricLine = new TextLine("Special chords here.");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result?.toString()).toBe("[A#]Speci[F#m7b5]al chords[*Pause] here.");
        });

        it('converts chord line with empty lyrics to InstrumentalLine', () => {
            const chordLine = new TextLine("C    G    Am    F");
            const lyricLine = new TextLine("");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result).toBeDefined();
            expect(result).toBeInstanceOf(InstrumentalLine);
            expect(result?.toString()).toBe("[C]    [G]    [Am]    [F]");
        });

        it('converts chord line with only whitespace lyrics to InstrumentalLine', () => {
            const chordLine = new TextLine("Dm   F   C   G");
            const lyricLine = new TextLine("   ");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result).toBeDefined();
            expect(result).toBeInstanceOf(InstrumentalLine);
            expect(result?.toString()).toBe("[Dm]   [F]   [C]   [G]");
        });

    });

    describe('convertLines', () => {
        it('does not change multiple lines with lyrics', () => {
            const lines = [
                new TextLine("There are no chords here,"),
                new TextLine("just some lyrics to test."),
                new TextLine("Even if A line has G chord-like text."),
            ];

            const converter = new ChordLineConverter();
            const result = converter.convertLines(lines);

            expect(result).toBeDefined();
            expect(result.length).toBe(lines.length);

            for (let i = 0; i < lines.length; i++) {
                expect(result[i]).toBeInstanceOf(TextLine);
                expect(result[i].toString()).toBe(lines[i].content);
            }
        });


        it('converts line pairs to a single ChordLyricsLine', () => {
            const lines = [
                new TextLine("      D          G    D"),
                new TextLine("Basic chord line with lyrics.")
            ];

            const converter = new ChordLineConverter();
            const result = converter.convertLines(lines);

            expect(result).toBeDefined();
            expect(result.length).toBe(1);
            expect(result[0]).toBeInstanceOf(ChordLyricsLine);
            expect(result[0].toString()).toBe("Basic [D]chord line [G]with [D]lyrics.");
        });

        it('converts subsequent chord lines to Instrumentals', () => {
            const lines = [
                new TextLine("C    G    Am    F"),
                new TextLine("C    G    F     F"),
                new TextLine("C              G            Am            F  "),
                new TextLine("I woke up to the sound of rain upon the window")
            ];

            const converter = new ChordLineConverter();
            const result = converter.convertLines(lines);

            expect(result).toBeDefined();
            expect(result.length).toBe(3);
            expect(result[0]).toBeInstanceOf(InstrumentalLine);
            expect(result[1]).toBeInstanceOf(InstrumentalLine);
            expect(result[2]).toBeInstanceOf(ChordLyricsLine);
        });

        it('preserves empty lines', () => {
            const lines = [
                new TextLine("C         D"),
                new TextLine("  Opening lyrics."),
                new TextLine(""),
                new TextLine("        C"),
                new TextLine("Closing lyrics."),
            ];

            const converter = new ChordLineConverter();
            const result = converter.convertLines(lines);

            expect(result).toBeDefined();
            expect(result.length).toBe(3);
            expect(result[0]).toBeInstanceOf(ChordLyricsLine);
            expect(result[0].toString()).toBe("[C]  Opening [D]lyrics.");
            expect(result[1]).toBeInstanceOf(EmptyLine);
            expect(result[2]).toBeInstanceOf(ChordLyricsLine);
            expect(result[2].toString()).toBe("Closing [C]lyrics.");
        });

    });
});
