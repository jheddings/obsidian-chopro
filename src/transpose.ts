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

export enum MusicalKey {
    C = 'C',
    C_SHARP = 'C#',
    D_FLAT = 'Db',
    D = 'D',
    D_SHARP = 'D#',
    E_FLAT = 'Eb',
    E = 'E',
    F = 'F',
    F_SHARP = 'F#',
    G_FLAT = 'Gb',
    G = 'G',
    G_SHARP = 'G#',
    A_FLAT = 'Ab',
    A = 'A',
    A_SHARP = 'A#',
    B_FLAT = 'Bb',
    B = 'B'
}

export class Transposer {
    private static readonly CHROMATIC_SCALE = [
        ['C'],           // 0
        ['C#', 'Db'],    // 1
        ['D'],           // 2
        ['D#', 'Eb'],    // 3
        ['E'],           // 4
        ['F'],           // 5
        ['F#', 'Gb'],    // 6
        ['G'],           // 7
        ['G#', 'Ab'],    // 8
        ['A'],           // 9
        ['A#', 'Bb'],    // 10
        ['B']            // 11
    ];

    private static readonly NASHVILLE_SCALE = [
        ['1'],           // 0
        ['1#', '2b'],    // 1
        ['2'],           // 2
        ['2#', '3b'],    // 3
        ['3'],           // 4
        ['4'],           // 5
        ['4#', '5b'],    // 6
        ['5'],           // 7
        ['5#', '6b'],    // 8
        ['6'],           // 9
        ['6#', '7b'],    // 10
        ['7']            // 11
    ];

    /**
     * Calculate the pitch difference (in semitones) between two keys.
     * @returns The number of semitones between the keys (positive = up, negative = down)
     */
    static calculatePitchDifference(fromKey: string, toKey: string, useNashville: boolean = false): number {
        const scale = useNashville ? this.NASHVILLE_SCALE : this.CHROMATIC_SCALE;
        
        const fromIndex = this.findNoteIndex(fromKey, scale);
        const toIndex = this.findNoteIndex(toKey, scale);
        
        let difference = toIndex - fromIndex;
        
        // take the shortest path around the circle
        if (difference > 6) {
            difference -= 12;
        } else if (difference < -6) {
            difference += 12;
        }
        
        return difference;
    }

    /**
     * Determine the modal degree of a note within a given key.
     * @returns The scale degree (1-7) of the note within the key
     */
    static getModalDegree(note: string, key: string): number {
        const noteIndex = this.findNoteIndex(note, this.CHROMATIC_SCALE);
        const keyIndex = this.findNoteIndex(key, this.CHROMATIC_SCALE);
        
        let semitones = (noteIndex - keyIndex + 12) % 12;
        
        // Map semitones to scale degrees in major scale
        // Major scale intervals: 0, 2, 4, 5, 7, 9, 11 semitones
        const scaleIntervals = [0, 2, 4, 5, 7, 9, 11];
        const scaleDegrees = [1, 2, 3, 4, 5, 6, 7];
        
        // Find exact match first
        for (let i = 0; i < scaleIntervals.length; i++) {
            if (scaleIntervals[i] === semitones) {
                return scaleDegrees[i];
            }
        }
        
        // Handle chromatic notes by mapping to the closest scale degree
        // with special handling for tritone (6 semitones)
        if (semitones === 6) {
            // Tritone - map to degree 5 (flat 5th)
            return 5;
        }
        
        // For other chromatic notes, map to the higher degree when equidistant
        // This handles cases like 1 semitone (between 1 and 2) -> map to 2
        // 3 semitones (between 2 and 4) -> map to 3, etc.
        const closestIndex = scaleIntervals.reduce((closest, current, index) => {
            const currentDiff = Math.abs(current - semitones);
            const closestDiff = Math.abs(scaleIntervals[closest] - semitones);
            
            if (currentDiff < closestDiff) {
                return index;
            } else if (currentDiff === closestDiff) {
                // When equidistant, prefer the higher degree
                return semitones > current ? index : closest;
            }
            return closest;
        }, 0);
        
        return scaleDegrees[closestIndex];
    }

    /**
     * Find the index of a note in the given scale.
     * @returns The index of the note, or throw if not found
     */
    private static findNoteIndex(note: string, scale: string[][]): number {
        for (let i = 0; i < scale.length; i++) {
            if (scale[i].includes(note)) {
                return i;
            }
        }

        throw new Error(`Invalid note: ${note}`);
    }
}
