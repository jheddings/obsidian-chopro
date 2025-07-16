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
    ChordLine,
    IndexedSegment
} from "./parser";

/**
 * A stateful buffer for building chord line segments.
 */
class ChordLineBuffer {
    private segments: LineSegment[] = [];
    private lyricIdx: number = 0;

    constructor(private lyricStr: string) {}

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
     * Add a chord or annotation segment directly.
     */
    addSegment(segment: LineSegment): void {
        this.segments.push(segment);
    }

    /**
     * Add spacing between chords when there are no lyrics to fill the gap.
     */
    addChordSpacing(
        indexedSegments: IndexedSegment[], 
        currentIndex: number,
    ): void {
        const currentSegment = indexedSegments[currentIndex];
        const currentEnd = currentSegment.lineIndex + this.getSegmentLength(currentSegment);

        if (currentIndex < indexedSegments.length - 1) {
            const nextSegmentStart = indexedSegments[currentIndex + 1].lineIndex;
            
            // If there's space between chords and no lyrics to fill it, add spacing
            if (currentEnd < nextSegmentStart && this.lyricIdx >= this.lyricStr.length) {
                const spacingLength = nextSegmentStart - currentEnd;
                if (spacingLength > 0) {
                    this.segments.push(new TextSegment(' '.repeat(spacingLength)));
                }
            }
        }
    }

    /**
     * Get the display length of a segment.
     */
    private getSegmentLength(indexedSegment: IndexedSegment): number {
        if (indexedSegment.segment instanceof ChordNotation) {
            return indexedSegment.segment.toString().length - 2; // Remove brackets
        } else if (indexedSegment.segment instanceof Annotation) {
            return indexedSegment.segment.content.length;
        }
        return 0;
    }

    /**
     * Add any remaining content after the last chord.
     */
    finalize(): LineSegment[] {
        // Add any remaining lyric text after the last chord
        if (this.lyricIdx < this.lyricStr.length) {
            const remainingLyrics = this.lyricStr.slice(this.lyricIdx);
            if (remainingLyrics) {
                this.segments.push(new TextSegment(remainingLyrics));
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

    constructor() {
        super();
    }

    /**
     * Convert a ChoproBlock containing chord-over-lyrics format to bracketed chords.
     * @returns true if the block was changed
     */
    convertBlock(block: ChoproBlock): boolean {
        const newLines = this.convertLines(block.lines);

        if (newLines) {
            block.lines = newLines;
            return true;
        }

        return false;
    }

    protected convertLines(lines: ChoproLine[]): ChoproLine[] {
        const newLines: ChoproLine[] = [];

        for (let i = 0; i < lines.length; i++) {
            const currentLine = lines[i];

            if (currentLine instanceof ChordLine) {
                const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

                if (nextLine instanceof TextLine) {
                    // chord line followed by a lyrics line - combine them
                    const combined = this.combine(currentLine, nextLine);
                    newLines.push(combined);
                    i++;  // skip the next line since we've consumed it

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
     * Combine separate chord and lyric text lines into a single ChordLyricsLine or InstrumentalLine.
     * @returns a ChoproLine as a segmented line or text line
     */
    combine(chordLine: ChordLine, lyricLine: TextLine): ChoproLine {
        const lyricStr = lyricLine.content;
        const indexedSegments = chordLine.segments as IndexedSegment[];

        // if no chords were found, return just the lyrics
        if (indexedSegments.length === 0) return lyricLine;

        const buffer = new ChordLineBuffer(lyricStr);

        for (let i = 0; i < indexedSegments.length; i++) {
            const indexedSegment = indexedSegments[i];
            const chordStart = indexedSegment.lineIndex;

            // Add lyric text before this chord position
            buffer.addLyricSegment(chordStart);

            // Add the chord or annotation segment directly
            buffer.addSegment(indexedSegment.segment);

            // Advance lyric index to after this chord position
            buffer.advanceLyricIndex(chordStart);

            // Add spacing between chords if needed
            buffer.addChordSpacing(indexedSegments, i);
        }

        const segments = buffer.finalize();

        if (buffer.isInstrumental()) {
            return new InstrumentalLine(segments);
        }

        return new ChordLyricsLine(segments);
    }
}
