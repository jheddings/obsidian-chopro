// transpose - chord conversion for the ChoPro Plugin

import { Logger } from "obskit";

import {
    BracketChord,
    LetterNotation,
    NashvilleNotation,
    ChoproFile,
    SegmentedLine,
    ChoproBlock,
    Frontmatter,
    LineSegment,
    ContentBlock,
    ChoproLine,
    ChordSegment,
} from "./parser";

import {
    Accidental,
    AbstractNote,
    MusicNote,
    NashvilleNumber,
    AbsoluteKeyInfo,
    NashvilleKeyInfo,
    KeyInfo,
    MusicTheory,
} from "./music";

export interface TransposeOptions {
    fromKey?: KeyInfo;
    toKey?: KeyInfo;
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
        if (interval === 0) {
            return;
        }

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
        chord: ChordSegment,
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
    /**
     * Convert a Nashville degree to a chromatic note index.
     */
    private static nashvilleDegreeToNoteIndex(note: NashvilleNumber, key: AbsoluteKeyInfo): number {
        const degree = note.degree - 1; // Convert to 0-based
        const scaleDegrees = key.getScaleDegrees();

        if (degree < 0 || degree >= scaleDegrees.length) {
            throw new Error(`Invalid Nashville degree: ${note.degree}`);
        }

        const keyIndex = MusicTheory.getNoteIndex(key.root);

        return (keyIndex + scaleDegrees[degree]) % 12;
    }

    /**
     * Convert a chromatic note index to Nashville degree.
     * Returns -1 if the note is not in the scale.
     */
    private static noteIndexToNashvilleDegree(note: MusicNote, key: AbsoluteKeyInfo): number {
        const noteIndex = MusicTheory.getNoteIndex(note);
        const keyIndex = MusicTheory.getNoteIndex(key.root);
        const scaleDegrees = key.getScaleDegrees();

        for (let i = 0; i < scaleDegrees.length; i++) {
            const expectedIndex = (keyIndex + scaleDegrees[i]) % 12;
            if (expectedIndex === noteIndex) {
                return i + 1; // Return 1-based degree
            }
        }
        return -1; // Not found in scale
    }

    /**
     * Convert a Nashville note to alphabetic notation and update in place.
     */
    private static convertNashvilleToAlpha(note: AbstractNote, key: AbsoluteKeyInfo): void {
        if (!(note instanceof NashvilleNumber)) {
            throw new Error("Note is not in Nashville notation");
        }

        const noteIndex = this.nashvilleDegreeToNoteIndex(note, key);
        const noteName = MusicTheory.getPreferredNoteName(noteIndex, key.accidental);
        const parsedNote = AbstractNote.parse(noteName);

        note.root = parsedNote.root;
        note.postfix = parsedNote.postfix;
    }

    /**
     * Convert an alphabetic note to Nashville notation and update in place.
     */
    private static convertAlphaToNashville(note: AbstractNote, key: AbsoluteKeyInfo): void {
        if (!(note instanceof MusicNote)) {
            throw new Error("Note is not in alphabetic notation");
        }

        const degree = this.noteIndexToNashvilleDegree(note, key);

        if (degree === -1) {
            throw new Error(
                `Cannot convert note ${note.toString()} to Nashville number - not in scale`
            );
        }

        note.root = degree.toString();
        note.postfix = undefined; // Clear accidentals for diatonic notes
    }

    /**
     * Convert Nashville number to chord notation.
     */
    static nashvilleToChord(nashvilleChord: NashvilleNotation, targetKey: AbsoluteKeyInfo): void {
        // Convert main note
        this.convertNashvilleToAlpha(nashvilleChord.note, targetKey);

        // Convert bass note if present
        if (nashvilleChord.bass) {
            if (!(nashvilleChord.bass instanceof NashvilleNumber)) {
                throw new Error("Bass note is not in Nashville notation");
            }

            this.convertNashvilleToAlpha(nashvilleChord.bass, targetKey);
        }
    }

    /**
     * Convert chord notation to Nashville number.
     */
    static chordToNashville(chord: LetterNotation, sourceKey: AbsoluteKeyInfo): void {
        // Convert main note
        this.convertAlphaToNashville(chord.note, sourceKey);

        // Convert bass note if present
        if (chord.bass) {
            if (!(chord.bass instanceof MusicNote)) {
                throw new Error("Bass note is not in alphabetic notation");
            }
            this.convertAlphaToNashville(chord.bass, sourceKey);
        }
    }
}

/**
 * Main transposer class that handles complete file transposition
 */
export class ChoproTransposer {
    private logger = Logger.getLogger("ChoproTransposer");

    constructor(private options: TransposeOptions) {
        this.validateOptions();
    }

    /**
     * Transpose a complete ChordPro file in place.
     */
    async transposeAsync(file: ChoproFile): Promise<TransposeResult> {
        this.logger.debug("Starting async transposition");

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
                errors: [error instanceof Error ? error.message : "Unknown error"],
            };
        }
    }

    /**
     * Transpose a complete ChordPro file in place.
     */
    transpose(file: ChoproFile): void {
        this.logger.debug(
            `Transposing ${file.blocks.length} blocks from ${this.options.fromKey?.toString()} to ${this.options.toKey?.toString()}`
        );

        file.blocks.forEach((block) => this.transposeBlock(block));

        if (!file.frontmatter) {
            file.frontmatter = new Frontmatter();
        }

        this.transposeFrontmatter(file.frontmatter);

        this.logger.debug("Transposition completed");
    }

    /**
     * Transpose a content block in place.
     */
    private transposeBlock(block: ContentBlock): void {
        if (block instanceof ChoproBlock) {
            this.logger.debug(`Transposing ${block.lines.length} lines`);

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
        if (segment instanceof ChordSegment) {
            this.transposeChordSegment(segment);
        } else if (segment instanceof BracketChord) {
            this.transposeChordSegment(segment.chord);
        }

        // other segment types (e.g., TextSegment) are not transposed
    }

    /**
     * Transpose a chord segment in place
     */
    private transposeChordSegment(chord: ChordSegment): void {
        if (chord instanceof LetterNotation) {
            this.transposeAlphaChordSegment(chord);
        } else if (chord instanceof NashvilleNotation) {
            this.transposeNashvilleChordSegment(chord);
        } else {
            throw new Error(`Unsupported chord notation type: ${chord.constructor.name}`);
        }
    }

    /**
     * Transpose an Alpha chord segment in place.
     */
    private transposeAlphaChordSegment(chord: LetterNotation): void {
        if (!this.options.fromKey || !this.options.toKey) {
            throw new Error("source and target keys required for alphabetic notation");
        }

        // Ensure we have absolute keys for alpha transposition
        if (!(this.options.fromKey instanceof AbsoluteKeyInfo)) {
            throw new Error("source key must be an absolute key for alphabetic notation");
        }

        const sourceKey = this.options.fromKey;

        // Convert from Alpha to Nashville if needed
        if (this.options.toKey instanceof NashvilleKeyInfo) {
            NashvilleTransposer.chordToNashville(chord, sourceKey);

            // Transpose from Alpha to Alpha
        } else if (this.options.toKey instanceof AbsoluteKeyInfo) {
            const targetKey = this.options.toKey;
            const interval = sourceKey.getIntervalTo(targetKey);

            NoteTransposer.transposeChord(chord, interval, targetKey.accidental);
        } else {
            throw new Error("Invalid target key type for alphabetic notation");
        }
    }

    /**
     * Transpose a Nashville chord segment in place.
     */
    private transposeNashvilleChordSegment(chord: NashvilleNotation): void {
        if (!this.options.toKey) {
            throw new Error("target key required for Nashville notation");
        }

        // Convert from Nashville to Alpha if needed
        if (this.options.toKey instanceof AbsoluteKeyInfo) {
            const targetKey = this.options.toKey;
            NashvilleTransposer.nashvilleToChord(chord, targetKey);
        }
        // If target is also Nashville, no conversion needed
    }

    /**
     * Transpose frontmatter key property in place.
     */
    private transposeFrontmatter(frontmatter: Frontmatter): void {
        if (this.options.toKey instanceof AbsoluteKeyInfo) {
            frontmatter.set("key", this.options.toKey.toString());
        } else {
            frontmatter.remove("key");
        }
    }

    /**
     * Validate transpose options.
     */
    private validateOptions(): void {
        if (this.options.fromKey) {
            if (!(this.options.fromKey instanceof KeyInfo)) {
                throw new Error("Invalid 'from' key: must be a KeyInfo instance");
            }
        }

        if (this.options.toKey) {
            if (!(this.options.toKey instanceof KeyInfo)) {
                throw new Error("Invalid 'to' key: must be a KeyInfo instance");
            }
        }
    }
}

/**
 * Utility functions for the transpose modal.
 */
export class TransposeUtils {
    private static logger = Logger.getLogger("TransposeUtils");

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
            keys.push(note + "m"); // Add minor keys
        }

        return keys.sort();
    }

    /**
     * Get all possible KeyInfo objects.
     */
    static getAllKeyInfos(): KeyInfo[] {
        const keys: KeyInfo[] = [];

        for (const keyString of this.getAllKeys()) {
            try {
                keys.push(KeyInfo.parse(keyString));
            } catch {
                // Skip invalid keys
            }
        }

        return keys;
    }

    /**
     * Detect the key from a ChordPro file.
     */
    static detectKey(file: ChoproFile): KeyInfo | undefined {
        TransposeUtils.logger.debug("Starting key detection");

        const keyString = file.key;
        if (keyString && this.isValidKey(keyString)) {
            TransposeUtils.logger.debug(`Key detected from frontmatter: ${keyString}`);
            return KeyInfo.parse(keyString);
        }

        TransposeUtils.logger.debug("No valid key found in frontmatter");
        // TODO: Implement key detection algorithm based on chord analysis
        // This would analyze the chords used to determine the most likely key

        TransposeUtils.logger.warn("Key detection failed - no key found");
        return undefined;
    }

    /**
     * Validate if a string is a valid key.
     */
    static isValidKey(keyString: string): boolean {
        try {
            KeyInfo.parse(keyString);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Parse a key string into a KeyInfo object.
     */
    static parseKey(keyString: string): KeyInfo {
        return KeyInfo.parse(keyString);
    }

    /**
     * Convert a KeyInfo object to its string representation.
     */
    static keyToString(key: KeyInfo): string {
        return key.toString();
    }
}
