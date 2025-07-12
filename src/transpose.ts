// transpose - chord conversion for the ChoPro Plugin

import {
    ChordNotation,
    ChoproFile,
    SegmentedLine,
    ChoproBlock,
    Frontmatter,
    LineSegment,
    ContentBlock,
    ChoproLine,
} from "./parser";

import {
    Accidental,
    AbstractNote,
    MusicNote,
    NashvilleNumber,
    AbsoluteKeyInfo,
    MusicTheory,
} from "./music";

export interface TransposeOptions {
    fromKey?: string;
    toKey?: string;
}

export interface TransposeResult {
    success: boolean;
    song: ChoproFile | undefined;
    errors?: string[];
}

/**
 * Handles transposition of individual notes and chords
 */
export class NoteTransposer {

    /**
     * Transpose a note by a given interval.
     */
    static transposeNote(
        note: AbstractNote,
        interval: number,
        preferredAccidental?: Accidental
    ): void {
        const originalIndex = MusicTheory.getNoteIndex(note);
        const newIndex = (originalIndex + interval + 12) % 12;
        const newNoteName = MusicTheory.getPreferredNoteName(newIndex, preferredAccidental);

        const newNote = AbstractNote.parse(newNoteName);
        note.root = newNote.root;
        note.postfix = newNote.postfix;
    }

    /**
     * Transpose all notes in a chord notation.
     */
    static transposeChord(
        chord: ChordNotation,
        interval: number,
        preferredAccidental?: Accidental
    ): void {
        this.transposeNote(chord.note, interval, preferredAccidental);
        if (chord.bass) {
            this.transposeNote(chord.bass, interval, preferredAccidental);
        }
    }
}

/**
 * Handles Nashville number system transposition.
 */
export class NashvilleTransposer {
    private static readonly MIN_SCALE_DEGREE = 1;
    private static readonly MAX_SCALE_DEGREE = 7;

    /**
     * Validate Nashville number and return 0-based degree.
     */
    private static validateAndParseNashvilleDegree(nashvilleNumber: string): number {
        const degree = parseInt(nashvilleNumber);
        if (isNaN(degree) || degree < this.MIN_SCALE_DEGREE || degree > this.MAX_SCALE_DEGREE) {
            throw new Error(`Invalid Nashville number: ${nashvilleNumber}`);
        }
        return degree - 1; // Convert to 0-based
    }

    /**
     * Convert a Nashville degree to a chromatic note index.
     */
    private static nashvilleDegreeToNoteIndex(
        degree: number,
        keyIndex: number,
        scaleDegrees: number[]
    ): number {
        return (keyIndex + scaleDegrees[degree]) % 12;
    }

    /**
     * Convert a chromatic note index to Nashville degree.
     * Returns -1 if the note is not in the scale.
     */
    private static noteIndexToNashvilleDegree(
        noteIndex: number,
        keyIndex: number,
        scaleDegrees: number[]
    ): number {
        for (let i = 0; i < scaleDegrees.length; i++) {
            const expectedIndex = (keyIndex + scaleDegrees[i]) % 12;
            if (expectedIndex === noteIndex) {
                return i;
            }
        }
        return -1; // Not found in scale
    }

    /**
     * Convert a note to alphabetic notation and update in place.
     */
    private static convertNoteToAlpha(
        note: AbstractNote,
        degree: number,
        keyIndex: number,
        scaleDegrees: number[],
        preferredAccidental?: Accidental
    ): void {
        const noteIndex = this.nashvilleDegreeToNoteIndex(degree, keyIndex, scaleDegrees);
        const noteName = MusicTheory.getPreferredNoteName(noteIndex, preferredAccidental);
        const parsedNote = AbstractNote.parse(noteName);
        
        note.root = parsedNote.root;
        note.postfix = parsedNote.postfix;
    }

    /**
     * Convert a note to Nashville notation and update in place.
     */
    private static convertNoteToNashville(
        note: AbstractNote,
        keyIndex: number,
        scaleDegrees: number[]
    ): void {
        const noteIndex = MusicTheory.getNoteIndex(note);
        const degree = this.noteIndexToNashvilleDegree(noteIndex, keyIndex, scaleDegrees);
        
        if (degree === -1) {
            throw new Error(
                `Cannot convert note ${note.toString()} to Nashville number - not in scale`
            );
        }
        
        note.root = (degree + 1).toString(); // Convert to 1-based
        note.postfix = undefined; // Clear accidentals for diatonic notes
    }

    /**
     * Convert Nashville number to chord notation.
     */
    static nashvilleToChord(nashvilleChord: ChordNotation, targetKey: AbsoluteKeyInfo): void {
        if (!(nashvilleChord.note instanceof NashvilleNumber)) {
            throw new Error("Chord is not in Nashville notation");
        }

        // Pre-calculate key information
        const scaleDegrees = targetKey.getScaleDegrees();
        const targetKeyNote = AbstractNote.parse(targetKey.root);
        const targetKeyIndex = MusicTheory.getNoteIndex(targetKeyNote);

        // Convert main note
        const degree = this.validateAndParseNashvilleDegree(nashvilleChord.note.root);
        this.convertNoteToAlpha(
            nashvilleChord.note,
            degree,
            targetKeyIndex,
            scaleDegrees,
            targetKey.accidental
        );

        // Convert bass note if present
        if (nashvilleChord.bass) {
            const bassDegree = this.validateAndParseNashvilleDegree(nashvilleChord.bass.root);
            this.convertNoteToAlpha(
                nashvilleChord.bass,
                bassDegree,
                targetKeyIndex,
                scaleDegrees,
                targetKey.accidental
            );
        }
    }

    /**
     * Convert chord notation to Nashville number.
     */
    static chordToNashville(chord: ChordNotation, sourceKey: AbsoluteKeyInfo): void {
        if (!(chord.note instanceof MusicNote)) {
            throw new Error("Chord is not in alphabetic notation");
        }

        // Pre-calculate key information
        const scaleDegrees = sourceKey.getScaleDegrees();
        const keyNote = AbstractNote.parse(sourceKey.root);
        const keyIndex = MusicTheory.getNoteIndex(keyNote);

        // Convert main note
        this.convertNoteToNashville(chord.note, keyIndex, scaleDegrees);

        // Convert bass note if present
        if (chord.bass) {
            this.convertNoteToNashville(chord.bass, keyIndex, scaleDegrees);
        }
    }
}

/**
 * Main transposer class that handles complete file transposition
 */
export class ChoproTransposer {

    constructor(private options: TransposeOptions) {
        this.validateOptions();
    }

    /**
     * Transpose a complete ChoPro file in place.
     */
    async transposeAsync(file: ChoproFile): Promise<TransposeResult> {
        try {
            this.transpose(file);

            return {
                success: true,
                song: file,
                errors: undefined,
            };
        } catch (error) {
            return {
                success: false,
                song: undefined,
                errors: [
                    error instanceof Error ? error.message : "Unknown error",
                ],
            };
        }
    }

    /**
     * Transpose a complete ChoPro file in place.
     */
    transpose(file: ChoproFile): void {
        file.blocks.forEach((block) => this.transposeBlock(block));
        this.transposeFrontmatter(file.frontmatter);
    }

    /**
     * Transpose a content block in place.
     */
    private transposeBlock(block: ContentBlock): void {
        if (block instanceof ChoproBlock) {
            block.lines.forEach((line) => this.transposeLine(line));
        }

        // other block types (e.g., MarkdownBlock) are not transposed
    }

    /**
     * Transpose a line in place.
     */
    private transposeLine(line: ChoproLine): void {
        if (line instanceof SegmentedLine) {
            line.segments.forEach((segment) => this.transposeSegment(segment));
        }

        // other line types (e.g., EmptyLine, CommentLine) are not transposed
    }

    /**
     * Transpose a line segment in place
     */
    private transposeSegment(segment: LineSegment): void {
        if (segment instanceof ChordNotation) {
            this.transposeChordSegment(segment);
        }

        // other segment types (e.g., TextSegment) are not transposed
    }

    /**
     * Transpose a chord segment in place
     */
    private transposeChordSegment(chord: ChordNotation): void {

        if (chord.note instanceof MusicNote) {
            this.transposeAlphaChordSegment(chord);

        } else if (chord.note instanceof NashvilleNumber) {
            this.transposeNashvilleChordSegment(chord);

        } else {
            throw new Error(`Unsupported note type: ${chord.note.constructor.name}`);
        }
    }

    /**
     * Transpose an Alpha chord segment in place.
     */
    private transposeAlphaChordSegment(chord: ChordNotation): void {
        if (!this.options.fromKey || !this.options.toKey) {
            throw new Error("source and target keys required for alphabetic notation");
        }

        const sourceKey = AbsoluteKeyInfo.parse(this.options.fromKey);
        const targetKey = AbsoluteKeyInfo.parse(this.options.toKey);

        // Convert from Alpha to Nashville if needed
        if (this.options.toKey === "##") {
            NashvilleTransposer.chordToNashville(chord, sourceKey);

        // Transpose from Alpha to Alpha
        } else {
            const interval = sourceKey.getIntervalTo(targetKey);

            NoteTransposer.transposeChord(
                chord,
                interval,
                targetKey.accidental
            );
        }
    }

    /**
     * Transpose a Nashville chord segment in place.
     */
    private transposeNashvilleChordSegment(chord: ChordNotation): void {
        if (!this.options.toKey) {
            throw new Error("target key required for Nashville notation");
        }

        // Convert from Nashville to Alpha if needed
        if (this.options.toKey !== "##") {
            const targetKey = AbsoluteKeyInfo.parse(this.options.toKey);
            NashvilleTransposer.nashvilleToChord(chord, targetKey);
        }
    }

    /**
     * Transpose frontmatter key property in place.
     */
    private transposeFrontmatter(frontmatter?: Frontmatter): void {
        if (!frontmatter || !this.options.toKey) {
            return;
        }

        if (frontmatter.has("key")) {
            frontmatter.set("key", this.options.toKey);
        }
    }

    /**
     * Validate transpose options.
     */
    private validateOptions(): void {
        if (this.options.fromKey) {
            try {
                AbsoluteKeyInfo.parse(this.options.fromKey);
            } catch (error) {
                throw new Error(`Invalid 'from' key format: ${error}`);
            }
        }

        if (this.options.toKey) {
            try {
                // Special case: "##" is used to indicate Nashville notation
                if (this.options.toKey !== "##") {
                    AbsoluteKeyInfo.parse(this.options.toKey);
                }
            } catch (error) {
                throw new Error(`Invalid 'to' key format: ${error}`);
            }
        }
    }
}

/**
 * Utility functions for the transpose modal.
 */
export class TransposeUtils {
    /**
     * Get all possible keys (for UI dropdown)
     */
    static getAllKeys(): string[] {
        const keys: string[] = [];

        for (const note of [
            "C",
            "C#",
            "Db",
            "D",
            "D#",
            "Eb",
            "E",
            "F",
            "F#",
            "Gb",
            "G",
            "G#",
            "Ab",
            "A",
            "A#",
            "Bb",
            "B",
        ]) {
            keys.push(note);
            keys.push(note + "m");
        }

        return keys.sort();
    }

    /**
     * Detect the key from a ChoPro file.
     */
    static detectKey(file: ChoproFile): AbsoluteKeyInfo | undefined {
        const keyString = file.key;
        if (keyString && this.isValidKey(keyString)) {
            return AbsoluteKeyInfo.parse(keyString);
        }

        // TODO: Implement key detection algorithm based on chord analysis
        // This would analyze the chords used to determine the most likely key

        return undefined;
    }

    /**
     * Validate if a string is a valid key.
     */
    static isValidKey(keyString: string): boolean {
        try {
            AbsoluteKeyInfo.parse(keyString);
            return true;
        } catch {
            return false;
        }
    }
}
