// parser - parsing elements and data structures for ChoPro plugin

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { AbstractNote, MusicNote, NashvilleNumber } from "./music";

export abstract class LineSegment {
    constructor() {}
}

export class TextSegment extends LineSegment {
    constructor(public content: string) {
        super();
    }

    /**
     * Convert the text segment to its normalized ChordPro representation.
     */
    toString(): string {
        return this.content;
    }
}

export class Annotation extends LineSegment {
    public static readonly PATTERN = /^\[\*([^\*]+)\]$/;

    constructor(public content: string) {
        super();
    }

    static test(content: string): boolean {
        return Annotation.PATTERN.test(content);
    }

    static parse(content: string): Annotation {
        const match = content.match(Annotation.PATTERN);

        if (!match) {
            throw new Error("Invalid annotation format");
        }

        return new Annotation(match[1]);
    }

    /**
     * Convert the annotation to its normalized ChordPro representation.
     */
    toString(): string {
        return `[*${this.content}]`;
    }
}

/**
 * Represents a chord segment in a ChordPro line.
 */
export abstract class ChordSegment extends LineSegment {
    constructor(
        public note: AbstractNote,
        public modifier?: string,
        public bass?: AbstractNote
    ) {
        super();
    }

    static test(content: string): boolean {
        if (LetterNotation.test(content)) {
            return true;
        }

        if (NashvilleNotation.test(content)) {
            return true;
        }

        return false;
    }

    static parse(content: string): ChordSegment {
        if (LetterNotation.test(content)) {
            return LetterNotation.parse(content);
        }

        if (NashvilleNotation.test(content)) {
            return NashvilleNotation.parse(content);
        }

        throw new Error("Invalid chord format");
    }

    /**
     * Get the normalized chord quality in standard form.
     */
    get quality(): string | undefined {
        if (!this.modifier) return undefined;

        let normalized = this.modifier;

        // Delta (Δ) to maj
        normalized = normalized.replace(/Δ/g, "maj");

        // Full-diminished (o) to dim
        normalized = normalized.replace(/(?<!ø)o(?!f)/g, "dim");

        // Half-diminished (ø) to m7b5
        normalized = normalized.replace(/ø7?/g, "m7b5");

        // Plus (+) to aug (but preserve existing +)
        normalized = normalized.replace(/\+(?!.*aug)/g, "aug");

        // Normalize accidentals within chord modifiers
        normalized = normalized.replace(/#/g, "♯");
        normalized = normalized.replace(/b/g, "♭");

        return normalized.toLowerCase();
    }

    /**
     * Convert the chord notation to its ChordPro representation.
     * @param normalize If true, normalize accidentals and chord qualities (default: false)
     */
    toString(normalize: boolean = false): string {
        let chordString = this.note.toString(normalize);

        if (this.modifier) {
            if (normalize) {
                chordString += this.quality;
            } else {
                chordString += this.modifier;
            }
        }

        if (this.bass) {
            chordString += `/${this.bass.toString(normalize)}`;
        }

        return chordString;
    }
}

/**
 * Represents a chord notation using alphabetic note names (A-G).
 */
export class LetterNotation extends ChordSegment {
    public static readonly PATTERN = /^([A-G](?:♮|#|♯|b|♭|[ei]s)?)([^\/\]]+)?(?:\/(.+))?$/;

    constructor(
        public note: MusicNote,
        public modifier?: string,
        public bass?: AbstractNote
    ) {
        super(note, modifier, bass);
    }

    static test(content: string): boolean {
        return LetterNotation.PATTERN.test(content);
    }

    static parse(content: string): LetterNotation {
        const match = content.match(LetterNotation.PATTERN);

        if (!match) {
            throw new Error("Invalid letter notation: must use A-G note names");
        }

        const noteString = match[1];
        const modifier = match[2] && match[2] !== "" ? match[2] : undefined;
        const bassString = match[3] ? match[3] : undefined;

        if (!MusicNote.test(noteString)) {
            throw new Error("Invalid letter notation: must use A-G note names");
        }

        const primaryNote = MusicNote.parse(noteString);
        const bassNote = bassString ? AbstractNote.parse(bassString) : undefined;

        return new LetterNotation(primaryNote, modifier, bassNote);
    }
}

/**
 * Represents a chord notation using Nashville number system (1-7).
 */
export class NashvilleNotation extends ChordSegment {
    public static readonly PATTERN = /^((#|♯|b|♭)?[1-7])([^\/\]]+)?(?:\/(.+))?$/;

    constructor(
        public note: NashvilleNumber,
        public modifier?: string,
        public bass?: AbstractNote
    ) {
        super(note, modifier, bass);
    }

    static test(content: string): boolean {
        return NashvilleNotation.PATTERN.test(content);
    }

    static parse(content: string): NashvilleNotation {
        const match = content.match(NashvilleNotation.PATTERN);

        if (!match) {
            throw new Error("Invalid Nashville notation: must use 1-7 numbers");
        }

        const noteString = match[1];
        const modifier = match[3] && match[3] !== "" ? match[3] : undefined;
        const bassString = match[4] ? match[4] : undefined;

        if (!NashvilleNumber.test(noteString)) {
            throw new Error("Invalid Nashville notation: must use 1-7 numbers");
        }

        const primaryNote = NashvilleNumber.parse(noteString);
        const bassNote = bassString ? AbstractNote.parse(bassString) : undefined;

        return new NashvilleNotation(primaryNote, modifier, bassNote);
    }

    /**
     * Get the numeric degree of the root note.
     */
    get degree(): number {
        return this.note.degree;
    }
}

export class BracketChord extends LineSegment {
    public static readonly PATTERN = /^\[([^\]]+)\]$/;

    constructor(public chord: ChordSegment) {
        super();
    }

    static test(content: string): boolean {
        const match = content.match(BracketChord.PATTERN);

        if (!match) {
            return false;
        }

        return ChordSegment.test(match[1]);
    }

    static parse(content: string): BracketChord {
        const match = content.match(BracketChord.PATTERN);

        if (!match) {
            throw new Error("Invalid chord notation format");
        }

        const chord = ChordSegment.parse(match[1]);

        return new BracketChord(chord);
    }

    /**
     * Convert the bracketed chord to its normalized ChordPro representation.
     */
    toString(normalize: boolean = false): string {
        return `[${this.chord.toString(normalize)}]`;
    }
}

/**
 * Wraps a segment with its line index to retain position information.
 */
export class IndexedSegment extends LineSegment {
    constructor(
        public segment: LineSegment,
        public lineIndex: number
    ) {
        super();
    }

    /**
     * Return the string representation of the contained segment.
     */
    toString(): string {
        return this.segment.toString();
    }
}

/**
 * Base class for all lines in a ChordPro block.
 */
export abstract class ChoproLine {
    constructor() {}

    /**
     * Factory method to parse a line into the appropriate subclass
     */
    static parse(line: string): ChoproLine | null {
        if (EmptyLine.test(line)) {
            return EmptyLine.parse(line);
        }

        if (CommentLine.test(line)) {
            return CommentLine.parse(line);
        }

        if (InstrumentalLine.test(line)) {
            return InstrumentalLine.parse(line);
        }

        if (ChordLyricsLine.test(line)) {
            return ChordLyricsLine.parse(line);
        }

        if (ChordLine.test(line)) {
            return ChordLine.parse(line);
        }

        // default to text line
        return TextLine.parse(line);
    }

    /**
     * Return this line as a string.
     */
    abstract toString(): string;
}

export class EmptyLine extends ChoproLine {
    constructor() {
        super();
    }

    static test(line: string): boolean {
        if (line.includes("\n")) {
            return false;
        }
        return line.trim() === "";
    }

    static parse(line: string): EmptyLine {
        if (!EmptyLine.test(line)) {
            throw new Error("line is not empty");
        }
        return new EmptyLine();
    }

    /**
     * Convert the empty line to its normalized ChordPro representation.
     */
    toString(): string {
        return "";
    }
}

export class TextLine extends ChoproLine {
    constructor(public content: string) {
        super();
    }

    static test(line: string): boolean {
        return line.trim() !== "";
    }

    static parse(line: string): TextLine {
        return new TextLine(line);
    }

    /**
     * Convert the text line to its normalized ChordPro representation.
     */
    toString(): string {
        return this.content;
    }
}

export class CommentLine extends ChoproLine {
    public static readonly LINE_PATTERN = /^#+\s*(.*)$/;

    constructor(public content: string) {
        super();
    }

    static test(line: string): boolean {
        return CommentLine.LINE_PATTERN.test(line);
    }

    static parse(line: string): CommentLine {
        const match = line.match(CommentLine.LINE_PATTERN);
        const content = match ? match[1] : line;
        return new CommentLine(content);
    }

    /**
     * Convert the comment line to its normalized ChordPro representation.
     */
    toString(): string {
        return `# ${this.content}`;
    }
}

export abstract class SegmentedLine extends ChoproLine {
    public static readonly INLINE_MARKER_PATTERN = /\[([^\]]+)\]/;

    constructor(public segments: LineSegment[]) {
        super();
    }

    /**
     * Get all chord notation segments from this line.
     */
    get chords(): BracketChord[] {
        return this.segments.filter((segment) => segment instanceof BracketChord) as BracketChord[];
    }

    /**
     * Get all text segments from this line.
     */
    get lyrics(): TextSegment[] {
        return this.segments.filter((segment) => segment instanceof TextSegment) as TextSegment[];
    }

    static test(line: string): boolean {
        return SegmentedLine.INLINE_MARKER_PATTERN.test(line);
    }

    static parse(line: string): SegmentedLine {
        if (ChordLyricsLine.test(line)) {
            return ChordLyricsLine.parse(line);
        }

        if (InstrumentalLine.test(line)) {
            return InstrumentalLine.parse(line);
        }

        throw new Error("invalid line format for SegmentedLine");
    }

    protected static parseLineSegments(line: string): LineSegment[] {
        const segments: LineSegment[] = [];
        const allMarkers = new RegExp(SegmentedLine.INLINE_MARKER_PATTERN.source, "g");
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = allMarkers.exec(line)) !== null) {
            // Add text before the chord (if any)
            SegmentedLine.addTextSegmentIfNotEmpty(segments, line, lastIndex, match.index);

            const segment = SegmentedLine.parseLineSegment(match[0]);
            segments.push(segment);

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text after the last chord
        SegmentedLine.addTextSegmentIfNotEmpty(segments, line, lastIndex, line.length);

        return segments;
    }

    protected static parseLineSegment(marker: string): LineSegment {
        if (Annotation.test(marker)) {
            return Annotation.parse(marker);
        }

        if (LetterNotation.test(marker)) {
            return LetterNotation.parse(marker);
        }

        if (NashvilleNotation.test(marker)) {
            return NashvilleNotation.parse(marker);
        }

        if (BracketChord.test(marker)) {
            return BracketChord.parse(marker);
        }

        return new TextSegment(marker);
    }

    protected static addTextSegmentIfNotEmpty(
        segments: LineSegment[],
        line: string,
        startIndex: number,
        endIndex: number
    ): void {
        if (endIndex > startIndex) {
            const textContent = line.substring(startIndex, endIndex);
            segments.push(new TextSegment(textContent));
        }
    }

    /**
     * Convert the chord line to its normalized ChordPro representation.
     */
    toString(): string {
        return this.segments.map((segment) => segment.toString()).join("");
    }
}

export class ChordLyricsLine extends SegmentedLine {
    static test(line: string): boolean {
        return SegmentedLine.test(line) && !InstrumentalLine.test(line);
    }

    static parse(line: string): ChordLyricsLine {
        const segments = SegmentedLine.parseLineSegments(line);
        return new ChordLyricsLine(segments);
    }
}

export class InstrumentalLine extends SegmentedLine {
    static test(line: string): boolean {
        if (!SegmentedLine.test(line)) {
            return false;
        }

        const allMarkers = new RegExp(SegmentedLine.INLINE_MARKER_PATTERN.source, "g");
        const withoutChords = line.replace(allMarkers, "");
        return withoutChords.trim() === "";
    }

    static parse(line: string): InstrumentalLine {
        const segments = SegmentedLine.parseLineSegments(line);
        return new InstrumentalLine(segments);
    }
}

export class ChordLine extends ChoproLine {
    private static readonly CHORD_LINE_THRESHOLD = 0.51;
    private static readonly FIND_WORD_PATTERN = /\S+/g;

    constructor(public segments: LineSegment[]) {
        super();
    }

    static test(line: string): boolean {
        if (SegmentedLine.test(line)) {
            return false;
        }

        let match: RegExpExecArray | null;
        let validChordCount = 0;
        let totalWords = 0;

        while ((match = ChordLine.FIND_WORD_PATTERN.exec(line)) !== null) {
            totalWords++;

            if (ChordSegment.test(match[0])) {
                validChordCount++;
            }
        }

        const ratio = validChordCount / totalWords;
        return ratio >= ChordLine.CHORD_LINE_THRESHOLD;
    }

    static parse(line: string): ChordLine {
        const segments: IndexedSegment[] = [];
        let match: RegExpExecArray | null;

        while ((match = ChordLine.FIND_WORD_PATTERN.exec(line)) !== null) {
            let segment: LineSegment;
            const segmentText = match[0];

            if (ChordSegment.test(segmentText)) {
                segment = ChordSegment.parse(segmentText);
            } else {
                segment = new TextSegment(segmentText);
            }

            // wrap the segment in an IndexedSegment to retain position
            const idx = new IndexedSegment(segment, match.index);

            segments.push(idx);
        }

        return new ChordLine(segments);
    }

    /**
     * Return this line as a string.
     */
    toString(): string {
        if (this.segments.length === 0) {
            return "";
        }

        const indexedSegments = this.segments as IndexedSegment[];

        // calculate the total length based on the last segment's actual content
        const lastSegment = indexedSegments[indexedSegments.length - 1];
        const lastSegmentContent = lastSegment.segment.toString();
        const lineLength = lastSegment.lineIndex + lastSegmentContent.length;

        let chars = Array(lineLength).fill(" ");

        for (const seg of indexedSegments) {
            const segStr = seg.segment.toString();
            for (let i = 0; i < segStr.length; i++) {
                chars[seg.lineIndex + i] = segStr[i];
            }
        }

        return chars.join("");
    }
}

/**
 * Base class for content blocks that can be rendered.
 */
export abstract class ContentBlock {
    constructor() {}

    /**
     * Convert the block to its string representation.
     */
    abstract toString(): string;
}

/**
 * Represents a frontmatter block containing properties serialized as YAML.
 */
export class Frontmatter extends ContentBlock {
    public static readonly BLOCK_PATTERN = /^---\n(([\s\S]*)\n)?---$/;

    constructor(public properties: Record<string, any> = {}) {
        super();
    }

    /**
     * Test if content represents a frontmatter block.
     */
    static test(content: string): boolean {
        return Frontmatter.extract(content) !== undefined;
    }

    /**
     * Create a Frontmatter block from full frontmatter content (including --- delimiters).
     */
    static parse(content: string): Frontmatter {
        const props = Frontmatter.extract(content);

        if (props === undefined) {
            throw new Error("Invalid frontmatter");
        }

        return new Frontmatter(props);
    }

    /**
     * Extract the frontmatter records from a string.
     */
    private static extract(content: string): Record<string, any> | undefined {
        const match = content.match(Frontmatter.BLOCK_PATTERN);

        if (!match) {
            return undefined;
        }

        try {
            return parseYaml(match[1]) as Record<string, any>;
        } catch (error) {
            console.warn("Failed to parse frontmatter:", error);
        }

        return undefined;
    }

    /**
     * Get a property value by key.
     */
    get(key: string): any {
        return this.properties[key];
    }

    /**
     * Set a property value.
     */
    set(key: string, value: any): void {
        this.properties[key] = value;
    }

    /**
     * Check if a property exists.
     */
    has(key: string): boolean {
        return key in this.properties;
    }

    /**
     * Remove a property.
     */
    remove(key: string): void {
        delete this.properties[key];
    }

    /**
     * Get all property keys.
     */
    keys(): string[] {
        return Object.keys(this.properties);
    }

    /**
     * Convert the frontmatter to YAML string representation.
     */
    toString(): string {
        return "---\n" + stringifyYaml(this.properties) + "---";
    }
}

/**
 * Represents a block of ChordPro content, containing multiple lines.
 */
export class ChoproBlock extends ContentBlock {
    static BLOCK_PATTERN = /^```chopro\n(([\s\S]*)\n)?```$/m;

    constructor(public lines: ChoproLine[]) {
        super();
    }

    /**
     * Test if content represents a ChordPro block.
     */
    static test(content: string): boolean {
        return ChoproBlock.BLOCK_PATTERN.test(content);
    }

    /**
     * Create a ChoproBlock by parsing the block content.
     */
    static parse(content: string): ChoproBlock {
        const match = content.match(ChoproBlock.BLOCK_PATTERN);

        if (!match) {
            throw new Error("Invalid chopro block format");
        }

        if (match[2] === undefined) {
            return new ChoproBlock([]);
        }

        return ChoproBlock.parseRaw(match[2]);
    }

    /**
     * Attempt to parse raw content into a ChoproBlock.
     */
    static parseRaw(content: string): ChoproBlock {
        const lines = content.split("\n");
        return ChoproBlock.parseLines(lines);
    }

    /**
     * Parse multiple lines into a ChoproBlock.
     */
    static parseLines(lines: string[]): ChoproBlock {
        const choproLines: ChoproLine[] = [];
        for (const line of lines) {
            const parsedLine = ChoproLine.parse(line);

            if (parsedLine !== null) {
                choproLines.push(parsedLine);
            }
        }
        return new ChoproBlock(choproLines);
    }

    /**
     * Convert the block to its normalized ChordPro representation.
     */
    toString(): string {
        let content = "```chopro\n";

        if (this.lines.length > 0) {
            content += this.lines.map((line) => line.toString()).join("\n");
            content += "\n```";
        } else {
            content += "```";
        }

        return content;
    }
}

/**
 * Represents a block of generic markdown content.
 */
export class MarkdownBlock extends ContentBlock {
    constructor(public content: string) {
        super();
    }

    /**
     * Test if content represents a markdown block.
     */
    static test(_content: string): boolean {
        return true;
    }

    /**
     * Create a MarkdownBlock from content.
     */
    static parse(content: string): MarkdownBlock {
        return new MarkdownBlock(content);
    }

    /**
     * Convert the markdown block to its string representation.
     */
    toString(): string {
        return this.content;
    }
}

/**
 * Represents a complete ChordPro file containing frontmatter and content blocks.
 */
export class ChoproFile {
    public frontmatter?: Frontmatter;
    public blocks: ContentBlock[] = [];

    constructor(frontmatter?: Frontmatter, blocks: ContentBlock[] = []) {
        this.frontmatter = frontmatter;
        this.blocks = blocks;
    }

    /**
     * Get the key from the file properties, or undefined if none exists.
     */
    get key(): string | undefined {
        return this.frontmatter?.get("key");
    }

    /**
     * Parse a complete ChordPro file from source text.
     */
    static parse(source: string): ChoproFile {
        let frontmatter: Frontmatter | undefined;
        let remainingContent = source;

        // check for frontmatter (only at the beginning)
        // this pattern is similar to Frontmatter.BLOCK_PATTERN, without the end anchor
        const frontmatterMatch = source.match(/^---\n(([\s\S]*?)\n)?---/m);

        if (frontmatterMatch) {
            frontmatter = Frontmatter.parse(frontmatterMatch[0]);
            remainingContent = source.substring(frontmatterMatch[0].length);
        }

        const blocks = ChoproFile.parseContentBlocks(remainingContent);

        return new ChoproFile(frontmatter, blocks);
    }

    /**
     * Load a ChordPro file from a given filename.
     */
    static load(path: string): ChoproFile {
        const fs = require("fs");
        const fileContent = fs.readFileSync(path, "utf-8");
        return ChoproFile.parse(fileContent);
    }

    /**
     * Parse content blocks from the given content.
     */
    private static parseContentBlocks(content: string): ContentBlock[] {
        const blocks: ContentBlock[] = [];
        const lines = content.split("\n");

        let blockContent: string[] = [];
        let blockMarker: string | undefined = undefined;

        const flushMarkdownBlock = () => {
            if (blockContent.length > 0) {
                const markdownContent = blockContent.join("\n");
                const block = MarkdownBlock.parse(markdownContent);
                blocks.push(block);
            }
            blockContent = [];
        };

        const flushChoproBlock = () => {
            let block: ChoproBlock;
            if (blockContent.length === 0) {
                block = new ChoproBlock([]);
            } else {
                block = ChoproBlock.parseLines(blockContent);
            }
            blocks.push(block);
            blockContent = [];
        };

        for (const line of lines) {
            if (blockMarker) {
                if (line.trim() === blockMarker) {
                    flushChoproBlock();
                    blockMarker = undefined;
                } else {
                    blockContent.push(line);
                }
            } else if (line.startsWith("```chopro")) {
                flushMarkdownBlock();
                blockMarker = "```";
            } else {
                blockContent.push(line);
            }
        }

        if (blockMarker) {
            flushChoproBlock();
        } else {
            flushMarkdownBlock();
        }

        return blocks;
    }

    /**
     * Convert the file to its string representation.
     */
    toString(): string {
        let result = "";

        if (this.frontmatter) {
            result += this.frontmatter.toString();
        }

        result += this.blocks.map((block) => block.toString()).join("\n");

        return result;
    }
}
