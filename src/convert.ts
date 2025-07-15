// convert - chord format converter for the Obsidian ChoPro plugin

import { 
    ChoproFile, 
    ChoproBlock, 
    ChordLyricsLine, 
    InstrumentalLine, 
    TextLine, 
    ChoproLine, 
    ChordNotation 
} from "./parser";

export abstract class ChordConverter {
    constructor() {}

    /**
     * Convert a ChoproFile to the intended format (specified by the subclass).
     * @returns true if the file was changed
     */
    convert(choproFile: ChoproFile): boolean {
        let hasChanges = false;

        for (let i = 0; i < choproFile.blocks.length; i++) {
            const block = choproFile.blocks[i];
            if (block instanceof ChoproBlock) {
                if (this.convertBlock(block)) {
                    hasChanges = true;
                }
            }
        }

        return hasChanges;
    }

    /**
     * Convert a ChoproBlock in place. Returns true if the block was changed.
     */
    abstract convertBlock(block: ChoproBlock): boolean;
}

export class ChordLineConverter extends ChordConverter {
    private static readonly CHORD_LINE_THRESHOLD = 0.51;

    constructor() {
        super();
    }

    /**
     * Convert a ChoproBlock containing chord-over-lyrics format to bracketed chords.
     * @returns true if the block was changed
     */
    convertBlock(block: ChoproBlock): boolean {
        
        // don't convert if there are already chord lines
        const hasExistingChords = block.lines.some(line => 
            line instanceof ChordLyricsLine || line instanceof InstrumentalLine
        );
        
        if (hasExistingChords) {
            return false;
        }
        
        const newLines = this.convertLines(block.lines);
        
        if (newLines) {
            block.lines = newLines;
            return true;
        }

        return false;
    }

    private convertLines(lines: ChoproLine[]): ChoproLine[] | null {
        const newLines: ChoproLine[] = [];

        for (let i = 0; i < lines.length; i++) {
            // TODO
        }

        return newLines.length > 0 ? newLines : null;
    }

    /**
     * Determine if a line is likely a chord line.
     */
    isChordLine(line: ChoproLine): boolean {
        if (!(line instanceof TextLine)) return false;

        const content = line.content.trim();
        const words = content.split(/\s+/);
        if (words.length === 0) return false;

        let validCount = 0;

        for (const word of words) {
            try {
                ChordNotation.parse(`[${word}]`);
                validCount++;
            } catch (e) {
                // Not a valid chord, skip
            }
        }

        const ratio = validCount / words.length;
        return (ratio >= ChordLineConverter.CHORD_LINE_THRESHOLD);
    }

    /**
     * Combine separate chord and lyric text lines into a single ChordLyricsLine.
     * @returns combined ChordLyricsLine or null if conversion failed
     */
    combine(chordLine: TextLine, lyricLine: TextLine): ChordLyricsLine | null {
        const chordStr = chordLine.content;
        const lyricStr = lyricLine.content;

        // Find all chord "words" and their positions
        const chordRegex = /\S+/g;
        let match: RegExpExecArray | null;
        let insertions: { index: number, segment: string }[] = [];

        while ((match = chordRegex.exec(chordStr)) !== null) {
            const chordText = match[0];
            const chordStart = match.index;
            let segment: string;
            try {
                const chord = ChordNotation.parse(`[${chordText}]`);
                segment = chord.toString();
            } catch (e) {
                // Treat as annotation if not a valid chord
                segment = `[*${chordText}]`;
            }

            // Find the first non-space character in the lyric line at or after chordStart
            let lyricInsert = chordStart;
            while (lyricInsert < lyricStr.length && lyricStr[lyricInsert] === ' ') {
                lyricInsert++;
            }
            if (lyricInsert > lyricStr.length) continue;
            insertions.push({ index: lyricInsert, segment });
        }

        if (insertions.length === 0) return null;

        // Insert segments into the lyric string, adjusting for offset as we go
        let result = lyricStr;
        let offset = 0;
        for (const ins of insertions) {
            const idx = ins.index + offset;
            result = result.slice(0, idx) + ins.segment + result.slice(idx);
            offset += ins.segment.length;
        }

        return ChordLyricsLine.parse(result);
    }
}
