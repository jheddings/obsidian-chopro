// convert - chord format converter for the Obsidian ChoPro plugin

import { 
    ChoproFile, 
    ChoproBlock, 
    ChordLyricsLine, 
    InstrumentalLine, 
    TextLine, 
    ChoproLine, 
    ChordNotation, 
    SegmentedLine,
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

            // Handle empty lines
            if (currentLine instanceof TextLine && currentLine.content.trim() === '') {
                newLines.push(new EmptyLine());
                continue;
            }

            // Check if current line is a chord line
            if (this.isChordLine(currentLine) && currentLine instanceof TextLine) {
                // Look ahead to see if the next line exists and is a lyrics line
                const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
                
                if (nextLine instanceof TextLine && 
                    nextLine.content.trim() !== '' && 
                    !this.isChordLine(nextLine)) {

                    // We have a chord line followed by a lyrics line - combine them
                    const combined = this.combine(currentLine, nextLine);
                    newLines.push(combined);
                    i++; // Skip the next line since we've consumed it
                } else {

                    // Chord line without lyrics - make it an instrumental
                    const segments = this.parseChordLineSegments(currentLine);
                    newLines.push(new InstrumentalLine(segments));
                }
            } else {
                // Regular text line or other line type - keep as is
                newLines.push(currentLine);
            }
        }

        return newLines;
    }

    /**
     * Determine if the two lines are a chord / lyrics pair.
     */
    private isChordLyricsPair(line1: ChoproLine, line2: ChoproLine): boolean {
        if (!(line1 instanceof TextLine) || !(line2 instanceof TextLine)) {
            return false;
        }

        if ((line1.content.trim() === '') || (line2.content.trim() === '')) {
            return false;
        }

        return this.isChordLine(line1) && !this.isChordLine(line2);
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
            if (ChordNotation.test(`[${word}]`)) {
                validCount++;
            }
        }

        const ratio = validCount / words.length;
        return ratio >= ChordLineConverter.CHORD_LINE_THRESHOLD;
    }

    /**
     * Combine separate chord and lyric text lines into a single ChordLyricsLine.
     * @returns a ChoproLine as a segmented line or text line
     */
    combine(chordLine: TextLine, lyricLine: TextLine): ChoproLine {
        const chordStr = chordLine.content;
        const lyricStr = lyricLine.content;

        // find all chord "words" and their positions
        const chordRegex = /\S+/g;
        let match: RegExpExecArray | null;
        let chordPositions: { index: number; chordText: string; endIndex: number }[] = [];

        while ((match = chordRegex.exec(chordStr)) !== null) {
            chordPositions.push({ 
                index: match.index, 
                chordText: match[0],
                endIndex: match.index + match[0].length
            });
        }

        // if no chords were found, return just the lyrics
        if (chordPositions.length === 0) return lyricLine;

        const segments: LineSegment[] = [];
        let lyricIdx = 0;

        for (let i = 0; i < chordPositions.length; i++) {
            const { index: chordStart, chordText, endIndex: chordEnd } = chordPositions[i];

            // Add lyric text before this chord position
            if (chordStart > lyricIdx) {
                const lyricSegment = lyricStr.slice(lyricIdx, chordStart);
                if (lyricSegment) {
                    segments.push(new TextSegment(lyricSegment));
                }
            }

            try {
                const chord = ChordNotation.parse(`[${chordText}]`);
                segments.push(chord);
            } catch (e) {
                // handle as annotation - remove leading asterisks
                const annotation = chordText.replace(/^\**/g, "");
                segments.push(new Annotation(annotation));
            }

            // Advance lyric index to after this chord position
            lyricIdx = chordStart;

            // If there's a next chord, check if we need to add spacing
            if (i < chordPositions.length - 1) {
                const nextChordStart = chordPositions[i + 1].index;
                
                // If there's space between chords and no lyrics to fill it, add spacing
                if (chordEnd < nextChordStart && lyricIdx >= lyricStr.length) {
                    const spacing = chordStr.slice(chordEnd, nextChordStart);
                    if (spacing) {
                        segments.push(new TextSegment(spacing));
                    }
                }
            }
        }

        // add any remaining lyric text after the last chord
        if (lyricIdx < lyricStr.length) {
            const remainingLyrics = lyricStr.slice(lyricIdx);
            if (remainingLyrics) {
                segments.push(new TextSegment(remainingLyrics));
            }

        } else if (chordPositions.length > 0) {
            const lastChord = chordPositions[chordPositions.length - 1];
            if (lastChord.endIndex < chordStr.length) {
                const trailingSpace = chordStr.slice(lastChord.endIndex);
                if (trailingSpace) {
                    segments.push(new TextSegment(trailingSpace));
                }
            }
        }

        return new ChordLyricsLine(segments);
    }

    /**
     * Parse a chord line into segments for creating an InstrumentalLine
     */
    private parseChordLineSegments(line: TextLine): LineSegment[] {
        const content = line.content;
        const chordRegex = /\S+/g;
        let match: RegExpExecArray | null;
        const segments: LineSegment[] = [];
        let lastIndex = 0;

        while ((match = chordRegex.exec(content)) !== null) {
            // Add any whitespace before this chord
            if (match.index > lastIndex) {
                const spacing = content.slice(lastIndex, match.index);
                if (spacing) {
                    segments.push(new TextSegment(spacing));
                }
            }

            // Add the chord
            const chordText = match[0];
            try {
                const chord = ChordNotation.parse(`[${chordText}]`);
                segments.push(chord);
            } catch (e) {
                // handle as annotation
                const annotation = chordText.replace(/^\**/g, "");
                segments.push(new Annotation(annotation));
            }

            lastIndex = match.index + match[0].length;
        }

        // Add any remaining whitespace
        if (lastIndex < content.length) {
            const remaining = content.slice(lastIndex);
            if (remaining) {
                segments.push(new TextSegment(remaining));
            }
        }

        return segments;
    }
}
