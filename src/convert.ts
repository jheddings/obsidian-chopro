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

        const chordPositions = this.findChordPositions(chordStr);

        // if no chords were found, return just the lyrics
        if (chordPositions.length === 0) return lyricLine;

        const segments = this.buildSegments(chordPositions, chordStr, lyricStr);

        // If segments contain only chords and whitespace, return an InstrumentalLine
        if (this.isInstrumental(segments)) {
            return new InstrumentalLine(segments);
        }

        return new ChordLyricsLine(segments);
    }

    /**
     * Find all chord positions in the chord line.
     */
    private findChordPositions(chordStr: string): { index: number; chordText: string; endIndex: number }[] {
        const chordRegex = /\S+/g;
        const positions: { index: number; chordText: string; endIndex: number }[] = [];
        let match: RegExpExecArray | null;

        while ((match = chordRegex.exec(chordStr)) !== null) {
            positions.push({ 
                index: match.index, 
                chordText: match[0],
                endIndex: match.index + match[0].length
            });
        }

        return positions;
    }

    /**
     * Build line segments from chord positions and lyrics.
     */
    private buildSegments(
        chordPositions: { index: number; chordText: string; endIndex: number }[], 
        chordStr: string, 
        lyricStr: string
    ): LineSegment[] {
        const segments: LineSegment[] = [];
        let lyricIdx = 0;

        for (let i = 0; i < chordPositions.length; i++) {
            const { index: chordStart, chordText, endIndex: chordEnd } = chordPositions[i];

            // Add lyric text before this chord position
            this.addLyricSegment(segments, lyricStr, lyricIdx, chordStart);

            // Add the chord or annotation
            this.addChordSegment(segments, chordText);

            // Advance lyric index to after this chord position
            lyricIdx = chordStart;

            // Add spacing between chords if needed
            this.addChordSpacing(segments, chordPositions, i, chordStr, chordEnd, lyricStr, lyricIdx);
        }

        // Add any remaining content after the last chord
        this.addRemainingContent(segments, chordPositions, chordStr, lyricStr, lyricIdx);

        return segments;
    }

    /**
     * Add a lyric segment if there's text in the specified range.
     */
    private addLyricSegment(segments: LineSegment[], lyricStr: string, startIdx: number, endIdx: number): void {
        if (endIdx > startIdx) {
            const lyricSegment = lyricStr.slice(startIdx, endIdx);
            if (lyricSegment) {
                segments.push(new TextSegment(lyricSegment));
            }
        }
    }

    /**
     * Add a chord or annotation segment.
     */
    private addChordSegment(segments: LineSegment[], chordText: string): void {
        try {
            const chord = ChordNotation.parse(`[${chordText}]`);
            segments.push(chord);
        } catch (e) {
            // handle as annotation - remove leading asterisks
            const annotation = chordText.replace(/^\**/g, "");
            segments.push(new Annotation(annotation));
        }
    }

    /**
     * Add spacing between chords when there are no lyrics to fill the gap.
     */
    private addChordSpacing(
        segments: LineSegment[], 
        chordPositions: { index: number; chordText: string; endIndex: number }[], 
        currentIndex: number, 
        chordStr: string, 
        chordEnd: number, 
        lyricStr: string, 
        lyricIdx: number
    ): void {
        if (currentIndex < chordPositions.length - 1) {
            const nextChordStart = chordPositions[currentIndex + 1].index;
            
            // If there's space between chords and no lyrics to fill it, add spacing
            if (chordEnd < nextChordStart && lyricIdx >= lyricStr.length) {
                const spacing = chordStr.slice(chordEnd, nextChordStart);
                if (spacing) {
                    segments.push(new TextSegment(spacing));
                }
            }
        }
    }

    /**
     * Add any remaining content after the last chord.
     */
    private addRemainingContent(
        segments: LineSegment[], 
        chordPositions: { index: number; chordText: string; endIndex: number }[], 
        chordStr: string, 
        lyricStr: string, 
        lyricIdx: number
    ): void {
        // Add any remaining lyric text after the last chord
        if (lyricIdx < lyricStr.length) {
            const remainingLyrics = lyricStr.slice(lyricIdx);
            if (remainingLyrics) {
                segments.push(new TextSegment(remainingLyrics));
            }
        } else if (chordPositions.length > 0) {
            // Add trailing space from chord line if present
            const lastChord = chordPositions[chordPositions.length - 1];
            if (lastChord.endIndex < chordStr.length) {
                const trailingSpace = chordStr.slice(lastChord.endIndex);
                if (trailingSpace) {
                    segments.push(new TextSegment(trailingSpace));
                }
            }
        }
    }

    /**
     * Check if the segments contain only chords, annotations, and whitespace (no meaningful lyrics).
     */
    private isInstrumental(segments: LineSegment[]): boolean {
        return segments.every(segment => {
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
