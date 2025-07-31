// chopro - Chord Pro Processor for Obsidian

import { ChoproPluginSettings } from "./config";
import {
    BracketChord,
    Annotation,
    TextSegment,
    ChoproLine,
    EmptyLine,
    TextLine,
    LineSegment,
    ChordLyricsLine,
    InstrumentalLine,
    ChoproBlock,
    ChordSegment,
} from "./parser";

/**
 * Renderer for converting ChordPro AST into DOM elements
 */
export class ChoproRenderer {
    constructor(private settings: ChoproPluginSettings) {}

    /**
     * Update renderer settings without creating a new instance
     */
    updateSettings(settings: ChoproPluginSettings): void {
        this.settings = settings;
    }

    /**
     * Render a ChordPro block into DOM elements
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
            container.createEl("br");
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
     * Render a line with chords and/or lyrics
     */
    private renderChordLine(container: HTMLElement, segments: LineSegment[]): void {
        const lineDiv = container.createDiv({ cls: "chopro-line" });
        this.renderSegments(lineDiv, segments);
    }

    /**
     * Render an instrumental line with chords only (inline)
     */
    private renderInstrumentalLine(container: HTMLElement, segments: LineSegment[]): void {
        const lineDiv = container.createDiv({ cls: "chopro-line" });
        this.renderInstrumental(lineDiv, segments);
    }

    /**
     * Render a lyrics-only line
     */
    private renderTextLine(container: HTMLElement, content: string): void {
        const lineDiv = container.createDiv({ cls: "chopro-line" });
        lineDiv.createSpan({ text: content, cls: "chopro-lyrics" });
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
    private isSegmentPair(segment: LineSegment): segment is BracketChord | Annotation {
        return segment instanceof BracketChord || segment instanceof Annotation;
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
    private renderTextSegment(container: HTMLElement, segment: TextSegment): void {
        container.createSpan({
            text: segment.content,
            cls: "chopro-lyrics",
        });
    }

    /**
     * Render a line segment paired with optional text (usually lyrics).
     */
    private renderLineSegment(
        container: HTMLElement,
        segment: BracketChord | Annotation,
        nextSegment: LineSegment | null
    ): boolean {
        const pairSpan = container.createSpan({ cls: "chopro-pair" });

        if (segment instanceof BracketChord) {
            this.renderChord(pairSpan, segment);
        } else if (segment instanceof Annotation) {
            this.renderAnnotation(pairSpan, segment);
        }

        // Check if there's text immediately following
        let textContent = "";
        let textConsumed = false;
        if (nextSegment && this.isTextSegment(nextSegment) && nextSegment instanceof TextSegment) {
            textContent = nextSegment.content;
            textConsumed = true;
        }

        const textSpan = pairSpan.createSpan({
            text: textContent || "\u00A0",
            cls: "chopro-lyrics",
        });

        // ensure minimum width for positioning
        if (!textContent || textContent.trim() === "") {
            textSpan.style.minWidth = "1ch";
        }

        return textConsumed;
    }

    /**
     * Render an instrumental line with chords only (inline)
     */
    private renderInstrumental(container: HTMLElement, segments: LineSegment[]): void {
        for (const segment of segments) {
            if (segment instanceof BracketChord) {
                this.renderChord(container, segment);
            } else if (segment instanceof Annotation) {
                this.renderAnnotation(container, segment);
            } else {
                this.renderTextSegment(container, segment as TextSegment);
            }
        }
    }

    /**
     * Create a chord span with decorations and styling.
     */
    private renderChord(container: HTMLElement, segment: BracketChord): void {
        const chordSpan = container.createSpan({ cls: "chopro-chord" });
        const totalChordLength = this.applyChordDecorations(chordSpan, segment.chord);
        this.setMinimumWidth(container, totalChordLength);
    }

    /**
     * Create an annotation span with styling.
     */
    private renderAnnotation(container: HTMLElement, segment: Annotation): void {
        const annotationSpan = container.createSpan({ cls: "chopro-annotation" });
        annotationSpan.textContent = segment.content;
        this.setMinimumWidth(container, segment.content.length);
    }

    /**
     * Apply chord decorations and calculate total width of the notation.
     */
    private applyChordDecorations(container: HTMLElement, chord: ChordSegment): number {
        let totalChordLength = 0;
        const { prefix, suffix } = this.getChordDecorations();

        if (prefix) {
            container.createSpan({ text: prefix });
            totalChordLength += prefix.length;
        }

        const note = chord.note.toString(this.settings.normalizedChordDisplay);
        container.createSpan({ text: note });
        totalChordLength += note.length;

        if (chord.modifier) {
            const mod = this.settings.normalizedChordDisplay
                ? chord.quality || chord.modifier.toLowerCase()
                : chord.modifier;

            container.createSpan({ text: mod, cls: "chopro-chord-modifier" });
            totalChordLength += mod.length;
        }

        if (chord.bass) {
            const bass = chord.bass.toString(this.settings.normalizedChordDisplay);
            container.createSpan({ text: `/${bass}` });
            totalChordLength += 1 + bass.length; // +1 for the slash
        }

        if (suffix) {
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
            case "square":
                return { prefix: "[", suffix: "]" };
            case "round":
                return { prefix: "(", suffix: ")" };
            case "curly":
                return { prefix: "{", suffix: "}" };
            case "angle":
                return { prefix: "<", suffix: ">" };
            default:
                return { prefix: "", suffix: "" };
        }
    }

    /**
     * Set minimum width for chord positioning.
     */
    private setMinimumWidth(container: HTMLElement, lengthInChars: number): void {
        const adjustedWidth = lengthInChars * this.settings.chordSize;
        container.style.setProperty("--chord-min-width", `${adjustedWidth}ch`);
    }
}
