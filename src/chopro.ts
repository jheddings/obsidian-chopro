// chopro - Chord Pro Processor for Obsidian

import { ChoproPluginSettings } from './main';
import { ChordProParser, Song } from "chordproject-parser";

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
 * Orchestrates parsing and rendering of ChoPro blocks.
 */
export class ChoproProcessor {
    private parser: ChordProParser;
    private renderer: ObsidianFormatter;

    constructor(private settings: ChoproPluginSettings) {
        this.parser = new ChordProParser();
        this.renderer = new ObsidianFormatter(settings);
    }

    /**
     * Main entry point to process a raw ChoPro block.
     */
    processBlock(source: string, container: HTMLElement): void {
        const parser = new ChordProParser();
        const song = parser.parse(source);
        this.renderer.render(song, container);
    }
}
