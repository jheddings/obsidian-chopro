// convert.test.ts - unit tests for converter.ts

import { ChordLineConverter } from '../src/convert';
import { TextLine, ChordLyricsLine } from '../src/parser';

describe('ChordLineConverter', () => {
    describe('combine', () => {
        it('should convert basic chord-over-lyrics format to bracketed chords', () => {
            const chordLine = new TextLine("      D          G    D");
            const lyricLine = new TextLine("Swing low, sweet chariot,");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result).toBeDefined();
            expect(result).toBeInstanceOf(ChordLyricsLine);

            expect(result?.toString()).toBe("Swing [D]low, sweet [G]chari[D]ot,");
        });

        it('handles invalid chords as Annotations', () => {
            const chordLine = new TextLine("              Rit.      A7");
            const lyricLine = new TextLine("Comin' for to carry me home.");

            const converter = new ChordLineConverter();
            const result = converter.combine(chordLine, lyricLine);

            expect(result).toBeDefined();
            expect(result).toBeInstanceOf(ChordLyricsLine);

            expect(result?.toString()).toBe("Comin' for to [*Rit.]carry me h[A7]ome.");
        });
    });
});
