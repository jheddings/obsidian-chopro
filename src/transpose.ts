// transpose - chord conversion for the ChoPro Plugin

import { App, TFile } from 'obsidian';
import { 
    ChordNotation, 
    ChoproFile, 
    SegmentedLine,
    ChoproBlock,
    Frontmatter,
    MusicalNote,
    NoteType
} from './parser';

export interface TransposeOptions {
    fromKey?: string;
    toKey?: string;
}

export class ChordTransposer {
    private static readonly CHROMATIC_SCALE = [
        'C',   // 0 - C natural
        'C#',  // 1 - C sharp / D flat
        'D',   // 2 - D natural
        'D#',  // 3 - D sharp / E flat
        'E',   // 4 - E natural
        'F',   // 5 - F natural
        'F#',  // 6 - F sharp / G flat
        'G',   // 7 - G natural
        'G#',  // 8 - G sharp / A flat
        'A',   // 9 - A natural
        'A#',  // 10 - A sharp / B flat
        'B'    // 11 - B natural
    ];

    private static readonly NASHVILLE_SCALE = [
        '1',   // 0 semitones - root
        '1#',  // 1 semitone - flat 2nd as sharp 1st
        '2',   // 2 semitones - major 2nd
        '2#',  // 3 semitones - minor 3rd as sharp 2nd (could also be 3b)
        '3',   // 4 semitones - major 3rd
        '4',   // 5 semitones - perfect 4th
        '4#',  // 6 semitones - tritone as sharp 4th (could also be 5b)
        '5',   // 7 semitones - perfect 5th
        '5#',  // 8 semitones - minor 6th as sharp 5th (could also be 6b)
        '6',   // 9 semitones - major 6th
        '6#',  // 10 semitones - minor 7th as sharp 6th (could also be 7b)
        '7'    // 11 semitones - major 7th
    ];

    private static readonly ENHARMONIC_MAP: { [key: string]: string } = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    };
    
    static transposeChordNotation(chord: ChordNotation, fromKey: string, toKey: string): ChordNotation {
        if (chord.note.noteType === NoteType.NASHVILLE) {
            return chord;
        }

        const transposedNote = this.transposeMusicalNote(chord.note, fromKey, toKey);
        const transposedBass = chord.bass ? this.transposeMusicalNote(chord.bass, fromKey, toKey) : chord.bass;

        return new ChordNotation(
            transposedNote,
            chord.modifier,
            transposedBass
        );
    }

    static chordNotationToNashville(chord: ChordNotation, key: string): ChordNotation {
        if (chord.note.noteType === NoteType.NASHVILLE) {
            return chord;
        }

        const rootWithAccidental = chord.note.toString();
        const nashvilleRoot = this.noteToNashville(rootWithAccidental, key);
        const nashvilleBass = chord.bass ? this.noteToNashville(chord.bass.toString(), key) : chord.bass;

        let modifier = chord.modifier || '';
        
        // Handle minor indication in Nashville numbers
        if (modifier && modifier.toLowerCase().includes('m') && !modifier.toLowerCase().includes('maj')) {
            modifier = 'm' + modifier.replace(/^m/i, '').toLowerCase();
        } else if (modifier) {
            modifier = modifier.toLowerCase();
        }

        const nashvilleNote = MusicalNote.parse(nashvilleRoot);
        const nashvilleBassNote = nashvilleBass ? MusicalNote.parse(nashvilleBass as string) : undefined;

        return new ChordNotation(
            nashvilleNote,
            modifier,
            nashvilleBassNote
        );
    }

    private static transposeMusicalNote(note: MusicalNote, fromKey: string, toKey: string): MusicalNote {
        const noteString = note.toString();
        const transposedNoteString = this.transposeNote(noteString, fromKey, toKey);
        return MusicalNote.parse(transposedNoteString);
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
        
        // Normalize the note to use sharps consistently for chromatic calculation
        let normalizedNote = this.ENHARMONIC_MAP[note] || note;
        const noteIndex = this.CHROMATIC_SCALE.indexOf(normalizedNote);

        if (keyIndex === -1 || noteIndex === -1) {
            return note; // Return original if can't convert
        }

        const interval = (noteIndex - keyIndex + 12) % 12;
        
        let nashvilleResult = this.NASHVILLE_SCALE[interval];
        
        // Handle special cases where flats are more common than sharps
        // Check if the original note was a flat and adjust accordingly
        if (note.includes('b') || note.includes('♭')) {
            switch (interval) {
                case 1: nashvilleResult = '2b'; break;  // Db -> 2b instead of 1#
                case 3: nashvilleResult = '3b'; break;  // Eb -> 3b instead of 2#
                case 6: nashvilleResult = '5b'; break;  // Gb -> 5b instead of 4#
                case 8: nashvilleResult = '6b'; break;  // Ab -> 6b instead of 5#
                case 10: nashvilleResult = '7b'; break; // Bb -> 7b instead of 6#
            }
        }
        
        return nashvilleResult;
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
