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
        this.renderInstrumental(segments, lineDiv);
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
        chordSpan.createSpan({ text: segment.note });
        totalChordLength += segment.note.length;

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
    private renderer: ChoproRenderer;

    constructor(private settings: ChoproPluginSettings) {
        this.renderer = new ChoproRenderer(settings);
    }

    /**
     * Main entry point to process a raw ChoPro block.
     */
    processBlock(source: string, container: HTMLElement): void {
        const block = ChoproBlock.parse(source);
        this.renderer.renderBlock(block, container);
    }
}
