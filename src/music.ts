// music models and utilities for the ChoPro Plugin

/**
 * Musical accidental symbols.
 */
export enum Accidental {
    SHARP = "♯",
    FLAT = "♭",
    NATURAL = "♮",
}

/**
 * Scale types for different musical modes.
 */
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

/**
 * Abstract base class for musical notes.
 */
export abstract class AbstractNote {
    constructor(
        public root: string,
        public postfix?: string
    ) {
        this.root = root;
        this.postfix = postfix;
    }

    /**
     * Get the accidental type based on the postfix.
     */
    get accidental(): Accidental {
        switch (this.postfix) {
            case "#":
            case "♯":
            case "is":
                return Accidental.SHARP;
            case "b":
            case "♭":
            case "es":
            case "s":
                return Accidental.FLAT;
        }

        return Accidental.NATURAL;
    }

    /**
     * Parse a note string into the appropriate AbstractNote subclass.
     */
    static parse(noteString: string): AbstractNote {
        if (MusicNote.test(noteString)) {
            return MusicNote.parse(noteString);
        }

        if (NashvilleNumber.test(noteString)) {
            return NashvilleNumber.parse(noteString);
        }

        throw new Error("Invalid note format");
    }

    /**
     * Protected helper method to get the normalized accidental string.
     * @param normalize If true, return Unicode symbols, otherwise return original postfix
     */
    protected accidentalToString(normalize: boolean): string {
        if (!this.postfix) {
            return "";
        }

        if (normalize) {
            switch (this.accidental) {
                case Accidental.SHARP:
                    return "♯";
                case Accidental.FLAT:
                    return "♭";
                case Accidental.NATURAL:
                default:
                    return ""; // no symbol for natural notes
            }
        }

        return this.postfix;
    }

    /**
     * Convert the note to its string representation.
     * @param normalize If true, normalize accidentals to Unicode symbols (default: false)
     */
    toString(normalize: boolean = false): string {
        return this.root + this.accidentalToString(normalize);
    }

    /**
     * Check if this note is musically equal to another note.
     */
    equals(other: AbstractNote): boolean {
        if (this.root !== other.root) {
            return false;
        }

        if (this.accidental !== other.accidental) {
            return false;
        }

        return true;
    }
}

/**
 * Represents an alphabetic musical note (A-G).
 */
export class MusicNote extends AbstractNote {
    public static readonly PATTERN = /^([A-G])(♮|#|♯|b|♭|[ei]s)?$/;

    /**
     * Create a new MusicNote instance.
     */
    constructor(root: string, postfix?: string) {
        super(root.toUpperCase(), postfix);
    }

    /**
     * Test if a string matches the MusicNote pattern.
     */
    static test(noteString: string): boolean {
        return MusicNote.PATTERN.test(noteString);
    }

    /**
     * Parse a string into a MusicNote instance.
     */
    static parse(noteString: string): MusicNote {
        const match = noteString.match(MusicNote.PATTERN);

        if (!match) {
            throw new Error(`Invalid music note: ${noteString}`);
        }

        const root = match[1].toUpperCase();
        const postfix = match[2];

        return new MusicNote(root, postfix);
    }
}

/**
 * Represents a Nashville number notation (1-7).
 */
export class NashvilleNumber extends AbstractNote {
    public static readonly PATTERN = /^(#|♯|b|♭)?([1-7])$/;

    /**
     * Create a new NashvilleNumber instance.
     */
    constructor(root: number, postfix?: string) {
        super(root.toString(), postfix);
    }

    /**
     * Get the numeric degree value (1-7).
     */
    get degree(): number {
        return parseInt(this.root);
    }

    /**
     * Test if a string matches the NashvilleNumber pattern.
     */
    static test(noteString: string): boolean {
        return NashvilleNumber.PATTERN.test(noteString);
    }

    /**
     * Parse a string into a NashvilleNumber instance.
     */
    static parse(noteString: string): NashvilleNumber {
        const match = noteString.match(NashvilleNumber.PATTERN);

        if (!match) {
            throw new Error(`Invalid Nashville number: ${noteString}`);
        }

        const prefix = match[1];
        const root = match[2];

        return new NashvilleNumber(parseInt(root), prefix);
    }

    /**
     * Convert the Nashville number to its string representation with accidental prefix.
     * @param normalize If true, normalize accidentals to Unicode symbols (default: false)
     */
    toString(normalize: boolean = false): string {
        return this.accidentalToString(normalize) + this.root;
    }
}

/**
 * Abstract base class for musical key information.
 */
export abstract class KeyInfo {
    constructor(
        public root: AbstractNote,
        public accidental?: Accidental
    ) {}

    /**
     * Parse a key string into a KeyInfo object.
     */
    static parse(keyString: string): KeyInfo {
        if (keyString === "##") {
            return NashvilleKeyInfo.parse(keyString);
        }

        return AbsoluteKeyInfo.parse(keyString);
    }

    /**
     * Get scale degrees for this key.
     */
    abstract getScaleDegrees(): number[];

    /**
     * Get string representation of the key.
     */
    abstract toString(): string;
}

/**
 * Abstract base class for absolute key information.
 */
export abstract class AbsoluteKeyInfo extends KeyInfo {
    constructor(
        public root: MusicNote,
        public accidental?: Accidental
    ) {
        super(root, accidental);
    }

    /**
     * Parse a key string into an AbsoluteKeyInfo object.
     */
    static parse(keyString: string): AbsoluteKeyInfo {
        const match = keyString.match(/^([A-G])(#|♯|b|♭)?(m|min|minor)?$/);
        if (!match) {
            throw new Error(`Invalid key format: ${keyString}`);
        }

        const root = match[1].toUpperCase();
        const accidental = match[2] || "";
        const isMinor = !!match[3];

        let noteString = root;
        if (accidental) {
            noteString += accidental === "#" || accidental === "♯" ? "#" : "b";
        }

        const rootNote = MusicNote.parse(noteString);
        const preferredAccidental = MusicTheory.getPreferredAccidental(noteString);

        if (isMinor) {
            return new MinorKeyInfo(rootNote, preferredAccidental);
        }

        return new MajorKeyInfo(rootNote, preferredAccidental);
    }

    /**
     * Get the chromatic index of this key's root note.
     */
    getRootIndex(): number {
        return MusicTheory.getNoteIndex(this.root);
    }

    /**
     * Calculate the interval in semitones to another absolute key.
     */
    getIntervalTo(targetKey: AbsoluteKeyInfo): number {
        return MusicTheory.getInterval(this.root, targetKey.root);
    }

    /**
     * Check if this key is enharmonically equivalent to another key.
     */
    isEnharmonicWith(otherKey: AbsoluteKeyInfo): boolean {
        return this.getRootIndex() === otherKey.getRootIndex();
    }
}

/**
 * Abstract base class for modal key information.
 */
export abstract class ModalKeyInfo extends KeyInfo {}

/**
 * Abstract base class for relative key information.
 */
export abstract class RelativeKeyInfo extends KeyInfo {}

/**
 * Represents a major key with major scale intervals.
 */
export class MajorKeyInfo extends AbsoluteKeyInfo {
    public static readonly SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

    constructor(
        public root: MusicNote,
        public accidental?: Accidental
    ) {
        super(root, accidental);
    }

    /**
     * Get scale degrees for this major key.
     */
    getScaleDegrees(): number[] {
        return MajorKeyInfo.SCALE_INTERVALS;
    }

    /**
     * Get the relative minor key.
     */
    getRelativeMinor(): MinorKeyInfo {
        const minorRootIndex = (this.getRootIndex() + 9) % 12; // Down a minor third
        const minorRootName = MusicTheory.getPreferredNoteName(minorRootIndex, this.accidental);
        const preferredAccidental = MusicTheory.getPreferredAccidental(minorRootName);
        const minorRootNote = MusicNote.parse(minorRootName);
        return new MinorKeyInfo(minorRootNote, preferredAccidental);
    }

    /**
     * Get string representation of the major key.
     */
    toString(): string {
        return this.root.toString();
    }

    static parse(keyString: string): MajorKeyInfo {
        return AbsoluteKeyInfo.parse(keyString) as MajorKeyInfo;
    }
}

/**
 * Represents a minor key with natural minor scale intervals.
 */
export class MinorKeyInfo extends AbsoluteKeyInfo {
    public static readonly SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

    constructor(root: MusicNote, accidental?: Accidental) {
        super(root, accidental);
    }

    /**
     * Get scale degrees for this minor key.
     */
    getScaleDegrees(): number[] {
        return MinorKeyInfo.SCALE_INTERVALS;
    }

    /**
     * Get the relative major key.
     */
    getRelativeMajor(): MajorKeyInfo {
        const majorRootIndex = (this.getRootIndex() + 3) % 12; // Up a minor third
        const majorRootName = MusicTheory.getPreferredNoteName(majorRootIndex, this.accidental);
        const preferredAccidental = MusicTheory.getPreferredAccidental(majorRootName);
        const majorRootNote = MusicNote.parse(majorRootName);
        return new MajorKeyInfo(majorRootNote, preferredAccidental);
    }

    /**
     * Get string representation of the minor key.
     */
    toString(): string {
        return this.root.toString() + "m";
    }

    static parse(keyString: string): MinorKeyInfo {
        return AbsoluteKeyInfo.parse(keyString) as MinorKeyInfo;
    }
}

/**
 * Represents a Nashville number key notation.
 */
export class NashvilleKeyInfo extends RelativeKeyInfo {
    constructor() {
        super(new NashvilleNumber(1));
    }

    /**
     * Get scale degrees for Nashville notation (same as major scale).
     */
    getScaleDegrees(): number[] {
        return MajorKeyInfo.SCALE_INTERVALS;
    }

    /**
     * Get string representation of Nashville key.
     */
    toString(): string {
        return "##"; // Special marker for Nashville notation
    }

    /**
     * Parse a Nashville key string.
     */
    static parse(keyString: string): NashvilleKeyInfo {
        if (keyString === "##") {
            return new NashvilleKeyInfo();
        }

        throw new Error(`Invalid Nashville key format: ${keyString}`);
    }
}

/**
 * Music theory constants and utilities.
 */
export class MusicTheory {
    // chromatic scale with enharmonic equivalents
    public static readonly CHROMATIC_NOTES = [
        ["C"],
        ["C#", "Db"],
        ["D"],
        ["D#", "Eb"],
        ["E"],
        ["F"],
        ["F#", "Gb"],
        ["G"],
        ["G#", "Ab"],
        ["A"],
        ["A#", "Bb"],
        ["B"],
    ];

    // circle of fifths for determining preferred accidentals
    public static readonly SHARP_KEYS = ["C", "G", "D", "A", "E", "B", "F#", "C#"];
    public static readonly FLAT_KEYS = ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];

    /**
     * Get the chromatic index (0-11) for a note.
     */
    static getNoteIndex(note: AbstractNote): number {
        const rootIndex = this.getBaseNoteIndex(note.root);
        const accidentalOffset = this.getAccidentalOffset(note.accidental);
        return (rootIndex + accidentalOffset + 12) % 12;
    }

    /**
     * Get the base note index for A-G.
     */
    private static getBaseNoteIndex(root: string): number {
        const noteMap: Record<string, number> = {
            C: 0,
            D: 2,
            E: 4,
            F: 5,
            G: 7,
            A: 9,
            B: 11,
        };
        const index = noteMap[root.toUpperCase()];
        if (index === undefined) {
            throw new Error(`Invalid note root: ${root}`);
        }
        return index;
    }

    /**
     * Get the semitone offset for an accidental.
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
     * Get the preferred note name for a chromatic index based on key context.
     */
    static getPreferredNoteName(chromaticIndex: number, preferredAccidental?: Accidental): string {
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

        const naturalRoot = keyRoot.replace(/[#♯b♭]/g, "");

        if (naturalRoot === "F") {
            return Accidental.FLAT;
        }

        return Accidental.NATURAL;
    }

    /**
     * Calculate the interval between two notes in semitones.
     */
    static getInterval(fromNote: AbstractNote, toNote: AbstractNote): number {
        const fromIndex = this.getNoteIndex(fromNote);
        const toIndex = this.getNoteIndex(toNote);
        return (toIndex - fromIndex + 12) % 12;
    }
}
