// chopro - Chord Pro Processor for Obsidian

import { ChoproPluginSettings } from './main';
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
    get chord(): string {
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

    /**
     * Convert the chord notation to its normalized ChoPro representation.
     */
    toString(): string {
        const modPart = this.modifier ? this.modifier.toLowerCase() : '';
        const slashPart = this.bass ? `/${this.bass}` : '';
        return `[${this.chord + modPart + slashPart}]`;
    }

    /**
     * Get the chord with modifier styling for HTML.
     */
    getStyledChord(): string {
        const modPart = this.modifier 
            ? `<span class="chopro-chord-modifier">${this.modifier.toLowerCase()}</span>` 
            : '';
        const slashPart = this.bass ? `/${this.bass}` : '';

        return this.chord + modPart + slashPart;
    }
}

export class Annotation extends LineSegment {
    constructor(content: string) {
        super(content);
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
        return `[${this.content}]`;
    }
}

export abstract class ChoproLine {
    constructor() {}

    /**
     * Static factory method to parse a line into the appropriate ChoproLine subclass
     */
    static parse(line: string): ChoproLine | null {
        if (EmptyLine.test(line)) {
            return EmptyLine.parse(line);
        }

        if (CommentLine.test(line)) {
            return CommentLine.parse(line);
        }

        if (MetadataLine.test(line)) {
            return MetadataLine.parse(line);
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
        return line.trim() === '';
    }

    static parse(line: string): EmptyLine {
        return new EmptyLine();
    }

    /**
     * Convert the empty line to its normalized ChoPro representation.
     */
    toString(): string {
        return '';
    }
}

export class MetadataLine extends ChoproLine {
    public static readonly LINE_PATTERN = /^\{([^:]+):?\s*(.*)\}$/;

    constructor(public name: string, public value?: string ) {
        super();
    }

    static test(line: string): boolean {
        return MetadataLine.LINE_PATTERN.test(line);
    }

    static parse(line: string): MetadataLine {
        const match = line.match(MetadataLine.LINE_PATTERN);
        if (!match) {
            return new MetadataLine('unknown', line);
        }

        let name = match[1].trim().toLowerCase();
        const value = match[2] ? match[2].trim() : undefined;

        // handle custom meta fields (start with x_)
        if (name.startsWith('x_')) {
            name = name.substring(2).replace(/_/g, ' ');
        }

        return new MetadataLine(name, value);
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
    public static readonly CHORD_PATTERN = /^([A-G1-7])(#|♯|b|♭|[ei]s)?([^\/]+)?(\/(.+))?$/i;

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
        let match;

        while ((match = allMarkers.exec(line)) !== null) {
            // Add text before the chord (if any)
            SegmentedLine.addTextSegmentIfNotEmpty(segments, line, lastIndex, match.index);

            const content = match[1];
            const segment = SegmentedLine.parseLineSegment(content);
            segments.push(segment);

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text after the last chord
        SegmentedLine.addTextSegmentIfNotEmpty(segments, line, lastIndex, line.length);

        return segments;
    }

    protected static parseLineSegment(marker: string): LineSegment {
        if (marker.startsWith('*')) {
            return new Annotation(marker.substring(1));
        }

        const chordMatch = marker.match(SegmentedLine.CHORD_PATTERN);

        if (chordMatch) {
            return new ChordNotation(
                chordMatch[1],       // Root note
                chordMatch[2] || '', // Accidental (sharp/flat)
                chordMatch[3] || '', // Modifier (e.g. 7, maj7, etc.)
                chordMatch[5] || ''  // Bass note (e.g. /C)
            );
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
 * Represents a block of generic markdown content.
 */
export class MarkdownBlock extends ContentBlock {
    constructor(public content: string) {
        super();
    }

    /**
     * Create a MarkdownBlock from content.
     */
    static create(content: string): MarkdownBlock {
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
 * Represents a block of ChoPro content, containing multiple lines.
 */
export class ChoproBlock extends ContentBlock {
    constructor(public lines: ChoproLine[]) {
        super();
    }

    /**
     * Create a ChoproBlock by parsing the content.
     */
    static create(content: string): ChoproBlock {
        const parser = new ChoproParser();
        return parser.parseBlock(content);
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
 * Represents a frontmatter block containing properties serialized as YAML.
 */
export class Frontmatter extends ContentBlock {
    constructor(public properties: Record<string, any> = {}) {
        super();
    }

    /**
     * Create a Frontmatter block from YAML content.
     */
    static create(yamlContent: string): Frontmatter {
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
        const content = stringifyYaml(this.properties);
        return '---\n' + content + '---';
    }
}

/**
 * Parser for ChoPro source text into an abstract syntax tree.
 */
export class ChoproParser {
    /**
     * Parse ChoPro source text into a structured representation.
     */
    parseBlock(source: string): ChoproBlock {
        const lines = source.trim().split('\n');
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
}

/**
 * Renderer for converting ChoPro AST into DOM elements
 */
export class ChoproRenderer {
    constructor(private settings: ChoproPluginSettings) {}

    /**
     * Render a ChoPro block into DOM elements
     */
    renderBlock(block: ChoproBlock, container: HTMLElement): void {
        for (const line of block.lines) {
            this.renderLine(line, container);
        }
    }

    /**
     * Render a single line based on its type
     */
    private renderLine(line: ChoproLine, container: HTMLElement): void {
        if (line instanceof EmptyLine) {
            container.createEl('br');
        } else if (line instanceof MetadataLine) {
            if (this.settings.showDirectives) {
                this.renderMetadata(line, container);
            }
        } else if (line instanceof InstructionLine) {
            this.renderInstruction(line.content, container);
        } else if (line instanceof ChordLyricsLine) {
            this.renderChordLine(line.segments, container);
        } else if (line instanceof InstrumentalLine) {
            this.renderInstrumentalLine(line.segments, container);
        } else if (line instanceof TextLine) {
            this.renderTextLine(line.content, container);
        }

        // NOTE - CommentLine's are ignored when rendering
    }

    /**
     * Render metadata.
     */
    private renderMetadata(meta: MetadataLine, container: HTMLElement): void {
        const directiveEl = container.createDiv({ cls: 'chopro-metadata' });
        directiveEl.createSpan({ text: meta.name, cls: 'chopro-metadata-name' });

        if (meta.value) {
            directiveEl.createSpan({ text: ': ' + meta.value, cls: 'chopro-metadata-value' });
        }
    }

    /**
     * Render an instruction line
     */
    private renderInstruction(content: string, container: HTMLElement): void {
        const instructionDiv = container.createDiv({ cls: 'chopro-instruction' });
        instructionDiv.createSpan({ text: content });
    }

    /**
     * Render a line with chords and/or lyrics
     */
    private renderChordLine(segments: LineSegment[], container: HTMLElement): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        this.renderSegments(segments, lineDiv);
    }

    /**
     * Render an instrumental line with chords only (inline)
     */
    private renderInstrumentalLine(segments: LineSegment[], container: HTMLElement): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        this.renderInstrumentalSegments(segments, lineDiv);
    }

    /**
     * Render a lyrics-only line
     */
    private renderTextLine(content: string, container: HTMLElement): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        lineDiv.createSpan({ text: content, cls: 'chopro-lyrics' });
    }

    /**
     * Render chord and text segments into HTML elements
     */
    private renderSegments(segments: LineSegment[], lineDiv: HTMLElement): void {
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            if (segment instanceof ChordNotation || segment instanceof Annotation) {
                const nextSegment = i + 1 < segments.length ? segments[i + 1] : null;
                const consumed = this.renderChordOrAnnotation(segment, nextSegment, lineDiv);
                if (consumed) {
                    i++; // Skip the consumed text segment
                }
            } else if (segment instanceof TextSegment) {
                this.renderOrphanedText(segment, lineDiv);
            }
        }
    }

    /**
     * Create a chord or annotation span with proper styling
     */
    private createChordOrAnnotationSpan(segment: LineSegment, container: HTMLElement): HTMLElement {
        if (segment instanceof ChordNotation) {
            const styledChord = segment.getStyledChord();
            const decoratedChord = this.decorateChord(styledChord);

            const chordSpan = container.createSpan({ cls: 'chopro-chord' });
            chordSpan.addClasses([`chopro-chord-${segment.chordType}`]);
            chordSpan.innerHTML = decoratedChord;

            return chordSpan;
        }

        const annotationSpan = container.createSpan({ cls: 'chopro-annotation' });
        annotationSpan.textContent = segment.content;
        return annotationSpan;
    }

    /**
     * Render a chord or annotation with optional following text
     */
    private renderChordOrAnnotation(
        segment: LineSegment, 
        nextSegment: LineSegment | null, 
        lineDiv: HTMLElement
    ): boolean {
        const pairSpan = lineDiv.createSpan({ cls: 'chopro-pair' });

        // Create the chord or annotation span
        this.createChordOrAnnotationSpan(segment, pairSpan);

        // Check if there's text immediately following
        let textContent = '';
        let textConsumed = false;
        if (nextSegment && nextSegment instanceof TextSegment) {
            textContent = nextSegment.content;
            textConsumed = true;
        }

        // Create the text span (may be empty for chord/annotation-only positions)
        const textSpan = pairSpan.createSpan({
            text: textContent || '\u00A0',
            cls: 'chopro-lyrics'
        });

        // If the text is only whitespace, ensure minimum width for positioning
        if (!textContent || textContent.trim() === '') {
            textSpan.style.minWidth = '1ch';
        }

        return textConsumed;
    }

    /**
     * Render text that doesn't have a chord above it
     */
    private renderOrphanedText(segment: LineSegment, lineDiv: HTMLElement): void {
        lineDiv.createSpan({
            text: segment.content,
            cls: 'chopro-lyrics'
        });
    }

    /**
     * Decorate the chord according to user settings.
     */
    private decorateChord(chord: string): string {
        switch (this.settings.chordDecorations) {
            case 'square':
                return '[' + chord + ']';
            case 'round':
                return '(' + chord + ')';
            case 'curly':
                return '{' + chord + '}';
            case 'angle':
                return '&lt;' + chord + '&gt;';
        }

        return chord;
    }

    /**
     * Render chord segments inline for instrumental lines
     */
    private renderInstrumentalSegments(segments: LineSegment[], lineDiv: HTMLElement): void {
        for (const segment of segments) {
            if (segment instanceof ChordNotation || segment instanceof Annotation) {
                this.createChordOrAnnotationSpan(segment, lineDiv);
            } else if (segment instanceof TextSegment) {
                const textSpan = lineDiv.createSpan({ cls: 'chopro-lyrics' });
                textSpan.textContent = segment.content;
            }
        }
    }
}

/**
 * Orchestrates parsing and rendering of ChoPro blocks.
 */
export class ChoproProcessor {
    private renderer: ChoproRenderer;

    constructor(private settings: ChoproPluginSettings) {
        this.renderer = new ChoproRenderer(settings);
    }

    /**
     * Main entry point to process a raw ChoPro block.
     */
    processBlock(source: string, container: HTMLElement): void {
        const block = ChoproBlock.create(source);
        this.renderer.renderBlock(block, container);
    }
}
