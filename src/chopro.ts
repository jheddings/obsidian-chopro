// chopro - Chord Pro Processor for Obsidian

import { ChoproPluginSettings } from './main';
import { ChordProParser, Song } from "chordproject-parser";

/**
 * Obsidian formatter that renders Song objects into DOM elements.
 */
export class ObsidianFormatter {
    private container: HTMLElement;
    private settings: ChoproPluginSettings;

    constructor(container: HTMLElement, settings: ChoproPluginSettings) {
        this.container = container;
        this.settings = settings;
    }

    /**
     * Format a Song into Obsidian elements.
     */
    format(song: Song): void {
        this.container.empty();

        if (this.settings.showMetadata) {
            this.formatMetadata(song);
        }

        // Add content container
        const contentDiv = this.container.createDiv({ cls: 'chopro-content' });

        song.sections.forEach((section) => {
            this.formatSection(section, contentDiv);
        });
    }

    private formatMetadata(song: Song): void {
        const metadataDiv = this.container.createDiv({ cls: 'chopro-metadata' });

        if (song.title) {
            this.createMetadataElement('Title', song.title, metadataDiv);
        }

        if (song.subtitle) {
            this.createMetadataElement('Subtitle', song.subtitle, metadataDiv);
        }

        if (song.artists && song.artists.length > 0) {
            const label = song.artists.length > 1 ? 'Artists' : 'Artist';
            this.createMetadataElement(label, song.artists.join(', '), metadataDiv);
        }

        if (song.composers && song.composers.length > 0) {
            const label = song.composers.length > 1 ? 'Composers' : 'Composer';
            this.createMetadataElement(label, song.composers.join(', '), metadataDiv);
        }

        if (song.lyricists && song.lyricists.length > 0) {
            const label = song.lyricists.length > 1 ? 'Lyricists' : 'Lyricist';
            this.createMetadataElement(label, song.lyricists.join(', '), metadataDiv);
        }

        if (song.arrangers && song.arrangers.length > 0) {
            const label = song.arrangers.length > 1 ? 'Arrangers' : 'Arranger';
            this.createMetadataElement(label, song.arrangers.join(', '), metadataDiv);
        }

        if (song.albums && song.albums.length > 0) {
            this.createMetadataElement('Album', song.albums.join(', '), metadataDiv);
        }

        if (song.key) {
            this.createMetadataElement('Key', song.key.toString(), metadataDiv);
        }

        if (song.tempo) {
            this.createMetadataElement('Tempo', song.tempo.toString(), metadataDiv);
        }

        if (song.time) {
            this.createMetadataElement('Time', song.time.toString(), metadataDiv);
        }

        if (song.capo) {
            this.createMetadataElement('Capo', song.capo.toString(), metadataDiv);
        }

        if (song.year) {
            this.createMetadataElement('Year', song.year.toString(), metadataDiv);
        }

        if (song.duration) {
            const minutes = Math.floor(song.duration / 60);
            const seconds = song.duration % 60;
            const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            this.createMetadataElement('Duration', formatted, metadataDiv);
        }

        if (song.copyright) {
            this.createMetadataElement('Copyright', song.copyright, metadataDiv);
        }

        if (song.customMetadatas) {
            song.customMetadatas.forEach(([key, value]) => {
                const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                const text = value ? `${capitalizedKey}: ${value}` : capitalizedKey;
                metadataDiv.createDiv({ cls: 'chopro-directive', text });
            });
        }
    }

    private createMetadataElement(label: string, value: string, container: HTMLElement): void {
        container.createDiv({ cls: 'chopro-directive', text: `${label}: ${value}` });
    }

    private formatSection(section: any, container: HTMLElement): void {
        const sectionDiv = container.createDiv({ cls: 'chopro-section' });
        
        if (section.value) {
            sectionDiv.createDiv({ cls: 'chopro-section-title', text: section.value });
        }

        section.lines.forEach((line: any) => {
            this.formatLine(line, sectionDiv);
        });
    }

    private formatLine(line: any, container: HTMLElement): void {
        if (this.isEmptyLine(line)) {
            container.createEl('br');
        } else if (this.isLyricsLine(line)) {
            this.formatLyricsLine(line, container);
        } else if (this.isCommentLine(line)) {
            this.formatCommentLine(line, container);
        } else if (this.isTabLine(line)) {
            this.formatTabLine(line, container);
        } else if (this.isCustomLine(line)) {
            this.formatCustomLine(line, container);
        } else {
            this.formatGenericLine(line, container);
        }
    }

    private isEmptyLine(line: any): boolean {
        return line.lineType === 'empty' || (!line.pairs && !line.comment && !line.value && !line.name);
    }

    private isLyricsLine(line: any): boolean {
        return line.lineType === 'lyrics' || line.pairs;
    }

    private isCommentLine(line: any): boolean {
        return line.lineType === 'comment' || line.comment !== undefined;
    }

    private isTabLine(line: any): boolean {
        return line.lineType === 'tabs' || (line.value && typeof line.value === 'string' && line.value.includes('|'));
    }

    private isCustomLine(line: any): boolean {
        return line.lineType === 'custom' || (line.name && line.value !== undefined);
    }

    private formatLyricsLine(line: any, container: HTMLElement): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        
        if (line.pairs) {
            for (const pair of line.pairs) {
                this.formatChordLyricsPair(pair, lineDiv);
            }
        }
    }

    private formatChordLyricsPair(pair: any, lineDiv: HTMLElement): void {
        const pairSpan = lineDiv.createSpan({ cls: 'chopro-pair' });

        if (pair.chord) {
            const chordSpan = pairSpan.createSpan({ cls: 'chopro-chord' });
            const normalizedChord = this.normalizeChordFromObject(pair.chord);
            const decoratedChord = this.decorateChord(normalizedChord);
            chordSpan.innerHTML = decoratedChord;
        }

        if (pair.text) {
            const annotationSpan = pairSpan.createSpan({ cls: 'chopro-annotation' });
            annotationSpan.textContent = pair.text;
        }

        const lyricsSpan = pairSpan.createSpan({ 
            text: pair.lyrics || '\u00A0',
            cls: 'chopro-lyrics' 
        });

        // Ensure minimum width for positioning if no lyrics
        if (!pair.lyrics || pair.lyrics.trim() === '') {
            lyricsSpan.style.minWidth = '1ch';
        }
    }

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

    private formatCommentLine(line: any, container: HTMLElement): void {
        container.createDiv({ cls: 'chopro-comment', text: line.comment });
    }

    private formatTabLine(line: any, container: HTMLElement): void {
        container.createDiv({ cls: 'chopro-tab', text: line.value });
    }

    private formatCustomLine(line: any, container: HTMLElement): void {
        const text = line.value ? `${line.name}: ${line.value}` : line.name;
        container.createDiv({ cls: 'chopro-custom', text });
    }

    private formatGenericLine(line: any, container: HTMLElement): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });
        const content = line.value || line.content || line.toString() || '';
        lineDiv.createSpan({ text: content });
    }
}

/**
 * Orchestrates parsing and rendering of ChoPro blocks.
 */
export class ChoproProcessor {
    private parser: ChordProParser;
    private settings: ChoproPluginSettings;

    constructor(settings: ChoproPluginSettings) {
        this.parser = new ChordProParser();
        this.settings = settings;
    }

    /**
     * Main entry point to process a raw ChoPro block.
     */
    processBlock(source: string, container: HTMLElement): void {
        const parser = new ChordProParser();
        const song = parser.parse(source);
        
        const renderer = new ObsidianFormatter(container, this.settings);
        renderer.format(song);
    }
}
