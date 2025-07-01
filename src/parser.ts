// parser - ChoPro parsing elements and data structures

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export enum NoteType {
    ALPHA = 'alpha',
    NASHVILLE = 'nashville',
    UNKNOWN = 'unknown'
}

export enum Accidental {
    SHARP = '♯',
    FLAT = '♭',
    NATURAL = '♮'
}

export class MusicalNote {
    public static  PATTERN = /^([A-G1-7])(#|♯|b|♭|[ei]s|s)?/i;

    constructor(public root: string, public postfix?: string) {
        this.root = root;
        this.postfix = postfix;
    }

    /**
     * Get the accidental type based on the postfix.
     */
    get accidental(): Accidental {
        switch (this.postfix) {
            case '#':
            case '♯':
            case 'is':
                return Accidental.SHARP;
            case 'b':
            case '♭':
            case 'es':
            case 's':
                return Accidental.FLAT;
        }
        return Accidental.NATURAL;
    }

    /**
     * Determine the type of note notation (alpha, nashville, or unknown).
     */
    get noteType(): NoteType {
        // Check if root is a letter (A-G) - alpha notation
        if (/^[A-G]$/i.test(this.root)) {
            return NoteType.ALPHA;
        }
        
        // Check if root is a number (1-7) - nashville notation
        if (/^[1-7]$/.test(this.root)) {
            return NoteType.NASHVILLE;
        }
        
        return NoteType.UNKNOWN;
    }

    /**
     * Parse a note string into a MusicalNote instance.
     */
    static parse(noteString: string): MusicalNote {
        const match = noteString.match(MusicalNote.PATTERN);
        
        if (!match) {
            throw new Error('Invalid note format');
        }

        const root = match[1].toUpperCase();
        const postfix = match[2] ? match[2].toLowerCase() : undefined;

        return new MusicalNote(root, postfix);
    }

    /**
     * Convert the note to its string representation.
     * @param normalize If true, normalize accidentals to Unicode symbols (default: false)
     */
    toString(normalize: boolean = false): string {
        let noteString = this.root;
        
        if (this.postfix) {
            if (normalize) {
                switch (this.accidental) {
                    case Accidental.SHARP:
                        noteString += '♯';
                        break;
                    case Accidental.FLAT:
                        noteString += '♭';
                        break;
                }
            } else {
                noteString += this.postfix;
            }
        }
        
        return noteString;
    }
}

export abstract class LineSegment {
    constructor(public content: string) {}
}

export class ChordNotation extends LineSegment {
    public static readonly PATTERN = /^\[([A-G1-7])(#|♯|b|♭|[ei]s|s)?([^\/]+)?(\/(.+))?\]$/i;

    constructor(
        public note: MusicalNote,
        public modifier?: string,
        public bass?: MusicalNote
    ) {
        super(note + (modifier || '') + (bass || ''));
    }

    static test(content: string): boolean {
        return ChordNotation.PATTERN.test(content);
    }

    static parse(content: string): ChordNotation {
        const match = content.match(ChordNotation.PATTERN);

        if (!match) {
            throw new Error('Invalid chord notation format');
        }

        const root = match[1].toUpperCase();
        const accidental = match[2] ? match[2].toLowerCase() : undefined;
        const modifier = match[3] ? match[3].trim() : undefined;
        const bassString = match[5] ? match[5].trim() : undefined;

        const primaryNote = new MusicalNote(root, accidental);
        const bassNote = bassString ? MusicalNote.parse(bassString) : undefined;

        return new ChordNotation(primaryNote, modifier, bassNote);
    }

    /**
     * Convert the chord notation to its ChoPro representation.
     * @param normalize If true, normalize accidentals to Unicode symbols (default: false)
     */
    toString(normalize: boolean = false): string {
        let chordString = this.note.toString(normalize);
        
        if (this.modifier) {
            chordString += normalize ? this.modifier.toLowerCase() : this.modifier;
        }

        if (this.bass) {
            chordString += `/${this.bass.toString(normalize)}`;
        }

        return `[${chordString}]`;
    }
}

export class Annotation extends LineSegment {
    public static readonly PATTERN = /^\[\*([^\*]+)\]$/;

    constructor(content: string) {
        super(content);
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
    constructor(content: string) {
        super(content);
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

    static test(line: string): boolean {
        return SegmentedLine.INLINE_MARKER_PATTERN.test(line);
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
    constructor(public properties: Record<string, any> = {}) {
        super();
    }

    /**
     * Create a Frontmatter block from YAML content.
     */
    static parse(yamlContent: string): Frontmatter {
        const frontmatter = new Frontmatter();

        try {
            frontmatter.properties = parseYaml(yamlContent) || {};
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
        return new MarkdownBlock(content.trim());
    }

    /**
     * Convert the markdown block to its string representation.
     */
    toString(): string {
        return this.content;
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
        const lines = content.trim().split('\n');
        const choproLines: ChoproLine[] = [];

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
        const content = this.lines.map(line => line.toString()).join('\n');
        return '```chopro\n' + content + '\n```';
    }

}

/**
 * Represents a complete ChoPro file containing frontmatter and content blocks.
 */
export class ChoproFile {
    private static readonly FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n/;

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

        const frontmatterMatch = source.match(ChoproFile.FRONTMATTER_PATTERN);

        if (frontmatterMatch) {
            frontmatter = Frontmatter.parse(frontmatterMatch[1]);
            remainingContent = source.substring(frontmatterMatch[0].length);
        }

        const blocks = ChoproFile.parseContentBlocks(remainingContent);

        return new ChoproFile(frontmatter, blocks);
    }

    /**
     * Parse content blocks from the given content.
     */
    private static parseContentBlocks(content: string): ContentBlock[] {
        const blocks: ContentBlock[] = [];
        const blocksPattern = new RegExp(ChoproBlock.BLOCK_PATTERN.source, 'g');
        
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        const addMarkdownBlock = (content: string) => {
            if (content) {
                blocks.push(MarkdownBlock.parse(content));
            }
        };

        const addChoproBlock = (content: string) => {
            if (content) {
                blocks.push(ChoproBlock.parse(content));
            }
        };

        while ((match = blocksPattern.exec(content)) !== null) {
            // add any markdown content before this chopro block
            if (match.index > lastIndex) {
                const markdown = content.substring(lastIndex, match.index);
                addMarkdownBlock(markdown);
            }

            addChoproBlock(match[1]);

            lastIndex = match.index + match[0].length;
        }

        // add any remaining markdown content after the last chopro block
        if (lastIndex < content.length) {
            const markdown = content.substring(lastIndex);
            addMarkdownBlock(markdown);
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
