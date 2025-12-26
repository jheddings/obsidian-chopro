// chopro - Chord Pro Processor for Obsidian

import { Logger } from "obskit";
import { RenderSettings } from "./config";
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
    ContentBlock,
    ChoproFile,
    MarkdownBlock,
    Frontmatter,
} from "./parser";

/**
 * Renderer for converting our AST into Obsidian DOM elements
 */
export class ContentRenderer {
    private logger = Logger.getLogger("ContentRenderer");
    private settings: RenderSettings;

    constructor(settings: RenderSettings) {
        this.settings = settings;
    }

    /**
     * Render a complete ChordPro file.
     */
    render(file: ChoproFile, container: HTMLElement): void {
        // TODO render Frontmatter as metadata container if defined

        file.blocks.forEach((block) => this.renderBlock(block, container));
    }

    /**
     * Render a content block
     */
    renderBlock(block: ContentBlock, container: HTMLElement): void {
        if (block instanceof MarkdownBlock) {
            this.renderMarkdownBlock(block, container);
        } else if (block instanceof ChoproBlock) {
            this.renderChoproBlock(block, container);
        }
    }

    /**
     * Render a markdown block into DOM elements
     */
    renderMarkdownBlock(block: MarkdownBlock, container: HTMLElement): void {
        const content = block.content;
        const markdown = container.createDiv({ cls: "markdown" });
        markdown.setText(content);

        // TODO render markdown ad DOM elements
        //await MarkdownRenderer.render(this.plugin.app, content, container, file.path, this.plugin);
    }

    /**
     * Render a ChordPro block into DOM elements
     */
    renderChoproBlock(block: ChoproBlock, container: HTMLElement): void {
        this.logger.debug(`Rendering ${block.lines.length} lines`);

        for (const line of block.lines) {
            this.renderLine(container, line);
        }
    }

    /**
     * Render song metadata header from frontmatter.
     * Layout: Left side (title, artist), Right side (key, tempo/time)
     */
    renderMetadataHeader(frontmatter: Frontmatter, container: HTMLElement): void {
        const title = frontmatter.get("title");
        const artist = frontmatter.get("artist");
        const key = frontmatter.get("key");
        const tempo = frontmatter.get("tempo");
        const time = frontmatter.get("time");

        // Only render if we have at least title or artist
        if (!title && !artist) {
            this.logger.debug("No title or artist found, skipping metadata header");
            return;
        }

        const header = container.createDiv({ cls: "chopro-header" });

        // Left column: title and artist
        const leftCol = header.createDiv({ cls: "chopro-header-left" });

        if (title) {
            leftCol.createDiv({ cls: "chopro-header-title", text: title });
        }
        if (artist) {
            leftCol.createDiv({ cls: "chopro-header-artist", text: artist });
        }

        // Right column: key and tempo/time info
        const rightCol = header.createDiv({ cls: "chopro-header-right" });

        if (key) {
            rightCol.createDiv({ cls: "chopro-header-info", text: `Key of ${key}` });
        }

        // Build tempo/time line (e.g., "85 BPM in 4/4")
        const tempoTimeParts: string[] = [];
        if (tempo) {
            tempoTimeParts.push(`${tempo} BPM`);
        }
        if (tempo && time) {
            tempoTimeParts.push("in");
        }
        if (time) {
            tempoTimeParts.push(time);
        }
        if (tempoTimeParts.length > 0) {
            rightCol.createDiv({ cls: "chopro-header-info", text: tempoTimeParts.join(" ") });
        }

        this.logger.debug("Metadata header rendered");
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

        // NOTE - other lines are ignored when rendering
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
