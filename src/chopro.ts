// chopro - Chord Pro Processor for Obsidian

import { ChoproPluginSettings } from './main';

export abstract class LineSegment {
    constructor(public content: string) {}
}

export class ChordNotation extends LineSegment {
    public readonly root: string;
    public readonly accidental?: string;
    public readonly modifier?: string;
    public readonly bass?: string;

    constructor(
        content: string,
        root: string,
        accidental?: string,
        modifier?: string,
        bass?: string
    ) {
        super(content);
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
}

export class TextSegment extends LineSegment {
    constructor(content: string) {
        super(content);
    }
}

export abstract class ChoproLine {
    constructor() {}
}

export class EmptyLine extends ChoproLine {
    constructor() {
        super();
    }
}

export class MetadataLine extends ChoproLine {
    constructor(public name: string, public value?: string ) {
        super();
    }
}

export class InstructionLine extends ChoproLine {
    constructor(public content: string) {
        super();
    }
}

export class ChordLyricsLine extends ChoproLine {
    constructor(public content: string, public segments: LineSegment[]) {
        super();
    }
}

export class InstrumentalLine extends ChoproLine {
    constructor(public content: string, public segments: LineSegment[]) {
        super();
    }
}

export class TextLine extends ChoproLine {
    constructor(public content: string) {
        super();
    }
}

export interface ChoproBlock {
    lines: ChoproLine[];
}

/**
 * Parser for ChoPro source text into an abstract syntax tree
 */
export class ChoproParser {
    public static readonly METADATA_PATTERN = /^\{([^:]+):?\s*(.*)\}$/;
    public static readonly INSTRUCTION_PATTERN = /^\(.+\)$/;
    public static readonly INLINE_MARKER_PATTERN = /\[([^\]]+)\]/;
    public static readonly CHORD_PATTERN = /^([A-G1-7])(#|♯|b|♭|[ei]s)?([^\/]+)?(\/(.+))?$/i;

    /**
     * Parse ChoPro source text into a structured representation
     */
    parseBlock(source: string): ChoproBlock {
        const lines = source.trim().split('\n');
        const choproLines: ChoproLine[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            const parsedLine = this.parseLine(trimmedLine);
            
            if (parsedLine !== null) {
                choproLines.push(parsedLine);
            }
        }

        return { lines: choproLines };
    }

    /**
     * Parse a single line into its appropriate type
     */
    private parseLine(line: string): ChoproLine | null {
        if (this.isComment(line)) {
            return null;
        }

        if (line === '') {
            return new EmptyLine();
        }

        if (this.isMetadata(line)) {
            return this.parseMetadata(line);
        }

        if (this.isInstructionLine(line)) {
            return new InstructionLine(line.slice(1, -1)); // Remove parentheses
        }

        if (this.hasInlineMarkers(line)) {
            const segments = this.parseLineSegments(line);

            if (this.isInstrumentalLine(line)) {
                return new InstrumentalLine(line, segments);
            } else {
                return new ChordLyricsLine(line, segments);
            }
        }

        return new TextLine(line);
    }

    /**
     * Check if a line is a comment line (starts with a single #).
     */
    private isComment(line: string): boolean {
        return line.startsWith('#');
    }

    /**
     * Check if a line is an instruction line (wrapped in parentheses).
     */
    private isInstructionLine(line: string): boolean {
        return ChoproParser.INSTRUCTION_PATTERN.test(line);
    }

    /**
     * Check if a line is a ChoPro directive (e.g. {title: My Song}).
     */
    private isMetadata(line: string): boolean {
        return ChoproParser.METADATA_PATTERN.test(line);
    }

    /**
     * Parse a ChoPro metadata line.
     */
    private parseMetadata(line: string): MetadataLine {
        const match = line.match(ChoproParser.METADATA_PATTERN);
        if (!match) {
            return new MetadataLine('unknown', line);
        }

        const name = match[1].trim().toLowerCase();
        const value = match[2] ? match[2].trim() : undefined;

        return new MetadataLine(name, value);
    }

    /**
     * Check if a line contains inline markers.
     */
    private hasInlineMarkers(line: string): boolean {
        return ChoproParser.INLINE_MARKER_PATTERN.test(line);
    }

    /**
     * Check if a line is instrumental (contains only chords and whitespace).
     */
    private isInstrumentalLine(line: string): boolean {
        const allMarkers = new RegExp(ChoproParser.INLINE_MARKER_PATTERN.source, 'g');
        const withoutChords = line.replace(allMarkers, '');
        return withoutChords.trim() === '';
    }

    /**
     * Parse a line with inline markers into segments.
     */
    private parseLineSegments(line: string): LineSegment[] {
        const segments: LineSegment[] = [];
        const allMarkers = new RegExp(ChoproParser.INLINE_MARKER_PATTERN.source, 'g');
        let lastIndex = 0;
        let match;

        while ((match = allMarkers.exec(line)) !== null) {
            // Add text before the chord (if any)
            this.addTextSegmentIfNotEmpty(segments, line, lastIndex, match.index);

            const content = match[1];
            const segment = this.parseLineSegment(content);
            segments.push(segment);

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text after the last chord
        this.addTextSegmentIfNotEmpty(segments, line, lastIndex, line.length);

        return segments;
    }

    private parseLineSegment(marker: string): LineSegment {
        if (marker.startsWith('*')) {
            return new Annotation(marker.substring(1));
        }

        const chordMatch = marker.match(ChoproParser.CHORD_PATTERN);
        if (chordMatch) {
            return new ChordNotation(
                chordMatch[0],       // Full chord string
                chordMatch[1],       // Root note
                chordMatch[2] || '', // Accidental (sharp/flat)
                chordMatch[3] || '', // Modifier (e.g. 7, maj7, etc.)
                chordMatch[5] || ''  // Bass note (e.g. /C)
            );
        }

        return new TextSegment(marker);
    }

    /**
     * Helper method to add text segments only if they have content
     */
    private addTextSegmentIfNotEmpty(
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
            chordSpan.innerHTML = decoratedChord;
            return chordSpan;
        } else {
            const annotationSpan = container.createSpan({ cls: 'chopro-annotation' });
            annotationSpan.textContent = segment.content;
            return annotationSpan;
        }
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
                // Preserve whitespace in instrumental lines for proper chord spacing
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
    private parser: ChoproParser;
    private renderer: ChoproRenderer;

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
