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
