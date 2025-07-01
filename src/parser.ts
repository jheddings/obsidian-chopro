// parser - ChoPro parsing elements and data structures

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export enum ChordType {
    ALPHA = 'alpha',
    NASHVILLE = 'nashville',
    UNKNOWN = 'unknown'
}

export abstract class LineSegment {
    constructor(public content: string) {}
}

export class ChordNotation extends LineSegment {
    public static readonly PATTERN = /^\[([A-G1-7])(#|♯|b|♭|[ei]s)?([^\/]+)?(\/(.+))?\]$/i;

    public readonly root: string;
    public readonly accidental?: string;
    public readonly modifier?: string;
    public readonly bass?: string;

    constructor(
        root: string,
        accidental?: string,
        modifier?: string,
        bass?: string
    ) {
        super(root + (accidental || ''));
        this.root = root;
        this.accidental = accidental;
        this.modifier = modifier;
        this.bass = bass;
    }

    /**
     * Get the base chord (root + accidental).
     */
    get note(): string {
        return this.root + (this.accidental || '');
    }

    /**
     * Determine the type of chord notation (alpha, nashville, or unknown).
     */
    get chordType(): ChordType {
        // Check if root is a letter (A-G) - alpha notation
        if (/^[A-G]$/i.test(this.root)) {
            return ChordType.ALPHA;
        }
        
        // Check if root is a number (1-7) - nashville notation
        if (/^[1-7]$/.test(this.root)) {
            return ChordType.NASHVILLE;
        }
        
        return ChordType.UNKNOWN;
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
        const bass = match[5] ? match[5].trim() : undefined;

        return new ChordNotation(root, accidental, modifier, bass);
    }

    /**
     * Convert the chord notation to its normalized ChoPro representation.
     */
    toString(): string {
        const modPart = this.modifier ? this.modifier.toLowerCase() : '';
        const slashPart = this.bass ? `/${this.bass}` : '';
        return `[${this.note + modPart + slashPart}]`;
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

        if (DirectiveLine.test(line)) {
            return DirectiveLine.parse(line);
        }

        if (InstructionLine.test(line)) {
            return InstructionLine.parse(line);
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

/**
 * Base class for directive lines.
 */
export abstract class DirectiveLine extends ChoproLine {
    public static readonly LINE_PATTERN = /^\{([^:]+):?\s*(.*)\}$/;

    constructor(public name: string, public value?: string) {
        super();
    }

    static test(line: string): boolean {
        return DirectiveLine.LINE_PATTERN.test(line);
    }

    /**
     * Factory method to parse a directive line into the appropriate subclass.
     */
    static parse(line: string): DirectiveLine {
        if (CustomDirective.test(line)) {
            return CustomDirective.parse(line);
        }

        if (MetadataDirective.test(line)) {
            return MetadataDirective.parse(line);
        }

        throw new Error('Unknown directive');
    }

    /**
     * Convert the metadata line to its normalized ChoPro representation.
     */
    toString(): string {
        const colonSeparator = this.value ? ':' : '';
        const valueString = this.value ? ` ${this.value}` : '';
        return `{${this.name}${colonSeparator}${valueString}}`;
    }
}

export class CustomDirective extends DirectiveLine {
    constructor(public name: string, public value?: string) {
        super(name, value);
    }

    static test(line: string): boolean {
        const match = line.match(DirectiveLine.LINE_PATTERN);
        if (!match) {
            return false;
        }

        const name = match[1].trim().toLowerCase();
        return name.startsWith('x_');
    }

    static parse(line: string): CustomDirective {
        const match = line.match(DirectiveLine.LINE_PATTERN);
        if (!match) {
            throw new Error('Invalid directive format');
        }

        let name = match[1].trim().toLowerCase();
        const value = match[2] ? match[2].trim() : undefined;

        if (name.startsWith('x_')) {
            name = name.substring(2);
        }

        return new CustomDirective(name, value);
    }

    /**
     * Convert the custom directive to its normalized ChoPro representation.
     */
    toString(): string {
        const colonSeparator = this.value ? ':' : '';
        const valueString = this.value ? ` ${this.value}` : '';
        return `{x_${this.name}${colonSeparator}${valueString}}`;
    }
}

export class MetadataDirective extends DirectiveLine {
    constructor(public name: string, public value?: string ) {
        super(name, value);
    }

    static test(line: string): boolean {
        if (!DirectiveLine.test(line)) {
            return false;
        }
        
        return !CustomDirective.test(line);
    }

    static parse(line: string): MetadataDirective {
        const match = line.match(DirectiveLine.LINE_PATTERN);
        if (!match) {
            return new MetadataDirective('unknown', line);
        }

        const name = match[1].trim().toLowerCase();
        const value = match[2] ? match[2].trim() : undefined;

        return new MetadataDirective(name, value);
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

export class InstructionLine extends ChoproLine {
    public static readonly LINE_PATTERN = /^\((.+)\)$/;

    constructor(public content: string) {
        super();
    }

    static test(line: string): boolean {
        return InstructionLine.LINE_PATTERN.test(line);
    }

    static parse(line: string): InstructionLine {
        const match = line.match(InstructionLine.LINE_PATTERN);
        const content = match ? match[1] : line;
        return new InstructionLine(content);
    }

    /**
     * Convert the instruction line to its normalized ChoPro representation.
     */
    toString(): string {
        return `(${this.content})`;
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
     * Get the key from metadata lines, or undefined if none exist.
     */
    get key(): string | undefined {
        for (const line of this.lines) {
            if (line instanceof MetadataDirective && line.name === 'key') {
                return line.value;
            }
        }
        return undefined;
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
