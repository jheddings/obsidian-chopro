// transpose - Transposition and Nashville Number System conversion for ChoPro

import { App, TFile } from 'obsidian';
import { 
    ChordNotation, 
    ChoproParser, 
    ChordLine, 
    ChoproLine, 
    EmptyLine, 
    MetadataLine, 
    InstructionLine,
    TextLine 
} from './chopro';

export interface TransposeOptions {
    fromKey?: string;
    toKey?: string;
    toNashville?: boolean;
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
        // Already Nashville - return as is
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
            undefined, // Nashville numbers don't use accidentals on the root
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
    private parser: ChoproParser;
    
    // Available musical keys for transposition
    static readonly KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

    constructor(private app: App) {
        this.parser = new ChoproParser();
    }

    async transposeFile(file: TFile, options: TransposeOptions): Promise<void> {
        const content = await this.app.vault.read(file);
        const transposedContent = this.transposeContent(content, options);
        await this.app.vault.modify(file, transposedContent);
    }

    private transposeContent(content: string, options: TransposeOptions): string {
        let updatedContent = content;

        // Update frontmatter key if transposing to a new key
        if (options.toKey && !options.toNashville) {
            updatedContent = this.updateFrontmatterKey(updatedContent, options.toKey);
        }

        // Transpose chopro blocks
        return updatedContent.replace(/```chopro\n([\s\S]*?)\n```/g, (match, choproContent) => {
            const transposedChopro = this.transposeChoproBlock(choproContent, options);
            return `\`\`\`chopro\n${transposedChopro}\n\`\`\``;
        });
    }

    private transposeChoproBlock(content: string, options: TransposeOptions): string {
        const block = this.parser.parseBlock(content);
        const transposedLines: string[] = [];

        for (const line of block.lines) {
            transposedLines.push(this.transposeLine(line, options));
        }

        return transposedLines.join('\n');
    }

    private transposeLine(line: ChoproLine, options: TransposeOptions): string {
        if (line instanceof ChordLine) {
            return this.transposeChordLine(line, options);
        }
        
        if (line instanceof EmptyLine) {
            return '';
        }
        
        if (line instanceof MetadataLine) {
            const value = line.value ? `: ${line.value}` : '';
            return `{${line.name}${value}}`;
        }
        
        if (line instanceof InstructionLine) {
            return `(${line.content})`;
        }
        
        if (line instanceof TextLine) {
            return line.content;
        }
        
        return '';
    }

    private transposeChordLine(line: ChordLine, options: TransposeOptions): string {
        // Reconstruct the line with transposed chords
        let result = '';
        
        for (const segment of line.segments) {
            if (segment instanceof ChordNotation) {
                let transposedChord: ChordNotation;
                
                if (options.toNashville) {
                    transposedChord = ChordTransposer.chordNotationToNashville(segment, options.toKey || 'C');
                } else if (options.fromKey && options.toKey) {
                    transposedChord = ChordTransposer.transposeChordNotation(segment, options.fromKey, options.toKey);
                } else {
                    transposedChord = segment;
                }
                
                result += `[${transposedChord.toString()}]`;
            } else {
                // For text segments and annotations, keep original content
                result += segment.content;
            }
        }
        
        return result;
    }

    extractKeyFromFrontmatter(content: string): string | null {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            return null;
        }

        const frontmatter = frontmatterMatch[1];
        const keyMatch = frontmatter.match(/^key:\s*([A-G][#b]?)\s*$/m);

        return keyMatch ? keyMatch[1] : null;
    }

    private updateFrontmatterKey(content: string, newKey: string): string {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            // No frontmatter exists, add it
            return `---\nkey: ${newKey}\n---\n\n${content}`;
        }

        const frontmatter = frontmatterMatch[1];
        const keyMatch = frontmatter.match(/^key:\s*([A-G][#b]?)\s*$/m);

        if (keyMatch) {
            // Update existing key
            const updatedFrontmatter = frontmatter.replace(/^key:\s*([A-G][#b]?)\s*$/m, `key: ${newKey}`);
            return content.replace(/^---\n([\s\S]*?)\n---/, `---\n${updatedFrontmatter}\n---`);
        } else {
            // Add key to existing frontmatter
            const updatedFrontmatter = `${frontmatter}\nkey: ${newKey}`;
            return content.replace(/^---\n([\s\S]*?)\n---/, `---\n${updatedFrontmatter}\n---`);
        }
    }
}
