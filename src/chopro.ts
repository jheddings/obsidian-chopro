// chopro - Chord Pro Processor for Obsidian

import { Section } from 'chordproject-parser/types/models/sections';
import { ChoproPluginSettings } from './main';
import { ChordProParser, Song } from "chordproject-parser";
import { LyricsSection } from 'chordproject-parser';
import { Line } from 'chordproject-parser';
import { EmptyLine, LyricsLine } from 'chordproject-parser';

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
 * Renderer for converting ChoPro AST into DOM elements
 */
export class ChoproRenderer {
    constructor(private settings: ChoproPluginSettings) {}

    /**
     * Render a ChoPro block into DOM elements
     */
    render(block: ChoproBlock, container: HTMLElement): void {
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
                if (this.settings.showMetadata && line.directive) {
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

export class ObsidianFormatter {
    constructor(private settings: ChoproPluginSettings) {}

    /**
     * Format a Song into Obsidian elements.
     */
    render(song: Song, container: HTMLElement): void {
        this.renderMetadata(song, container);

        for (const section of song.sections) {
            const sectionDiv = container.createDiv({ cls: 'chopro-section' });
            this.renderSection(section, sectionDiv);
        }
    }

    /**
     * Render song metadata as directives.
     */
    private renderMetadata(song: Song, container: HTMLElement): void {
        if (song.title) {
            this.renderDirective('title', song.title, container);
        }

        if (song.subtitle) {
            this.renderDirective('subtitle', song.subtitle, container);
        }

        if (song.artists && song.artists.length > 0) {
            this.renderDirective('artist', song.artists.join(";"), container);
        }

        if (song.albums && song.albums.length > 0) {
            this.renderDirective('album', song.albums.join(";"), container);
        }

        if (song.key) {
            this.renderDirective('key', song.key.toString(), container);
        }

        if (song.tempo) {
            this.renderDirective('tempo', song.tempo.toString(), container);
        }

        if (song.time) {
            this.renderDirective('time', song.time.toString(), container);
        }

        if (song.capo) {
            this.renderDirective('capo', song.capo.toString(), container);
        }

        if (song.year) {
            this.renderDirective('year', song.year.toString(), container);
        }

        if (song.duration) {
            this.renderDirective('duration', song.duration.toString(), container);
        }

        if (song.copyright) {
            this.renderDirective('copyright', song.copyright, container);
        }

        if (song.customMetadatas) {
            for (const meta of song.customMetadatas) {
                this.renderDirective(meta[0], meta[1], container);
            }
        }
    }

    private renderDirective(name: string, value: string | null, container: HTMLElement): void {
        const directiveEl = container.createDiv({ cls: 'chopro-directive' });
        directiveEl.createSpan({ text: name, cls: 'chopro-directive-name' });

        if (value) {
            directiveEl.createSpan({ text: ': ' + value, cls: 'chopro-directive-value' });
        }
    }

    /**
     * Render a song section.
     */
    private renderSection(section: Section, container: HTMLElement): void {
        if (section instanceof LyricsSection) {
            this.renderLyricsSection(section, container);
        } else {
            this.renderGenericSection(section, container);
        }
    }

    /**
     * Render a lyrics section with proper styling and section headers.
     */
    private renderLyricsSection(section: LyricsSection, container: HTMLElement): void {
        const debugHeader = container.createEl('h2');
        debugHeader.textContent = 'Lyrics Section';

        if (section.name) {
            const headerDiv = container.createEl('h2');
            headerDiv.textContent = section.name;

            if (section.value) {
                headerDiv.textContent += ': ' + section.value;
            }
        }

        this.renderGenericSection(section, container);
    }

    /**
     * Render a generic section (fallback for unknown types).
     */
    private renderGenericSection(section: Section, container: HTMLElement): void {
        const debugHeader = container.createEl('h2');
        debugHeader.textContent = 'Generic Section';

        for (const line of section.lines) {
            this.renderSectionLine(line, container);
        }
    }

    /**
     * Render a line within a section based on its type.
     */
    private renderSectionLine(line: Line, container: HTMLElement): void {
        if (line instanceof EmptyLine) {
            container.createEl("br");
        } else if (line instanceof LyricsLine) {
            this.renderLyricsLine(line, container);
        } else {
            this.renderGenericLine(line, container);
        }
    }

    /**
     * Render a lyrics line with chord-lyric pairs.
     */
    private renderLyricsLine(line: LyricsLine, container: HTMLElement): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        
        if (line.pairs) {
            for (const pair of line.pairs) {
                this.renderChordLyricsPair(pair, lineDiv);
            }
        }
    }

    /**
     * Render a chord-lyrics pair from the parsed structure.
     */
    private renderChordLyricsPair(pair: any, lineDiv: HTMLElement): void {
        const pairSpan = lineDiv.createSpan({ cls: 'chopro-pair' });

        // Render chord if present
        if (pair.hasChord() && pair.chord) {
            const chordSpan = pairSpan.createSpan({ cls: 'chopro-chord' });
            const normalizedChord = this.normalizeChordFromObject(pair.chord);
            const decoratedChord = this.decorateChord(normalizedChord);
            chordSpan.innerHTML = decoratedChord;
        }

        // Render lyrics text
        const lyricsSpan = pairSpan.createSpan({ 
            text: pair.lyrics || '\u00A0',
            cls: 'chopro-lyrics' 
        });

        // Ensure minimum width for positioning if no lyrics
        if (!pair.lyrics || pair.lyrics.trim() === '') {
            lyricsSpan.style.minWidth = '1ch';
        }
    }

    /**
     * Normalize chord from parsed chord object.
     */
    private normalizeChordFromObject(chord: any): string {
        if (!chord) return '';
        
        // Handle chord object with root, modifier, bass, etc.
        let chordString = '';
        
        if (chord.root) {
            chordString += chord.root.toString();
        }
        
        if (chord.modifier) {
            chordString += `<span class="chopro-chord-modifier">${chord.modifier}</span>`;
        }
        
        if (chord.bass) {
            chordString += '/' + chord.bass.toString();
        }
        
        return chordString || chord.toString();
    }

    /**
     * Render a generic line (fallback).
     */
    private renderGenericLine(line: any, container: HTMLElement): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        const content = line.value || line.content || line.toString() || '';
        lineDiv.createSpan({ text: content });
    }

    /**
     * Normalize chord from string with modifier styling.
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
     * Build a normalized chord string with proper styling.
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

/**
 * Main processor that orchestrates parsing and rendering
 * Maintains backward compatibility with existing code
 */
export class ChoproProcessor {
    private parser: ChordProParser;
    private renderer: ObsidianFormatter;

    constructor(private settings: ChoproPluginSettings) {
        this.parser = new ChordProParser();
        this.renderer = new ObsidianFormatter(settings);
    }

    /**
     * Main entry point to process a ChoPro block
     * Maintains backward compatibility with existing API
     */
    processBlock(source: string, container: HTMLElement): void {
        const parser = new ChordProParser();
        const song = parser.parse(source);
        this.renderer.render(song, container);
    }
}
