// transpose - chord conversion for the ChoPro Plugin

import { App, TFile } from 'obsidian';
import { 
    ChordNotation, 
    ChoproFile, 
    SegmentedLine,
    ChordType,
    ChoproBlock,
    ContentBlock,
    Frontmatter
} from './parser';

export interface TransposeOptions {
    fromKey?: string;
    toKey?: string;
    chordType?: ChordType;
}

export class ChordTransposer {
    private static readonly CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    private static readonly ENHARMONIC_MAP: { [key: string]: string } = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    
    private static readonly NASHVILLE_MAP: { [key: string]: string } = {
        'C': '1', 'C#': '1#', 'Db': '2b', 'D': '2', 'D#': '2#', 'Eb': '3b', 
        'E': '3', 'F': '4', 'F#': '4#', 'Gb': '5b', 'G': '5', 'G#': '5#', 
        'Ab': '6b', 'A': '6', 'A#': '6#', 'Bb': '7b', 'B': '7'
    };

    static transposeChordNotation(chord: ChordNotation, fromKey: string, toKey: string): ChordNotation {
        // Handle Nashville numbers - don't transpose them
        if (this.isNashvilleNumber(chord.root)) {
            return chord;
        }

        const transposedRoot = this.transposeNote(chord.root, fromKey, toKey);
        const transposedBass = chord.bass ? this.transposeNote(chord.bass, fromKey, toKey) : chord.bass;

        return new ChordNotation(
            transposedRoot,
            chord.accidental,
            chord.modifier,
            transposedBass
        );
    }

    static chordNotationToNashville(chord: ChordNotation, key: string): ChordNotation {
        if (this.isNashvilleNumber(chord.root)) {
            return chord;
        }

        const rootWithAccidental = chord.root + (chord.accidental || '');
        const nashvilleRoot = this.noteToNashville(rootWithAccidental, key);
        const nashvilleBass = chord.bass ? this.noteToNashville(chord.bass, key) : chord.bass;

        let modifier = chord.modifier || '';
        
        // Handle minor indication in Nashville numbers
        if (modifier && modifier.toLowerCase().includes('m') && !modifier.toLowerCase().includes('maj')) {
            modifier = 'm' + modifier.replace(/^m/i, '').toLowerCase();
        } else if (modifier) {
            modifier = modifier.toLowerCase();
        }

        return new ChordNotation(
            nashvilleRoot,
            undefined,
            modifier,
            nashvilleBass
        );
    }

    private static transposeNote(note: string, fromKey: string, toKey: string): string {
        const normalizedNote = note.replace(/[#b]/, (acc) => this.ENHARMONIC_MAP[note] ? this.ENHARMONIC_MAP[note].slice(-1) : acc);
        const normalizedFromKey = this.ENHARMONIC_MAP[fromKey] || fromKey;
        const normalizedToKey = this.ENHARMONIC_MAP[toKey] || toKey;

        const fromIndex = this.CHROMATIC_SCALE.indexOf(normalizedFromKey);
        const toIndex = this.CHROMATIC_SCALE.indexOf(normalizedToKey);
        const noteIndex = this.CHROMATIC_SCALE.indexOf(normalizedNote);

        if (fromIndex === -1 || toIndex === -1 || noteIndex === -1) {
            return note; // Return original if can't find in scale
        }

        const interval = (toIndex - fromIndex + 12) % 12;
        const newIndex = (noteIndex + interval) % 12;
        
        return this.CHROMATIC_SCALE[newIndex];
    }

    private static noteToNashville(note: string, key: string): string {
        const normalizedKey = this.ENHARMONIC_MAP[key] || key;
        const keyIndex = this.CHROMATIC_SCALE.indexOf(normalizedKey);
        const noteIndex = this.CHROMATIC_SCALE.indexOf(this.ENHARMONIC_MAP[note] || note);

        if (keyIndex === -1 || noteIndex === -1) {
            return note; // Return original if can't convert
        }

        const interval = (noteIndex - keyIndex + 12) % 12;
        const nashvilleNumbers = ['1', '1#', '2', '2#', '3', '4', '4#', '5', '5#', '6', '6#', '7'];
        
        return nashvilleNumbers[interval];
    }

    private static isNashvilleNumber(chord: string): boolean {
        return /^[1-7][#b]?[^A-G]*/.test(chord);
    }
}

export class FileTransposer {
    static readonly KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

    constructor(private app: App) {}

    async transposeFile(file: TFile, options: TransposeOptions): Promise<void> {
        const originalContent = await this.app.vault.read(file);
        const transposedContent = this.transposeContent(originalContent, options);
        await this.app.vault.modify(file, transposedContent);
    }

    private transposeContent(sourceContent: string, options: TransposeOptions): string {
        const choproFile = ChoproFile.parse(sourceContent);

        // Update frontmatter key if transposing to a new key (but not Nashville)
        if (options.toKey && options.toKey !== '##') {
            if (!choproFile.frontmatter) {
                choproFile.frontmatter = new Frontmatter();
            }
            choproFile.frontmatter.set('key', options.toKey);
        }

        // transpose chopro blocks in the content
        for (const block of choproFile.blocks) {
            if (block instanceof ChoproBlock) {
                this.transposeChoproBlock(block, options);
            }
        }

        return choproFile.toString();
    }

    private transposeChoproBlock(block: ChoproBlock, options: TransposeOptions): void {
        for (const line of block.lines) {
            if (line instanceof SegmentedLine) {
                this.transposeSegmentedLine(line, options);
            }
        }
    }

    private transposeSegmentedLine(line: SegmentedLine, options: TransposeOptions): void {
        for (let i = 0; i < line.segments.length; i++) {
            const segment = line.segments[i];
            
            if (segment instanceof ChordNotation) {
                let transposedChord: ChordNotation;
                
                if (options.toKey === '##') {
                    // Nashville notation
                    transposedChord = ChordTransposer.chordNotationToNashville(segment, options.fromKey || 'C');

                } else if (options.fromKey && options.toKey) {
                    // Regular transposition
                    transposedChord = ChordTransposer.transposeChordNotation(segment, options.fromKey, options.toKey);

                } else {
                    transposedChord = segment;
                }
                
                // Replace the segment in place
                line.segments[i] = transposedChord;
            }
        }
    }

    extractKeyFromFrontmatter(content: string): string | null {
        const choproFile = ChoproFile.parse(content);
        return choproFile.key || null;
    }
}
