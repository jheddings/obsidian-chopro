// parser - ChoPro parsing elements and data structures

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { AbstractNote, MusicNote, NashvilleNumber } from './music';

export abstract class LineSegment {
    constructor() {}
}

export class ChordNotation extends LineSegment {
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

    static parse(content: string): ChordNotation {
        if (LetterNotation.test(content)) {
            return LetterNotation.parse(content);
        }

        if (NashvilleNotation.test(content)) {
            return NashvilleNotation.parse(content);
        }

        throw new Error('Invalid chord notation format');
    }

    /**
     * Get the normalized chord quality in standard form.
     */
    get quality(): string | undefined {
        if (!this.modifier) return undefined;
        
        let normalized = this.modifier;
        
        // Delta (Δ) to maj
        normalized = normalized.replace(/Δ/g, 'maj');

        // Full-diminished (o) to dim
        normalized = normalized.replace(/(?<!ø)o(?!f)/g, 'dim');
        
        // Half-diminished (ø) to m7b5
        normalized = normalized.replace(/ø7?/g, 'm7b5');
        
        // Plus (+) to aug (but preserve existing +)
        normalized = normalized.replace(/\+(?!.*aug)/g, 'aug');
        
        // Normalize accidentals within chord modifiers
        normalized = normalized.replace(/#/g, '♯');
        normalized = normalized.replace(/b/g, '♭');
        
        return normalized.toLowerCase();
    }

    /**
     * Convert the chord notation to its ChoPro representation.
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

        return `[${chordString}]`;
    }

    /**
     * Check if this chord notation is equal to another chord notation.
     */
    equals(other: ChordNotation): boolean {
        return this.toString(true) === other.toString(true);
    }
}

/**
 * Represents a chord notation using alphabetic note names (A-G).
 */
export class LetterNotation extends ChordNotation {
    public static readonly PATTERN = /^\[([A-G](?:♮|#|♯|b|♭|[ei]s|s)?)([^\/\]]+)?(?:\/(.+))?\]$/;

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
            throw new Error('Invalid letter notation: must use A-G note names');
        }

        const noteString = match[1];
        const modifier = match[2] && match[2].trim() !== '' ? match[2].trim() : undefined;
        const bassString = match[3] ? match[3].trim() : undefined;

        if (!MusicNote.test(noteString)) {
            throw new Error('Invalid letter notation: must use A-G note names');
        }

        const primaryNote = MusicNote.parse(noteString);
        const bassNote = bassString ? AbstractNote.parse(bassString) : undefined;

        return new LetterNotation(primaryNote, modifier, bassNote);
    }
}

/**
 * Represents a chord notation using Nashville number system (1-7).
 */
export class NashvilleNotation extends ChordNotation {
    public static readonly PATTERN = /^\[([1-7](?:#|♯|b|♭)?)([^\/\]]+)?(?:\/(.+))?\]$/;

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
            throw new Error('Invalid Nashville notation: must use 1-7 numbers');
        }

        const noteString = match[1];
        const modifier = match[2] && match[2].trim() !== '' ? match[2].trim() : undefined;
        const bassString = match[3] ? match[3].trim() : undefined;

        if (!NashvilleNumber.test(noteString)) {
            throw new Error('Invalid Nashville notation: must use 1-7 numbers');
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
            throw new Error('Invalid annotation format');
        }

        return new Annotation(match[1]);
    }

    /**
     * Convert the annotation to its normalized ChoPro representation.
     */
    toString(): string {
        return `[*${this.content}]`;
    }
}

export class TextSegment extends LineSegment {
    constructor(public content: string) {
        super();
    }

    /**
     * Convert the text segment to its normalized ChoPro representation.
     */
    toString(): string {
        return this.content;
    }
}

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

        // default to text line
        return TextLine.parse(line);
    }
}

export class EmptyLine extends ChoproLine {
    constructor() {
        super();
    }

    static test(line: string): boolean {
        if (line.includes('\n')) {
            return false;
        }
        return line.trim() === '';
    }

    static parse(line: string): EmptyLine {
        if (!EmptyLine.test(line)) {
            throw new Error('line is not empty');
        }
        return new EmptyLine();
    }

    /**
     * Convert the empty line to its normalized ChoPro representation.
     */
    toString(): string {
        return '';
    }
}

export class TextLine extends ChoproLine {
    constructor(public content: string) {
        super();
    }

    static test(line: string): boolean {
        return line.trim() !== '';
    }

    static parse(line: string): TextLine {
        return new TextLine(line);
    }

    /**
     * Convert the text line to its normalized ChoPro representation.
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
     * Convert the comment line to its normalized ChoPro representation.
     */
    toString(): string {
        return `# ${this.content}`;
    }
}

export abstract class SegmentedLine extends ChoproLine {
    public static readonly INLINE_MARKER_PATTERN = /\[([^\]]+)\]/;

    constructor(public content: string, public segments: LineSegment[]) {
        super();
    }

    /**
     * Get all chord notation segments from this line.
     */
    get chords(): ChordNotation[] {
        return this.segments.filter(segment => segment instanceof ChordNotation) as ChordNotation[];
    }

    /**
     * Get all text segments from this line.
     */
    get lyrics(): TextSegment[] {
        return this.segments.filter(segment => segment instanceof TextSegment) as TextSegment[];
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

        throw new Error('invalid line format for SegmentedLine');
    }

    protected static parseLineSegments(line: string): LineSegment[] {
        const segments: LineSegment[] = [];
        const allMarkers = new RegExp(SegmentedLine.INLINE_MARKER_PATTERN.source, 'g');
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

        if (ChordNotation.test(marker)) {
            return ChordNotation.parse(marker);
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
     * Convert the chord line to its normalized ChoPro representation.
     */
    toString(): string {
        return this.segments.map(segment => segment.toString()).join('');
    }
}

export class ChordLyricsLine extends SegmentedLine {
    static test(line: string): boolean {
        return SegmentedLine.test(line) && !InstrumentalLine.test(line);
    }

    static parse(line: string): ChordLyricsLine {
        const segments = SegmentedLine.parseLineSegments(line);
        return new ChordLyricsLine(line, segments);
    }
}

export class InstrumentalLine extends SegmentedLine {
    static test(line: string): boolean {
        if (!SegmentedLine.test(line)) {
            return false;
        }

        const allMarkers = new RegExp(SegmentedLine.INLINE_MARKER_PATTERN.source, 'g');
        const withoutChords = line.replace(allMarkers, '');
        return withoutChords.trim() === '';
    }

    static parse(line: string): InstrumentalLine {
        const segments = SegmentedLine.parseLineSegments(line);
        return new InstrumentalLine(line, segments);
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
    public static readonly BLOCK_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n/;

    constructor(public properties: Record<string, any> = {}) {
        super();
    }

    /**
     * Create a Frontmatter block from YAML content.
     */
    static parse(content: string): Frontmatter {
        const frontmatter = new Frontmatter();

        try {
            frontmatter.properties = parseYaml(content) || {};
        } catch (error) {
            console.warn('Failed to parse YAML frontmatter:', error);
            frontmatter.properties = {};
        }

        return frontmatter;
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
        return '---\n' + stringifyYaml(this.properties) + '---';
    }
}

/**
 * Represents a block of ChoPro content, containing multiple lines.
 */
export class ChoproBlock extends ContentBlock {
    static BLOCK_PATTERN = /^```chopro\s*\n([\s\S]*?)\n```$/m;

    constructor(public lines: ChoproLine[]) {
        super();
    }

    /**
     * Create a ChoproBlock by parsing the content.
     */
    static parse(content: string): ChoproBlock {
        const trimmedContent = content.trim();
        const choproLines: ChoproLine[] = [];

        // Handle empty content
        if (!trimmedContent) {
            return new ChoproBlock(choproLines);
        }

        const lines = trimmedContent.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            const parsedLine = ChoproLine.parse(trimmedLine);
            
            if (parsedLine !== null) {
                choproLines.push(parsedLine);
            }
        }

        return new ChoproBlock(choproLines);
    }

    /**
     * Convert the block to its normalized ChoPro representation.
     */
    toString(): string {
        let content = '```chopro\n';

        if (this.lines.length > 0) {
            content += this.lines.map(line => line.toString()).join('\n');
            content += '\n```';
        } else {
            content += '```';
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
 * Represents a complete ChoPro file containing frontmatter and content blocks.
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
        return this.frontmatter?.get('key');
    }

    /**
     * Parse a complete ChoPro file from source text.
     */
    static parse(source: string): ChoproFile {
        let frontmatter: Frontmatter | undefined;
        let remainingContent = source;

        const frontmatterMatch = source.match(Frontmatter.BLOCK_PATTERN);

        if (frontmatterMatch) {
            frontmatter = Frontmatter.parse(frontmatterMatch[1]);
            remainingContent = source.substring(frontmatterMatch[0].length);
        }

        const blocks = ChoproFile.parseContentBlocks(remainingContent);

        return new ChoproFile(frontmatter, blocks);
    }

    /**
     * Load a ChoPro file from a given filename.
     */
    static load(path: string): ChoproFile {
        const fs = require('fs');
        const fileContent = fs.readFileSync(path, 'utf-8');
        return ChoproFile.parse(fileContent);
    }

    /**
     * Parse content blocks from the given content.
     */
    private static parseContentBlocks(content: string): ContentBlock[] {
        const blocks: ContentBlock[] = [];
        const lines = content.split('\n');
        
        let blockContent: string[] = [];
        let blockMarker: string | undefined = undefined;

        const flushMarkdownBlock = () => {
            if (blockContent.length > 0) {
                const markdownContent = blockContent.join('\n');
                const block = MarkdownBlock.parse(markdownContent);
                blocks.push(block);
            }
            blockContent = [];
        };
        
        const flushChoproBlock = () => {
            const choproContent = blockContent.join('\n');
            const block = ChoproBlock.parse(choproContent);
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

            } else if (line.startsWith('```chopro')) {
                flushMarkdownBlock();
                blockMarker = '```';

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
        let result = '';
        
        if (this.frontmatter) {
            result += this.frontmatter.toString() + '\n\n';
        }
        
        result += this.blocks.map(block => block.toString()).join('\n');
        
        return result;
    }
}
