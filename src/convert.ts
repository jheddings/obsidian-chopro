// convert - chord format converter for the Obsidian ChoPro plugin

import {
    ChoproFile,
    ChoproBlock,
    ChordLyricsLine,
    InstrumentalLine,
    TextLine,
    ChoproLine,
    BracketChord,
    TextSegment,
    Annotation,
    LineSegment,
    ChordLine,
    ChordSegment,
    IndexedSegment,
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

    private convertLines(lines: ChoproLine[]): ChoproLine[] {
        const newLines: ChoproLine[] = [];

        for (let i = 0; i < lines.length; i++) {
            const currentLine = lines[i];

            if (currentLine instanceof ChordLine) {
                const nextLine = i + 1 < lines.length ? lines[i + 1] : null;

                if (nextLine instanceof TextLine) {
                    // chord line followed by a lyrics line - combine them
                    const combined = this.combine(currentLine, nextLine);
                    newLines.push(combined);
                    i++; // skip the next line since we've consumed it
                } else {
                    // chord line without lyrics - make it an instrumental
                    const instr = this.combine(currentLine, new TextLine(""));
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

        const segments: LineSegment[] = [];
        let currentLyricPos = 0;

        // Process each chord/annotation in order
        for (let i = 0; i < indexedSegments.length; i++) {
            const { segment, lineIndex } = indexedSegments[i];

            // Add lyrics before this chord position
            if (lineIndex > currentLyricPos) {
                const lyricText = lyricStr.slice(currentLyricPos, lineIndex);
                if (lyricText) {
                    segments.push(new TextSegment(lyricText));
                }
            }

            // Convert the indexed segment to the appropriate type
            if (segment instanceof ChordSegment) {
                segments.push(new BracketChord(segment));
            } else if (segment instanceof TextSegment) {
                segments.push(new Annotation(segment.content));
            }

            // Update position and handle spacing for instrumental sections
            currentLyricPos = lineIndex;

            // If we're beyond the lyrics and there's another chord coming, add spacing
            if (currentLyricPos >= lyricStr.length && i < indexedSegments.length - 1) {
                const nextChordPos = indexedSegments[i + 1].lineIndex;
                const chordLength = segment.toString().length;
                const spacingNeeded = nextChordPos - lineIndex - chordLength;

                if (spacingNeeded > 0) {
                    segments.push(new TextSegment(" ".repeat(spacingNeeded)));
                }
            }
        }

        // Add any remaining lyrics after the last chord
        if (currentLyricPos < lyricStr.length) {
            const remainingLyrics = lyricStr.slice(currentLyricPos);
            segments.push(new TextSegment(remainingLyrics));
        }

        // Determine if this is instrumental (only chords/annotations with no meaningful lyrics)
        const hasLyrics = segments.some(
            (segment) => segment instanceof TextSegment && segment.content.trim() !== ""
        );

        return hasLyrics ? new ChordLyricsLine(segments) : new InstrumentalLine(segments);
    }
}
