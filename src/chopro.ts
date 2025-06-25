// chopro - Chord Pro Processor for Obsidian

import { ChoproPluginSettings } from './main';

export interface ChordSegment {
    type: 'chord' | 'annotation' | 'text';
    content: string;
    position: number;
}

export class ChoproProcessor {
    constructor(private settings: ChoproPluginSettings) {}

    /**
     * Main entry point to process a ChoPro block
     */
    processBlock(source: string, container: HTMLElement): void {
        const lines = source.trim().split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine === '') {
                container.createEl('br');

            } else if (this.isDirective(trimmedLine)) {
                if (this.settings.showDirectives) {
                    this.processDirective(trimmedLine, container);
                }

            } else if (this.isInstructionLine(trimmedLine)) {
                this.processInstructionLine(trimmedLine, container);

            } else if (this.hasChords(trimmedLine)) {
                this.processChordLine(trimmedLine, container);

            } else {
                this.processTextLine(trimmedLine, container);
            }
        }
    }

    /**
     * Check if a line is an instruction line (wrapped in parentheses).
     */
    private isInstructionLine(line: string): boolean {
        return /^\(.+\)$/.test(line);
    }

    /**
     * Process an instruction line.
     */
    private processInstructionLine(line: string, container: HTMLElement): void {
        const instructionDiv = container.createDiv({ cls: 'chopro-instruction' });

        // Remove the first and last parentheses for display
        const instructionText = line.slice(1, -1);
        instructionDiv.createSpan({ text: instructionText });
    }

    /**
     * Check if a line is a ChoPro directive (e.g. {title: My Song}).
     */
    private isDirective(line: string): boolean {
        return /^\{.+\}$/.test(line);
    }

    /**
     * Process a ChoPro directive line.
     */
    private processDirective(line: string, container: HTMLElement): void {
        const match = line.match(/^\{([^:]+):?\s*(.*)\}$/);
        if (! match) { return; }

        const directive = match[1].trim().toLowerCase();
        const value = match[2] ? match[2].trim() : null;

        const directiveEl = container.createDiv({ cls: 'chopro-directive' });
        directiveEl.createSpan({ text: directive, cls: 'chopro-directive-name' });

        if (value) {
            directiveEl.createSpan({ text: ': ' + value, cls: 'chopro-directive-value' });
        }
    }

    /**
     * Check if a line contains chords.
     */
    private hasChords(line: string): boolean {
        return /\[[^\]]+\]/.test(line);
    }

    /**
     * Process a line that contains chords and/or lyrics.
     */
    private processChordLine(line: string, container: HTMLElement): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });

        const segments = this.parseChordLine(line);
        this.renderSegments(segments, lineDiv);
    }

    /**
     * Process a text-only line.
     */
    private processTextLine(line: string, container: HTMLElement): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        lineDiv.createSpan({ text: line, cls: 'chopro-lyrics' });
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
        const chordPattern = /^([A-G1-7])(#|♯|b|♭|[ei]s)?([^\/]*)(\/.*)?$/i;
        const chordMatch = normalized.match(chordPattern);

        if (!chordMatch) {
            return normalized;
        }

        const [, root, lift, modifier, bass] = chordMatch;
        return this.buildNormalizedChord(root, lift, modifier, bass);
    }

    /**
     * Build a normalized chord string with proper styling
     */
    private buildNormalizedChord(
        root: string, 
        lift?: string, 
        modifier?: string, 
        bass?: string
    ): string {
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
