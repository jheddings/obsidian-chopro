// chopro - Chord Pro Processor for Obsidian

import { ChoproPluginSettings } from './main';

export abstract class LineSegment {
    /**
     * Base class for all line segment types.
     */
    constructor(public content: string) {}
}

export class ChordNotation extends LineSegment {
    public readonly root: string;
    public readonly accidental?: string;
    public readonly modifier?: string;
    public readonly bass?: string;

    /**
     * Creates a chord notation segment.
     */
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
     * Display the chord in a string format.
     */
    toString(): string {
        const modPart = this.modifier ? this.modifier.toLowerCase() : '';
        const slashPart = this.bass ? `/${this.bass}` : '';
        return this.chord + modPart + slashPart;
    }
}

export class Annotation extends LineSegment {
    /**
     * Creates an annotation segment.
     */
    constructor(content: string) {
        super(content);
    }
}

export class TextSegment extends LineSegment {
    /**
     * Creates a text segment.
     */
    constructor(content: string) {
        super(content);
    }
}

export abstract class ChoproLine {
    /**
     * Base class for all ChoPro line types.
     */
    constructor() {}

    /**
     * Static factory method to parse a line into the appropriate ChoproLine subclass
     */
    static parse(line: string): ChoproLine | null {
        // ignore comment lines
        if (line.startsWith('#')) {
            return null;
        }

        if (EmptyLine.test(line)) {
            return EmptyLine.parse(line);
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
    /**
     * Represents an empty line in ChoPro source.
     */
    constructor() {
        super();
    }

    /**
     * Test if a line is empty.
     */
    static test(line: string): boolean {
        return line.trim() === '';
    }

    /**
     * Parse an empty line.
     */
    static parse(line: string): EmptyLine {
        return new EmptyLine();
    }
}

export class MetadataLine extends ChoproLine {
    public static readonly LINE_PATTERN = /^\{([^:]+):?\s*(.*)\}$/;

    /**
     * Creates a metadata line with name and optional value.
     */
    constructor(public name: string, public value?: string ) {
        super();
    }

    /**
     * Test if a line matches metadata pattern.
     */
    static test(line: string): boolean {
        return MetadataLine.LINE_PATTERN.test(line);
    }

    /**
     * Parse a metadata line from ChoPro source.
     */
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
}

export class InstructionLine extends ChoproLine {
    public static readonly LINE_PATTERN = /^\(.+\)$/;

    /**
     * Creates an instruction line.
     */
    constructor(public content: string) {
        super();
    }

    /**
     * Test if a line is an instruction (wrapped in parentheses).
     */
    static test(line: string): boolean {
        return InstructionLine.LINE_PATTERN.test(line);
    }

    /**
     * Parse an instruction line by removing parentheses.
     */
    static parse(line: string): InstructionLine {
        return new InstructionLine(line.slice(1, -1)); // Remove parentheses
    }
}

export abstract class ChordLine extends ChoproLine {
    public static readonly INLINE_MARKER_PATTERN = /\[([^\]]+)\]/;
    public static readonly CHORD_PATTERN = /^([A-G1-7])(#|♯|b|♭|[ei]s)?([^\/]+)?(\/(.+))?$/i;

    /**
     * Base class for lines containing chord markers.
     */
    constructor(public content: string, public segments: LineSegment[]) {
        super();
    }

    /**
     * Test if a line contains chord markers.
     */
    static test(line: string): boolean {
        return ChordLine.INLINE_MARKER_PATTERN.test(line);
    }

    /**
     * Parse a line into segments of chords, annotations, and text.
     */
    protected static parseLineSegments(line: string): LineSegment[] {
        const segments: LineSegment[] = [];
        const allMarkers = new RegExp(ChordLine.INLINE_MARKER_PATTERN.source, 'g');
        let lastIndex = 0;
        let match;

        while ((match = allMarkers.exec(line)) !== null) {
            // Add text before the chord (if any)
            ChordLine.addTextSegmentIfNotEmpty(segments, line, lastIndex, match.index);

            const content = match[1];
            const segment = ChordLine.parseLineSegment(content);
            segments.push(segment);

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text after the last chord
        ChordLine.addTextSegmentIfNotEmpty(segments, line, lastIndex, line.length);

        return segments;
    }

    /**
     * Parse a chord marker into the appropriate segment type.
     */
    protected static parseLineSegment(marker: string): LineSegment {
        if (marker.startsWith('*')) {
            return new Annotation(marker.substring(1));
        }

        const chordMatch = marker.match(ChordLine.CHORD_PATTERN);

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

    /**
     * Add a text segment if the substring is not empty.
     */
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
}

export class ChordLyricsLine extends ChordLine {
    /**
     * Test if a line contains chords with lyrics.
     */
    static test(line: string): boolean {
        return ChordLine.test(line) && !InstrumentalLine.test(line);
    }

    /**
     * Parse a chord and lyrics line.
     */
    static parse(line: string): ChordLyricsLine {
        const segments = ChordLine.parseLineSegments(line);
        return new ChordLyricsLine(line, segments);
    }
}

export class InstrumentalLine extends ChordLine {
    /**
     * Test if a line contains only chords and whitespace.
     */
    static test(line: string): boolean {
        // instrumental contains only chords and whitespace
        const allMarkers = new RegExp(ChordLine.INLINE_MARKER_PATTERN.source, 'g');
        const withoutChords = line.replace(allMarkers, '');
        return withoutChords.trim() === '';
    }

    /**
     * Parse an instrumental line with chords only.
     */
    static parse(line: string): InstrumentalLine {
        const segments = ChordLine.parseLineSegments(line);
        return new InstrumentalLine(line, segments);
    }
}

export class TextLine extends ChoproLine {
    /**
     * Creates a text-only line.
     */
    constructor(public content: string) {
        super();
    }

    /**
     * Test if a line contains text content.
     */
    static test(line: string): boolean {
        return line.trim() !== '';
    }

    /**
     * Parse a text-only line.
     */
    static parse(line: string): TextLine {
        return new TextLine(line);
    }
}

export interface ChoproBlock {
    lines: ChoproLine[];
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

        return { lines: choproLines };
    }
}

/**
 * Renderer for converting ChoPro AST into DOM elements
 */
export class ChoproRenderer {
    /**
     * Creates a new ChoPro renderer with the given settings.
     */
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
        this.renderInstrumental(segments, lineDiv);
    }

    /**
     * Render a text-only line
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

            // chord and annotation segments are rendered as a pair with their text
            if (segment instanceof ChordNotation || segment instanceof Annotation) {
                const nextSegment = i + 1 < segments.length ? segments[i + 1] : null;
                const consumed = this.renderLineSegment(segment, nextSegment, lineDiv);

                if (consumed) {
                    i++;
                }

            } else if (segment instanceof TextSegment) {
                this.renderOrphanedText(segment, lineDiv);
            }
        }
    }

    /**
     * Render text that doesn't have a chord above it
     */
    private renderOrphanedText(segment: LineSegment, container: HTMLElement): void {
        container.createSpan({
            text: segment.content,
            cls: 'chopro-lyrics'
        });
    }

    /**
     * Render chord segments inline for instrumental lines
     */
    private renderInstrumental(segments: LineSegment[], container: HTMLElement): void {
        for (const segment of segments) {
            if (segment instanceof ChordNotation) {
                this.renderChord(segment, container);
            } else if (segment instanceof Annotation) {
                this.renderAnnotation(segment, container);
            } else if (segment instanceof TextSegment) {
                const textSpan = container.createSpan({ cls: 'chopro-lyrics' });
                textSpan.textContent = segment.content;
            }
        }
    }

    /**
     * Create a chord span with decorations and styling.
     */
    private renderChord(segment: ChordNotation, container: HTMLElement): void {
        const chordSpan = container.createSpan({ cls: 'chopro-chord' });
        let totalChordLength = 0;

        const { prefix, suffix } = this.getChordDecorations();
        
        if (prefix && prefix.length > 0) {
            chordSpan.createSpan({ text: prefix });
            totalChordLength += suffix.length;
        }

        // add the base chord (root + accidental)
        chordSpan.createSpan({ text: segment.chord });
        totalChordLength += segment.chord.length;

        if (segment.modifier) {
            chordSpan.createSpan({ 
                text: segment.modifier.toLowerCase(), 
                cls: 'chopro-chord-modifier' 
            });
            totalChordLength += segment.modifier.length;
        }

        if (segment.bass) {
            chordSpan.createSpan({ text: `/${segment.bass}` });
            totalChordLength += 1 + segment.bass.length; // +1 for the slash
        }

        if (suffix && suffix.length > 0) {
            chordSpan.createSpan({ text: suffix });
            totalChordLength += suffix.length;
        }
        
        // TODO figure out how to account for user font size preference
        container.style.setProperty('--chord-min-width', `${totalChordLength}ch`);
    }

    /**
     * Create an annotation span with styling.
     */
    private renderAnnotation(segment: Annotation, container: HTMLElement): void {
        const annotationSpan = container.createSpan({ cls: 'chopro-annotation' });
        annotationSpan.textContent = segment.content;

        // TODO figure out how to account for user font size preference
        container.style.setProperty('--chord-min-width', `${segment.content.length}ch`);
    }

    /**
     * Render a line segment with optional following text.
     */
    private renderLineSegment(
        segment: LineSegment, 
        nextSegment: LineSegment | null, 
        container: HTMLElement
    ): boolean {
        const pairSpan = container.createSpan({ cls: 'chopro-pair' });

        if (segment instanceof ChordNotation) {
            this.renderChord(segment, pairSpan);
        } else if (segment instanceof Annotation) {
            this.renderAnnotation(segment, pairSpan);
        }

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
     * Get prefix and suffix decorations for chords based on settings.
     */
    private getChordDecorations(): { prefix: string; suffix: string } {
        switch (this.settings.chordDecorations) {
            case 'square':
                return { prefix: '[', suffix: ']' };
            case 'round':
                return { prefix: '(', suffix: ')' };
            case 'curly':
                return { prefix: '{', suffix: '}' };
            case 'angle':
                return { prefix: '<', suffix: '>' };
            default:
                return { prefix: '', suffix: '' };
        }
    }
}

/**
 * Orchestrates parsing and rendering of ChoPro blocks.
 */
export class ChoproProcessor {
    private parser: ChoproParser;
    private renderer: ChoproRenderer;

    /**
     * Creates a new ChoPro processor with the given settings.
     */
    constructor(private settings: ChoproPluginSettings) {
        this.parser = new ChoproParser();
        this.renderer = new ChoproRenderer(settings);
    }

    /**
     * Main entry point to process a raw ChoPro block.
     */
    processBlock(source: string, container: HTMLElement): void {
        const block = this.parser.parseBlock(source);
        this.renderer.renderBlock(block, container);
    }
}
