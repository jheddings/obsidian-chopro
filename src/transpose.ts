// transpose - chord conversion for the ChoPro Plugin

import {
    ChordNotation,
    ChoproFile,
    SegmentedLine,
    ChoproBlock,
    Frontmatter,
    MusicalNote,
    NoteType,
    Accidental,
    LineSegment,
    ContentBlock,
    ChoproLine,
} from "./parser";

export interface TransposeOptions {
    fromKey?: string;
    toKey?: string;
}

export enum KeyQuality {
    MAJOR = "major",
    MINOR = "minor",
}

export enum ScaleType {
    MAJOR = "major",
    MINOR = "minor",
    // Future modal scales
    DORIAN = "dorian",
    PHRYGIAN = "phrygian",
    LYDIAN = "lydian",
    MIXOLYDIAN = "mixolydian",
    AEOLIAN = "aeolian",
    LOCRIAN = "locrian",
}

export interface TransposeResult {
    success: boolean;
    song: ChoproFile | undefined;
    errors?: string[];
}

export class MusicalKey {
    constructor(
        public root: string,
        public quality: KeyQuality,
        public accidental?: Accidental
    ) {}

    /**
     * Parse a key string (e.g., "C", "Am", "F#m") into a MusicalKey object
     */
    static parse(keyString: string): MusicalKey {
        const match = keyString.match(/^([A-G])(#|♯|b|♭)?(m|min|minor)?$/);
        if (!match) {
            throw new Error(`Invalid key format: ${keyString}`);
        }

        const root = match[1].toUpperCase();
        const accidental = match[2] || "";
        const quality = match[3] ? KeyQuality.MINOR : KeyQuality.MAJOR;

        let fullRoot = root;
        if (accidental) {
            fullRoot += accidental === "#" || accidental === "♯" ? "#" : "b";
        }

        const preferredAccidental = MusicTheory.getPreferredAccidental(fullRoot);

        return new MusicalKey(fullRoot, quality, preferredAccidental);
    }

    /**
     * Get scale degrees for this key
     */
    getScaleDegrees(): number[] {
        return this.quality === KeyQuality.MAJOR
            ? MusicTheory.MAJOR_SCALE_INTERVALS
            : MusicTheory.MINOR_SCALE_INTERVALS;
    }

    /**
     * Get string representation of the key
     */
    toString(): string {
        return this.root + (this.quality === KeyQuality.MINOR ? 'm' : '');
    }
}

/**
 * Music theory constants and utilities
 */
export class MusicTheory {
    // chromatic scale with enharmonic equivalents
    public static readonly CHROMATIC_NOTES = [
        ["C"],        // 0
        ["C#", "Db"], // 1
        ["D"],        // 2
        ["D#", "Eb"], // 3
        ["E"],        // 4
        ["F"],        // 5
        ["F#", "Gb"], // 6
        ["G"],        // 7
        ["G#", "Ab"], // 8
        ["A"],        // 9
        ["A#", "Bb"], // 10
        ["B"],        // 11
    ];

    // circle of fifths for determining preferred accidentals
    public static readonly SHARP_KEYS = ["C", "G", "D", "A", "E", "B", "F#", "C#"];
    public static readonly FLAT_KEYS = ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];

    // scale intervals (semitone distances)
    public static readonly MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
    public static readonly MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

    /**
     * Get the chromatic index (0-11) for a note
     */
    static getNoteIndex(note: MusicalNote): number {
        const rootIndex = this.getBaseNoteIndex(note.root);
        const accidentalOffset = this.getAccidentalOffset(note.accidental);
        return (rootIndex + accidentalOffset + 12) % 12;
    }

    /**
     * Get the base note index for A-G
     */
    private static getBaseNoteIndex(root: string): number {
        const noteMap: { [key: string]: number } = {
            C: 0,
            D: 2,
            E: 4,
            F: 5,
            G: 7,
            A: 9,
            B: 11,
        };
        return noteMap[root.toUpperCase()] ?? 0;
    }

    /**
     * Get the semitone offset for an accidental
     */
    private static getAccidentalOffset(accidental: Accidental): number {
        switch (accidental) {
            case Accidental.SHARP:
                return 1;
            case Accidental.FLAT:
                return -1;
            case Accidental.NATURAL:
            default:
                return 0;
        }
    }

    /**
     * Get the preferred note name for a chromatic index based on key context
     */
    static getPreferredNoteName(
        chromaticIndex: number,
        preferredAccidental?: Accidental
    ): string {
        const noteOptions = this.CHROMATIC_NOTES[chromaticIndex];

        if (noteOptions.length === 1) {
            return noteOptions[0];
        }

        if (preferredAccidental === Accidental.SHARP) {
            return noteOptions.find((note) => note.includes("#")) || noteOptions[0];
        } else if (preferredAccidental === Accidental.FLAT) {
            return noteOptions.find((note) => note.includes("b")) || noteOptions[0];
        }

        return noteOptions[0];
    }

    /**
     * Determine preferred accidental for a key.
     */
    static getPreferredAccidental(keyRoot: string): Accidental {
        if (keyRoot.includes("#") || keyRoot.includes("♯")) {
            return Accidental.SHARP;
        } else if (keyRoot.includes("b") || keyRoot.includes("♭")) {
            return Accidental.FLAT;
        }
        
        const naturalRoot = keyRoot.replace(/[#♯b♭]/g, '');
        
        if (naturalRoot === 'F') {
            return Accidental.FLAT;
        }
        
        return Accidental.NATURAL;
    }

    /**
     * Calculate the interval between two notes in semitones
     */
    static getInterval(fromNote: MusicalNote, toNote: MusicalNote): number {
        const fromIndex = this.getNoteIndex(fromNote);
        const toIndex = this.getNoteIndex(toNote);
        return (toIndex - fromIndex + 12) % 12;
    }
}

/**
 * Handles transposition of individual notes and chords
 */
export class NoteTransposer {

    /**
     * Transpose a note by a given interval.
     */
    static transposeNote(
        note: MusicalNote,
        interval: number,
        preferredAccidental?: Accidental
    ): void {
        const originalIndex = MusicTheory.getNoteIndex(note);
        const newIndex = (originalIndex + interval + 12) % 12;
        const newNoteName = MusicTheory.getPreferredNoteName(newIndex, preferredAccidental);

        const newNote = MusicalNote.parse(newNoteName);
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

    /**
     * Convert Nashville number to chord notation.
     */
    static nashvilleToChord(nashvilleChord: ChordNotation, targetKey: MusicalKey): void {
        if (nashvilleChord.note.noteType !== NoteType.NASHVILLE) {
            throw new Error("Chord is not in Nashville notation");
        }

        const degree = parseInt(nashvilleChord.note.root) - 1; // Convert to 0-based
        if (degree < 0 || degree > 6) {
            throw new Error(
                `Invalid Nashville number: ${nashvilleChord.note.root}`
            );
        }

        const scaleDegrees = targetKey.getScaleDegrees();
        const targetKeyNote = MusicalNote.parse(targetKey.root);
        const targetKeyIndex = MusicTheory.getNoteIndex(targetKeyNote);

        const targetNoteIndex = (targetKeyIndex + scaleDegrees[degree]) % 12;
        const targetNoteName = MusicTheory.getPreferredNoteName(
            targetNoteIndex,
            targetKey.accidental
        );
        const targetNote = MusicalNote.parse(targetNoteName);

        // update the note in place
        nashvilleChord.note.root = targetNote.root;
        nashvilleChord.note.postfix = targetNote.postfix;

        if (nashvilleChord.bass) {
            const bassDegree = parseInt(nashvilleChord.bass.root) - 1;
            if (bassDegree >= 0 && bassDegree <= 6) {
                const bassIndex =
                    (targetKeyIndex + scaleDegrees[bassDegree]) % 12;
                const bassNoteName = MusicTheory.getPreferredNoteName(
                    bassIndex,
                    targetKey.accidental
                );
                const newBass = MusicalNote.parse(bassNoteName);
                nashvilleChord.bass.root = newBass.root;
                nashvilleChord.bass.postfix = newBass.postfix;
            }
        }
    }

    /**
     * Convert chord notation to Nashville number.
     */
    static chordToNashville(chord: ChordNotation, sourceKey: MusicalKey): void {
        if (chord.note.noteType !== NoteType.ALPHA) {
            throw new Error("Chord is not in alphabetic notation");
        }

        const targetKeyNote = MusicalNote.parse(sourceKey.root);
        const targetKeyIndex = MusicTheory.getNoteIndex(targetKeyNote);
        const chordIndex = MusicTheory.getNoteIndex(chord.note);
        const scaleDegrees = sourceKey.getScaleDegrees();

        // Find the scale degree
        for (let i = 0; i < scaleDegrees.length; i++) {
            const expectedIndex = (targetKeyIndex + scaleDegrees[i]) % 12;
            if (expectedIndex === chordIndex) {
                const nashvilleRoot = (i + 1).toString();
                chord.note.root = nashvilleRoot;
                return;
            }
        }

        throw new Error(
            `Cannot convert ${chord.note.toString()} to Nashville number in key of ${sourceKey.root}`
        );
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
    async transposeFileAsync(file: ChoproFile): Promise<TransposeResult> {
        try {
            this.transposeFile(file);

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
    transposeFile(file: ChoproFile): void {
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
    }

    /**
     * Transpose a chord segment in place
     */
    private transposeChordSegment(chord: ChordNotation): void {

        if (chord.note.noteType === NoteType.ALPHA) {
            this.transposeAlphaChordSegment(chord);

        } else if (chord.note.noteType === NoteType.NASHVILLE) {
            this.transposeNashvilleChordSegment(chord);

        } else {
            throw new Error(`Unsupported note type: ${chord.note.noteType}`);
        }
    }

    /**
     * Transpose an Alpha chord segment in place.
     */
    private transposeAlphaChordSegment(chord: ChordNotation): void {
        if (!this.options.fromKey || !this.options.toKey) {
            throw new Error("source and target keys required for alphabetic notation");
        }

        const sourceKey = MusicalKey.parse(this.options.fromKey);
        const targetKey = MusicalKey.parse(this.options.toKey);

        const interval = MusicTheory.getInterval(
            MusicalNote.parse(sourceKey.root),
            MusicalNote.parse(targetKey.root)
        );

        NoteTransposer.transposeChord(
            chord,
            interval,
            targetKey.accidental
        );
    }

    /**
     * Transpose a Nashville chord segment in place.
     */
    private transposeNashvilleChordSegment(chord: ChordNotation): void {
        if (!this.options.toKey) {
            throw new Error("target key required for Nashville notation");
        }

        // TODO
        throw new Error("not yet implemented");
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
                MusicalKey.parse(this.options.fromKey);
            } catch (error) {
                throw new Error(`Invalid 'from' key format: ${error}`);
            }
        }

        if (this.options.toKey) {
            try {
                MusicalKey.parse(this.options.toKey);
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
    static detectKey(file: ChoproFile): string | undefined {
        if (file.frontmatter?.has("key")) {
            return file.frontmatter.get("key");
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
            MusicalKey.parse(keyString);
            return true;
        } catch {
            return false;
        }
    }
}
