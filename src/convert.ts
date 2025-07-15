// convert - chord format converter for the Obsidian ChoPro plugin

import { 
    ChoproFile, 
    ChoproBlock, 
    ChordLyricsLine, 
    InstrumentalLine, 
    TextLine, 
    ChoproLine, 
    ChordNotation, 
    TextSegment,
    Annotation,
    LineSegment,
    EmptyLine
} from "./parser";

/**
 * A stateful buffer for building chord line segments.
 */
class ChordLineBuffer {
    private segments: LineSegment[] = [];
    private lyricIdx: number = 0;

    constructor(
        private chordStr: string,
        private lyricStr: string
    ) {}

    /**
     * Add a lyric segment if there's text in the specified range.
     */
    addLyricSegment(endIdx: number): void {
        if (endIdx > this.lyricIdx) {
            const lyricSegment = this.lyricStr.slice(this.lyricIdx, endIdx);
            if (lyricSegment) {
                this.segments.push(new TextSegment(lyricSegment));
            }
        }
    }

    /**
     * Add a chord or annotation segment.
     */
    addChordSegment(chordText: string): void {
        try {
            const chord = ChordNotation.parse(`[${chordText}]`);
            this.segments.push(chord);
        } catch (e) {
            // handle as annotation - remove leading asterisks
            const annotation = chordText.replace(/^\**/g, "");
            this.segments.push(new Annotation(annotation));
        }
    }

    /**
     * Add spacing between chords when there are no lyrics to fill the gap.
     */
    addChordSpacing(
        chordPositions: { index: number; chordText: string }[], 
        currentIndex: number,
    ): void {
        const currentChord = chordPositions[currentIndex];
        const chordEnd = currentChord.index + currentChord.chordText.length;

        if (currentIndex < chordPositions.length - 1) {
            const nextChordStart = chordPositions[currentIndex + 1].index;
            
            // If there's space between chords and no lyrics to fill it, add spacing
            if (chordEnd < nextChordStart && this.lyricIdx >= this.lyricStr.length) {
                const spacing = this.chordStr.slice(chordEnd, nextChordStart);
                if (spacing) {
                    this.segments.push(new TextSegment(spacing));
                }
            }
        }
    }

    /**
     * Add any remaining content after the last chord.
     */
    finalize(chordPositions: { index: number; chordText: string }[]): LineSegment[] {
        // Add any remaining lyric text after the last chord
        if (this.lyricIdx < this.lyricStr.length) {
            const remainingLyrics = this.lyricStr.slice(this.lyricIdx);
            if (remainingLyrics) {
                this.segments.push(new TextSegment(remainingLyrics));
            }
        } else if (chordPositions.length > 0) {
            // Add trailing space from chord line if present
            const lastChord = chordPositions[chordPositions.length - 1];
            const endIndex = lastChord.index + lastChord.chordText.length;
            if (endIndex < this.chordStr.length) {
                const trailingSpace = this.chordStr.slice(endIndex);
                if (trailingSpace) {
                    this.segments.push(new TextSegment(trailingSpace));
                }
            }
        }

        return this.segments;
    }

    /**
     * Advance the lyric index to the specified position.
     */
    advanceLyricIndex(index: number): void {
        this.lyricIdx = index;
    }

    /**
     * Check if the segments contain only chords, annotations, and whitespace (no meaningful lyrics).
     */
    isInstrumental(): boolean {
        return this.segments.every(segment => {
            if (segment instanceof ChordNotation || segment instanceof Annotation) {
                return true;
            }
            if (segment instanceof TextSegment) {
                return segment.content.trim() === '';
            }
            return false;
        });
    }
}

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
    private static readonly CHORD_PATTERN = /\S+/g;

    constructor() {
        super();
    }

    /**
     * Convert a ChoproBlock containing chord-over-lyrics format to bracketed chords.
     * @returns true if the block was changed
     */
    convertBlock(block: ChoproBlock): boolean {
        // don't convert if there are already chord lines
        const hasExistingChords = block.lines.some(
            (line) =>
                line instanceof ChordLyricsLine ||
                line instanceof InstrumentalLine
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

    convertLines(lines: ChoproLine[]): ChoproLine[] {
        const newLines: ChoproLine[] = [];

        for (let i = 0; i < lines.length; i++) {
            const currentLine = lines[i];

            if (this.isEmptyLine(currentLine)) {
                newLines.push(new EmptyLine());
                continue;
            }

            if (this.isChordLine(currentLine) && currentLine instanceof TextLine) {
                const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

                if (this.isLyricsLine(nextLine) && nextLine instanceof TextLine) {
                    // chord line followed by a lyrics line - combine them
                    const combined = this.combine(currentLine, nextLine);
                    newLines.push(combined);
                    i++; // Skip the next line since we've consumed it

                } else {
                    // chord line without lyrics - make it an instrumental
                    const instr = this.combine(currentLine, new TextLine(''));
                    newLines.push(instr);
                }

            } else {
                // fallback - keep the line as-is
                newLines.push(currentLine);
            }
        }

        return newLines;
    }

    /**
     * Determine if a line is an empty line.
     */
    private isEmptyLine(line: ChoproLine | null): boolean {
        if (line === null) return false;

        if (!(line instanceof TextLine)) return false;

        return line.content.trim() === '';
    }

    /**
     * Determine if a line is likely a chord line.
     */
    private isChordLine(line: ChoproLine | null): boolean {
        if (line === null) return false;

        if (!(line instanceof TextLine)) return false;

        const content = line.content.trim();
        const words = content.split(/\s+/);
        if (words.length === 0) return false;

        let validCount = 0;

        for (const word of words) {
            if (ChordNotation.test(`[${word}]`)) {
                validCount++;
            }
        }

        const ratio = validCount / words.length;
        return ratio >= ChordLineConverter.CHORD_LINE_THRESHOLD;
    }

    /**
     * Determine if the lines is lyrics only.
     */
    private isLyricsLine(line: ChoproLine | null): boolean {
        if (line === null) return false;

        if (!(line instanceof TextLine)) return false;

        if (line.content.trim() == '') return false;

        return !this.isChordLine(line);
    }

    /**
     * Combine separate chord and lyric text lines into a single ChordLyricsLine or InstrumentalLine.
     * @returns a ChoproLine as a segmented line or text line
     */
    combine(chordLine: TextLine, lyricLine: TextLine): ChoproLine {
        const chordStr = chordLine.content;
        const lyricStr = lyricLine.content;

        let match: RegExpExecArray | null;
        const chordPositions: { index: number; chordText: string }[] = [];

        while ((match = ChordLineConverter.CHORD_PATTERN.exec(chordStr)) !== null) {
            chordPositions.push({ index: match.index, chordText: match[0] });
        }

        // if no chords were found, return just the lyrics
        if (chordPositions.length === 0) return lyricLine;

        const buffer = new ChordLineBuffer(chordStr, lyricStr);

        for (let i = 0; i < chordPositions.length; i++) {
            const { index: chordStart, chordText } = chordPositions[i];

            // Add lyric text before this chord position
            buffer.addLyricSegment(chordStart);

            // Add the chord or annotation
            buffer.addChordSegment(chordText);

            // Advance lyric index to after this chord position
            buffer.advanceLyricIndex(chordStart);

            // Add spacing between chords if needed
            buffer.addChordSpacing(chordPositions, i);
        }

        const segments = buffer.finalize(chordPositions);

        if (buffer.isInstrumental()) {
            return new InstrumentalLine(segments);
        }

        return new ChordLyricsLine(segments);
    }
}
