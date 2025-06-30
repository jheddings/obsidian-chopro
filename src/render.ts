// chopro - Chord Pro Processor for Obsidian

import { ChoproPluginSettings } from './main';
import {
    LineSegment,
    ChordNotation,
    Annotation,
    TextSegment,
    ChoproLine,
    EmptyLine,
    MetadataLine,
    TextLine,
    InstructionLine,
    ChordLyricsLine,
    InstrumentalLine,
    ChoproBlock,
} from './parser';

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
            this.renderLine(container, line);
        }
    }

    /**
     * Render a single line based on its type
     */
    private renderLine(container: HTMLElement, line: ChoproLine): void {
        if (line instanceof EmptyLine) {
            container.createEl('br');
        } else if (line instanceof MetadataLine) {
            if (this.settings.showDirectives) {
                this.renderMetadata(container, line);
            }
        } else if (line instanceof InstructionLine) {
            this.renderInstruction(container, line.content);
        } else if (line instanceof ChordLyricsLine) {
            this.renderChordLine(container, line.segments);
        } else if (line instanceof InstrumentalLine) {
            this.renderInstrumentalLine(container, line.segments);
        } else if (line instanceof TextLine) {
            this.renderTextLine(container, line.content);
        }

        // NOTE - CommentLine's are ignored when rendering
    }

    /**
     * Render metadata.
     */
    private renderMetadata(container: HTMLElement, meta: MetadataLine): void {
        const directiveEl = container.createDiv({ cls: 'chopro-metadata' });
        directiveEl.createSpan({ text: meta.name, cls: 'chopro-metadata-name' });

        if (meta.value) {
            directiveEl.createSpan({ text: ': ' + meta.value, cls: 'chopro-metadata-value' });
        }
    }

    /**
     * Render an instruction line
     */
    private renderInstruction(container: HTMLElement, content: string): void {
        const instructionDiv = container.createDiv({ cls: 'chopro-instruction' });
        instructionDiv.createSpan({ text: content });
    }

    /**
     * Render a line with chords and/or lyrics
     */
    private renderChordLine(container: HTMLElement, segments: LineSegment[]): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        this.renderSegments(lineDiv, segments);
    }

    /**
     * Render an instrumental line with chords only (inline)
     */
    private renderInstrumentalLine(container: HTMLElement, segments: LineSegment[]): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        this.renderInstrumental(lineDiv, segments);
    }

    /**
     * Render a lyrics-only line
     */
    private renderTextLine(container: HTMLElement, content: string): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        lineDiv.createSpan({ text: content, cls: 'chopro-lyrics' });
    }

    /**
     * Render chord and text segments into HTML elements
     */
    private renderSegments(container: HTMLElement, segments: LineSegment[]): void {
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            // chord and annotation segments are rendered as a pair with their text
            if (this.isSegmentPair(segment)) {
                const nextSegment = i + 1 < segments.length ? segments[i + 1] : null;

                if (this.renderLineSegment(container, segment, nextSegment)) {
                    i++;
                }

            } else {
                this.renderTextSegment(container, segment as TextSegment);
            }
        }
    }

    /**
     * Check if a segment is a chord or annotation
     */
    private isSegmentPair(segment: LineSegment): segment is ChordNotation | Annotation {
        return segment instanceof ChordNotation || segment instanceof Annotation;
    }

    /**
     * Check if a segment is text (not chord or annotation)
     */
    private isTextSegment(segment: LineSegment): boolean {
        return !this.isSegmentPair(segment);
    }

    /**
     * Render text segment that doesn't have a chord above it
     */
    private renderTextSegment(container: HTMLElement, segment: LineSegment): void {
        container.createSpan({
            text: segment.content,
            cls: 'chopro-lyrics'
        });
    }

    /**
     * Render a line segment paired with optional text (usually lyrics).
     */
    private renderLineSegment(
        container: HTMLElement,
        segment: ChordNotation | Annotation, 
        nextSegment: LineSegment | null
    ): boolean {
        const pairSpan = container.createSpan({ cls: 'chopro-pair' });

        if (segment instanceof ChordNotation) {
            this.renderChord(pairSpan, segment);
        } else if (segment instanceof Annotation) {
            this.renderAnnotation(pairSpan, segment);
        }

        // Check if there's text immediately following
        let textContent = '';
        let textConsumed = false;
        if (nextSegment && this.isTextSegment(nextSegment)) {
            textContent = nextSegment.content;
            textConsumed = true;
        }

        const textSpan = pairSpan.createSpan({
            text: textContent || '\u00A0',
            cls: 'chopro-lyrics'
        });

        // ensure minimum width for positioning
        if (!textContent || textContent.trim() === '') {
            textSpan.style.minWidth = '1ch';
        }

        return textConsumed;
    }

    /**
     * Render an instrumental line with chords only (inline)
     */
    private renderInstrumental(container: HTMLElement, segments: LineSegment[]): void {
        for (const segment of segments) {
            if (segment instanceof ChordNotation) {
                this.renderChord(container, segment);
            } else if (segment instanceof Annotation) {
                this.renderAnnotation(container, segment);
            } else {
                this.renderTextSegment(container, segment);
            }
        }
    }

    /**
     * Create a chord span with decorations and styling.
     */
    private renderChord(container: HTMLElement, segment: ChordNotation): void {
        const chordSpan = container.createSpan({ cls: 'chopro-chord' });
        const totalChordLength = this.applyChordDecorations(chordSpan, segment);
        this.setMinimumWidth(container, totalChordLength);
    }

    /**
     * Create an annotation span with styling.
     */
    private renderAnnotation(container: HTMLElement, segment: Annotation): void {
        const annotationSpan = container.createSpan({ cls: 'chopro-annotation' });
        annotationSpan.textContent = segment.content;
        this.setMinimumWidth(container, segment.content.length);
    }

    /**
     * Apply chord decorations and calculate total width
     */
    private applyChordDecorations(container: HTMLElement, segment: ChordNotation): number {
        let totalChordLength = 0;
        const { prefix, suffix } = this.getChordDecorations();
        
        if (prefix && prefix.length > 0) {
            container.createSpan({ text: prefix });
            totalChordLength += prefix.length;
        }

        // add the base chord (root + accidental)
        container.createSpan({ text: segment.note });
        totalChordLength += segment.note.length;

        if (segment.modifier) {
            container.createSpan({ 
                text: segment.modifier.toLowerCase(), 
                cls: 'chopro-chord-modifier' 
            });
            totalChordLength += segment.modifier.length;
        }

        if (segment.bass) {
            container.createSpan({ text: `/${segment.bass}` });
            totalChordLength += 1 + segment.bass.length; // +1 for the slash
        }

        if (suffix && suffix.length > 0) {
            container.createSpan({ text: suffix });
            totalChordLength += suffix.length;
        }

        return totalChordLength;
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

    /**
     * Set minimum width for chord positioning
     */
    private setMinimumWidth(container: HTMLElement, lengthInChars: number): void {
        // TODO figure out how to account for user font size preference
        container.style.setProperty('--chord-min-width', `${lengthInChars}ch`);
    }
}
