// chopro - Chord Pro Processor for Obsidian

import { ChoproPluginSettings } from './main';

export interface ChordSegment {
    type: 'chord' | 'text';
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

            } else if (this.isChordLine(trimmedLine)) {
                this.processLine(trimmedLine, container);

            } else {
                this.processLine(trimmedLine, container);
            }
        }
    }

    /**
     * Check if a line is an instruction line (wrapped in parentheses).
     */
    private isInstructionLine(line: string): boolean {
        return /^\([^)]*\)$/.test(line.trim());
    }

    /**
     * Process an instruction line.
     */
    private processInstructionLine(line: string, container: HTMLElement): void {
        const instructionDiv = container.createDiv({ cls: 'chopro-instruction' });
        // Remove the parentheses for display
        const instructionText = line.trim().slice(1, -1);
        instructionDiv.createSpan({ text: instructionText });
    }

    /**
     * Check if a line is a ChoPro directive (e.g. {title: My Song}).
     */
    private isDirective(line: string): boolean {
        return /^\{[^}]+\}$/.test(line.trim());
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
     * Check if a line contains only chords (no lyrics) and whitespace.
     */
    private isChordLine(line: string): boolean {
        const withoutChords = line.replace(/\[[^\]]*\]/g, '');
        return withoutChords.trim() === '' && line.includes('[');
    }

    /**
     * Process a line that may contain chords and/or lyrics.
     */
    private processLine(line: string, container: HTMLElement): void {
        const lineDiv = container.createDiv({ cls: 'chopro-line' });

        if (! line.includes('[')) {
            // No chords, just add the text
            lineDiv.createSpan({ text: line, cls: 'chopro-lyrics' });

        } else {
            const segments = this.parseChordLine(line);
            
            this.renderSegments(segments, lineDiv);
        }
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
            if (match.index > lastIndex) {
                const textContent = line.substring(lastIndex, match.index);
                segments.push({
                    type: 'text',
                    content: textContent,
                    position: lastIndex
                });
            }

            // Add the chord
            segments.push({
                type: 'chord',
                content: match[1],
                position: match.index
            });

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text after the last chord
        if (lastIndex < line.length) {
            const remainingText = line.substring(lastIndex);
            segments.push({
                type: 'text',
                content: remainingText,
                position: lastIndex
            });
        }

        return segments;
    }

    /**
     * Render chord and text segments into HTML elements
     */
    private renderSegments(segments: ChordSegment[], lineDiv: HTMLElement): void {
        let i = 0;

        while (i < segments.length) {
            const segment = segments[i];

            if (segment.type === 'chord') {
                const pairSpan = lineDiv.createSpan({ cls: 'chopro-pair' });

                const normalizedChord = this.normalizeChord(segment.content);
                const decoratedChord = this.decorateChord(normalizedChord);
                const chordSpan = pairSpan.createSpan({ cls: 'chopro-chord' });
                chordSpan.innerHTML = decoratedChord;

                pairSpan.style.setProperty('--chord-min-width', `${decoratedChord.length}ch`);

                // Check if there's text immediately following this chord
                let textContent = '';
                if (i + 1 < segments.length && segments[i + 1].type === 'text') {
                    textContent = segments[i + 1].content;
                    i++; // Skip the text segment as we've consumed it
                }

                // Create the text span (may be empty for chord-only positions)
                const textSpan = pairSpan.createSpan({
                    text: textContent || '\u00A0',
                    cls: 'chopro-lyrics'
                });

                // If the text is only whitespace, ensure minimum width for chord positioning
                if (!textContent || textContent.trim() === '') {
                    textSpan.style.minWidth = '1ch';
                }

            } else if (segment.type === 'text') {
                // Text without a chord above it (orphaned text)
                lineDiv.createSpan({
                    text: segment.content,
                    cls: 'chopro-lyrics'
                });
            }

            i++;
        }
    }

    /**
     * Validates and normalizes chord notation with modifier styling
     */
    private normalizeChord(chord: string): string {
        let normalized = chord.trim().replace(/\s+/g, ' ');

        const chordPattern = /^([A-G1-7])(#|♯|b|♭|[ei]s)?([^\/]*)(\/.*)?$/i;
        const chordMatch = normalized.match(chordPattern);

        if (chordMatch) {
            const [, root, lift, modifier, bass] = chordMatch;

            const baseChord = root + (lift || '');
            const modPart = modifier ? `<span class="chopro-chord-modifier">${modifier.toLowerCase()}</span>` : '';
            const slashPart = bass || '';

            return baseChord + modPart + slashPart;
        }

        return normalized;
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
     * Calculate the minimum width needed for a chord to prevent collisions.
     */
    private calculateChordWidth(chord: string): number {
        const baseWidth = chord.length;
        const safetyMargin = 0.5;
        return baseWidth + safetyMargin;
    }
}
