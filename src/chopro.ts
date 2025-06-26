// chopro - Chord Pro Processor for Obsidian

import { ChoproPluginSettings } from './main';

export interface ChordSegment {
    type: 'chord' | 'annotation' | 'text';
    content: string;
    position: number;
}

export interface ChoproLine {
    type: 'empty' | 'directive' | 'instruction' | 'chord' | 'text';
    content?: string;
    segments?: ChordSegment[];
    directive?: {
        name: string;
        value?: string;
    };
}

export interface ChoproBlock {
    lines: ChoproLine[];
}

/**
 * Parser for ChoPro source text into an abstract syntax tree
 */
export class ChoproParser {
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
            return { type: 'empty' };
        }

        if (this.isDirective(line)) {
            const directive = this.parseDirective(line);
            return {
                type: 'directive',
                directive: directive
            };
        }

        if (this.isInstructionLine(line)) {
            return {
                type: 'instruction',
                content: line.slice(1, -1) // Remove parentheses
            };
        }

        if (this.hasChords(line)) {
            return {
                type: 'chord',
                content: line,
                segments: this.parseChordLine(line)
            };
        }

        return {
            type: 'text',
            content: line
        };
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
        return /^\(.+\)$/.test(line);
    }

    /**
     * Check if a line is a ChoPro directive (e.g. {title: My Song}).
     */
    private isDirective(line: string): boolean {
        return /^\{.+\}$/.test(line);
    }

    /**
     * Parse a ChoPro directive line.
     */
    private parseDirective(line: string): { name: string; value?: string } {
        const match = line.match(/^\{([^:]+):?\s*(.*)\}$/);
        if (!match) {
            return { name: 'unknown' };
        }

        const directive = match[1].trim().toLowerCase();
        const value = match[2] ? match[2].trim() : undefined;

        return { name: directive, value };
    }

    /**
     * Check if a line contains chords.
     */
    private hasChords(line: string): boolean {
        return /\[[^\]]+\]/.test(line);
    }

    /**
     * Parse a line with chords into segments.
     */
    private parseChordLine(line: string): ChordSegment[] {
        const segments: ChordSegment[] = [];
        const chordRegex = /\[([^\]]+)\]/g;
        let lastIndex = 0;
        let match;

        while ((match = chordRegex.exec(line)) !== null) {
            // Add text before the chord (if any)
            this.addTextSegmentIfNotEmpty(segments, line, lastIndex, match.index);

            // Add the chord or annotation
            const content = match[1];
            const segmentType = content.startsWith('*') ? 'annotation' : 'chord';
            const segmentContent = segmentType === 'annotation' ? content.substring(1) : content;
            
            segments.push({
                type: segmentType,
                content: segmentContent,
                position: match.index
            });

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text after the last chord
        this.addTextSegmentIfNotEmpty(segments, line, lastIndex, line.length);

        return segments;
    }

    /**
     * Helper method to add text segments only if they have content
     */
    private addTextSegmentIfNotEmpty(
        segments: ChordSegment[], 
        line: string, 
        startIndex: number, 
        endIndex: number
    ): void {
        if (endIndex > startIndex) {
            const textContent = line.substring(startIndex, endIndex);
            segments.push({
                type: 'text',
                content: textContent,
                position: startIndex
            });
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
        switch (line.type) {
            case 'empty':
                container.createEl('br');
                break;

            case 'directive':
                if (this.settings.showDirectives && line.directive) {
                    this.renderDirective(line.directive, container);
                }
                break;

            case 'instruction':
                this.renderInstruction(line.content!, container);
                break;

            case 'chord':
                this.renderChordLine(line.segments!, container);
                break;

            case 'text':
                this.renderTextLine(line.content!, container);
                break;
        }
    }

    /**
     * Render a directive
     */
    private renderDirective(directive: { name: string; value?: string }, container: HTMLElement): void {
        const directiveEl = container.createDiv({ cls: 'chopro-directive' });
        directiveEl.createSpan({ text: directive.name, cls: 'chopro-directive-name' });

        if (directive.value) {
            directiveEl.createSpan({ text: ': ' + directive.value, cls: 'chopro-directive-value' });
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
    private renderChordLine(segments: ChordSegment[], container: HTMLElement): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        this.renderSegments(segments, lineDiv);
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
    private renderSegments(segments: ChordSegment[], lineDiv: HTMLElement): void {
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            if (segment.type === 'chord' || segment.type === 'annotation') {
                const nextSegment = i + 1 < segments.length ? segments[i + 1] : null;
                const consumed = this.renderChordOrAnnotation(segment, nextSegment, lineDiv);
                if (consumed) {
                    i++; // Skip the consumed text segment
                }
            } else if (segment.type === 'text') {
                this.renderOrphanedText(segment, lineDiv);
            }
        }
    }

    /**
     * Render a chord or annotation with optional following text
     */
    private renderChordOrAnnotation(
        segment: ChordSegment, 
        nextSegment: ChordSegment | null, 
        lineDiv: HTMLElement
    ): boolean {
        const pairSpan = lineDiv.createSpan({ cls: 'chopro-pair' });

        // Create the chord or annotation span
        if (segment.type === 'chord') {
            const normalizedChord = this.normalizeChord(segment.content);
            const decoratedChord = this.decorateChord(normalizedChord);
            const chordSpan = pairSpan.createSpan({ cls: 'chopro-chord' });
            chordSpan.innerHTML = decoratedChord;
        } else {
            const annotationSpan = pairSpan.createSpan({ cls: 'chopro-annotation' });
            annotationSpan.textContent = segment.content;
        }

        // Check if there's text immediately following
        let textContent = '';
        let textConsumed = false;
        if (nextSegment && nextSegment.type === 'text') {
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
    private renderOrphanedText(segment: ChordSegment, lineDiv: HTMLElement): void {
        lineDiv.createSpan({
            text: segment.content,
            cls: 'chopro-lyrics'
        });
    }

    /**
     * Validates and normalizes chord notation with modifier styling
     */
    private normalizeChord(chord: string): string {
        const normalized = chord.trim().replace(/\s+/g, ' ');
        const chordPattern = /^([A-G1-7])(#|♯|b|♭|[ei]s)?([^\/]+)?(\/.+)?$/i;
        const chordMatch = normalized.match(chordPattern);

        if (!chordMatch) {
            return normalized;
        }

        const [, root, lift, modifier, bass] = chordMatch;

        const baseChord = root + (lift || '');
        const modPart = modifier 
            ? `<span class="chopro-chord-modifier">${modifier.toLowerCase()}</span>` 
            : '';
        const slashPart = bass || '';

        return baseChord + modPart + slashPart;
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
}

/**
 * Main processor that orchestrates parsing and rendering
 * Maintains backward compatibility with existing code
 */
export class ChoproProcessor {
    private parser: ChoproParser;
    private renderer: ChoproRenderer;

    constructor(private settings: ChoproPluginSettings) {
        this.parser = new ChoproParser();
        this.renderer = new ChoproRenderer(settings);
    }

    /**
     * Main entry point to process a ChoPro block
     * Maintains backward compatibility with existing API
     */
    processBlock(source: string, container: HTMLElement): void {
        const block = this.parser.parseBlock(source);
        this.renderer.renderBlock(block, container);
    }
}
