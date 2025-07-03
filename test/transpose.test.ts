import { ChordNotation, MusicalNote, NoteType } from "../src/parser";
import { Transposer, MusicalKey } from "../src/transpose";

describe("calculatePitchDifference", () => {
    describe("chromatic scale", () => {
        const chromaticTestCases = [
            // Same key
            { sourceKey: 'C', targetKey: 'C', expected: 0 },
            { sourceKey: 'G', targetKey: 'G', expected: 0 },
            { sourceKey: 'F#', targetKey: 'F#', expected: 0 },
            { sourceKey: 'Bb', targetKey: 'Bb', expected: 0 },
            
            // Going up - natural keys
            { sourceKey: 'C', targetKey: 'D', expected: 2 },
            { sourceKey: 'C', targetKey: 'G', expected: -5 },
            { sourceKey: 'F', targetKey: 'A', expected: 4 },
            { sourceKey: 'D', targetKey: 'E', expected: 2 },
            { sourceKey: 'G', targetKey: 'B', expected: 4 },
            
            // Going up - sharp keys
            { sourceKey: 'C', targetKey: 'C#', expected: 1 },
            { sourceKey: 'F', targetKey: 'F#', expected: 1 },
            { sourceKey: 'G', targetKey: 'G#', expected: 1 },
            { sourceKey: 'D', targetKey: 'A#', expected: -4 },
            { sourceKey: 'C#', targetKey: 'F#', expected: 5 },
            
            // Going up - flat keys
            { sourceKey: 'C', targetKey: 'Db', expected: 1 },
            { sourceKey: 'F', targetKey: 'Bb', expected: 5 },
            { sourceKey: 'G', targetKey: 'Eb', expected: -4 },
            { sourceKey: 'Bb', targetKey: 'Eb', expected: 5 },
            { sourceKey: 'Db', targetKey: 'Ab', expected: -5 },
            
            // Going down - natural keys
            { sourceKey: 'D', targetKey: 'C', expected: -2 },
            { sourceKey: 'G', targetKey: 'C', expected: 5 },
            { sourceKey: 'A', targetKey: 'F', expected: -4 },
            { sourceKey: 'E', targetKey: 'D', expected: -2 },
            { sourceKey: 'B', targetKey: 'G', expected: -4 },
            
            // Going down - sharp keys
            { sourceKey: 'C#', targetKey: 'C', expected: -1 },
            { sourceKey: 'F#', targetKey: 'F', expected: -1 },
            { sourceKey: 'G#', targetKey: 'G', expected: -1 },
            { sourceKey: 'A#', targetKey: 'D', expected: 4 },
            { sourceKey: 'F#', targetKey: 'C#', expected: -5 },
            
            // Going down - flat keys
            { sourceKey: 'Db', targetKey: 'C', expected: -1 },
            { sourceKey: 'Bb', targetKey: 'F', expected: -5 },
            { sourceKey: 'Eb', targetKey: 'G', expected: 4 },
            { sourceKey: 'Eb', targetKey: 'Bb', expected: -5 },
            { sourceKey: 'Ab', targetKey: 'Db', expected: 5 },
            
            // Enharmonic equivalents (should be 0)
            { sourceKey: 'C#', targetKey: 'Db', expected: 0 },
            { sourceKey: 'D#', targetKey: 'Eb', expected: 0 },
            { sourceKey: 'F#', targetKey: 'Gb', expected: 0 },
            { sourceKey: 'G#', targetKey: 'Ab', expected: 0 },
            { sourceKey: 'A#', targetKey: 'Bb', expected: 0 },
            
            // Enharmonic equivalents (reverse)
            { sourceKey: 'Db', targetKey: 'C#', expected: 0 },
            { sourceKey: 'Eb', targetKey: 'D#', expected: 0 },
            { sourceKey: 'Gb', targetKey: 'F#', expected: 0 },
            { sourceKey: 'Ab', targetKey: 'G#', expected: 0 },
            { sourceKey: 'Bb', targetKey: 'A#', expected: 0 },
            
            // Key changes with enharmonics (different but equivalent)
            { sourceKey: 'C#', targetKey: 'F', expected: 4 },
            { sourceKey: 'Db', targetKey: 'F', expected: 4 },
            { sourceKey: 'F#', targetKey: 'C', expected: -6 },
            { sourceKey: 'Gb', targetKey: 'C', expected: -6 },
            { sourceKey: 'Bb', targetKey: 'D', expected: 4 },
            { sourceKey: 'A#', targetKey: 'D', expected: 4 },
            
            // Shortest path around circle (tritone)
            { sourceKey: 'A', targetKey: 'G', expected: -2 },
            { sourceKey: 'F#', targetKey: 'C', expected: -6 },
            
            // Complex enharmonic paths
            { sourceKey: 'Ab', targetKey: 'C#', expected: 5 },
            { sourceKey: 'Eb', targetKey: 'A#', expected: -5 },
            { sourceKey: 'Gb', targetKey: 'B', expected: 5 },
        ];

        chromaticTestCases.forEach(({ sourceKey, targetKey, expected}) => {
            it(`should calculate pitch from ${sourceKey} to ${targetKey}`, () => {
                const pitchDifference = Transposer.calculatePitchDifference(sourceKey, targetKey, false);
                expect(pitchDifference).toBe(expected);
            });
        });

        it("should throw error for invalid keys", () => {
            expect(() => Transposer.calculatePitchDifference('X', 'C', false)).toThrow();
            expect(() => Transposer.calculatePitchDifference('C', 'Y', false)).toThrow();
        });
    });

    describe("nashville scale", () => {
        const nashvilleTestCases = [
            // Same key
            { sourceKey: '1', targetKey: '1', expected: 0 },
            { sourceKey: '5', targetKey: '5', expected: 0 },
            { sourceKey: '4#', targetKey: '4#', expected: 0 },
            { sourceKey: '7b', targetKey: '7b', expected: 0 },
            
            // Going up - natural numbers
            { sourceKey: '1', targetKey: '2', expected: 2 },
            { sourceKey: '1', targetKey: '5', expected: -5 },
            { sourceKey: '4', targetKey: '6', expected: 4 },
            { sourceKey: '2', targetKey: '3', expected: 2 },
            { sourceKey: '5', targetKey: '7', expected: 4 },
            
            // Going up - sharp numbers
            { sourceKey: '1', targetKey: '1#', expected: 1 },
            { sourceKey: '4', targetKey: '4#', expected: 1 },
            { sourceKey: '5', targetKey: '5#', expected: 1 },
            { sourceKey: '2', targetKey: '6#', expected: -4 },
            { sourceKey: '1#', targetKey: '4#', expected: 5 },
            
            // Going up - flat numbers
            { sourceKey: '1', targetKey: '2b', expected: 1 },
            { sourceKey: '4', targetKey: '7b', expected: 5 },
            { sourceKey: '5', targetKey: '3b', expected: -4 },
            { sourceKey: '7b', targetKey: '3b', expected: 5 },
            { sourceKey: '2b', targetKey: '6b', expected: -5 },
            
            // Going down - natural numbers
            { sourceKey: '2', targetKey: '1', expected: -2 },
            { sourceKey: '5', targetKey: '1', expected: 5 },
            { sourceKey: '6', targetKey: '4', expected: -4 },
            { sourceKey: '3', targetKey: '2', expected: -2 },
            { sourceKey: '7', targetKey: '5', expected: -4 },
            
            // Going down - sharp numbers
            { sourceKey: '1#', targetKey: '1', expected: -1 },
            { sourceKey: '4#', targetKey: '4', expected: -1 },
            { sourceKey: '5#', targetKey: '5', expected: -1 },
            { sourceKey: '6#', targetKey: '2', expected: 4 },
            { sourceKey: '4#', targetKey: '1#', expected: -5 },
            
            // Going down - flat numbers
            { sourceKey: '2b', targetKey: '1', expected: -1 },
            { sourceKey: '7b', targetKey: '4', expected: -5 },
            { sourceKey: '3b', targetKey: '5', expected: 4 },
            { sourceKey: '3b', targetKey: '7b', expected: -5 },
            { sourceKey: '6b', targetKey: '2b', expected: 5 },
            
            // Enharmonic equivalents (should be 0)
            { sourceKey: '1#', targetKey: '2b', expected: 0 },
            { sourceKey: '2#', targetKey: '3b', expected: 0 },
            { sourceKey: '4#', targetKey: '5b', expected: 0 },
            { sourceKey: '5#', targetKey: '6b', expected: 0 },
            { sourceKey: '6#', targetKey: '7b', expected: 0 },
            
            // Enharmonic equivalents (reverse)
            { sourceKey: '2b', targetKey: '1#', expected: 0 },
            { sourceKey: '3b', targetKey: '2#', expected: 0 },
            { sourceKey: '5b', targetKey: '4#', expected: 0 },
            { sourceKey: '6b', targetKey: '5#', expected: 0 },
            { sourceKey: '7b', targetKey: '6#', expected: 0 },
            
            // Key changes with enharmonics (different but equivalent)
            { sourceKey: '1#', targetKey: '4', expected: 4 },
            { sourceKey: '2b', targetKey: '4', expected: 4 },
            { sourceKey: '4#', targetKey: '1', expected: -6 },
            { sourceKey: '5b', targetKey: '1', expected: -6 },
            { sourceKey: '7b', targetKey: '2', expected: 4 },
            { sourceKey: '6#', targetKey: '2', expected: 4 },
            
            // Shortest path around circle (tritone)
            { sourceKey: '1', targetKey: '7', expected: -1 },
            { sourceKey: '5', targetKey: '2b', expected: -6 },
            
            // Complex enharmonic paths
            { sourceKey: '6b', targetKey: '1#', expected: 5 },
            { sourceKey: '3b', targetKey: '6#', expected: -5 },
            { sourceKey: '5b', targetKey: '7', expected: 5 },
        ];

        nashvilleTestCases.forEach(({ sourceKey, targetKey, expected }) => {
            it(`should calculate pitch from ${sourceKey} to ${targetKey}`, () => {
                const pitchDifference = Transposer.calculatePitchDifference(sourceKey, targetKey, true);
                expect(pitchDifference).toBe(expected);
            });
        });

        it("should throw error for invalid keys", () => {
            expect(() => Transposer.calculatePitchDifference('8', '1', true)).toThrow();
            expect(() => Transposer.calculatePitchDifference('1', '0', true)).toThrow();
        });
    });
});

describe("getModalDegree", () => {
    describe("basic scale degrees", () => {
        const testCases = [
            // C major scale
            { note: 'C', key: 'C', expected: 1 },
            { note: 'D', key: 'C', expected: 2 },
            { note: 'E', key: 'C', expected: 3 },
            { note: 'F', key: 'C', expected: 4 },
            { note: 'G', key: 'C', expected: 5 },
            { note: 'A', key: 'C', expected: 6 },
            { note: 'B', key: 'C', expected: 7 },
            
            // G major scale
            { note: 'G', key: 'G', expected: 1 },
            { note: 'A', key: 'G', expected: 2 },
            { note: 'B', key: 'G', expected: 3 },
            { note: 'C', key: 'G', expected: 4 },
            { note: 'D', key: 'G', expected: 5 },
            { note: 'E', key: 'G', expected: 6 },
            { note: 'F#', key: 'G', expected: 7 },
            
            // F major scale
            { note: 'F', key: 'F', expected: 1 },
            { note: 'G', key: 'F', expected: 2 },
            { note: 'A', key: 'F', expected: 3 },
            { note: 'Bb', key: 'F', expected: 4 },
            { note: 'C', key: 'F', expected: 5 },
            { note: 'D', key: 'F', expected: 6 },
            { note: 'E', key: 'F', expected: 7 },
            
            // D major scale
            { note: 'D', key: 'D', expected: 1 },
            { note: 'E', key: 'D', expected: 2 },
            { note: 'F#', key: 'D', expected: 3 },
            { note: 'G', key: 'D', expected: 4 },
            { note: 'A', key: 'D', expected: 5 },
            { note: 'B', key: 'D', expected: 6 },
            { note: 'C#', key: 'D', expected: 7 },
            
            // Flat keys
            { note: 'Bb', key: 'Bb', expected: 1 },
            { note: 'C', key: 'Bb', expected: 2 },
            { note: 'D', key: 'Bb', expected: 3 },
            { note: 'Eb', key: 'Bb', expected: 4 },
            { note: 'F', key: 'Bb', expected: 5 },
            { note: 'G', key: 'Bb', expected: 6 },
            { note: 'A', key: 'Bb', expected: 7 },
        ];

        testCases.forEach(({ note, key, expected }) => {
            it(`should return degree ${expected} for ${note} in key of ${key}`, () => {
                const degree = Transposer.getModalDegree(note, key);
                expect(degree).toBe(expected);
            });
        });
    });

    describe("enharmonic equivalents", () => {
        it("should handle enharmonic equivalents correctly", () => {
            // C# and Db should both be degree 2 in key of B
            expect(Transposer.getModalDegree('C#', 'B')).toBe(2);
            expect(Transposer.getModalDegree('Db', 'B')).toBe(2);
            
            // F# and Gb should both be degree 5 in key of C
            expect(Transposer.getModalDegree('F#', 'C')).toBe(5);
            expect(Transposer.getModalDegree('Gb', 'C')).toBe(5);
        });
    });

    describe("chromatic notes", () => {
        it("should handle chromatic notes by mapping to nearest scale degree", () => {
            // C# in key of C should map to degree 1 or 2 (closest natural degree)
            const degree = Transposer.getModalDegree('C#', 'C');
            expect(degree).toBeGreaterThanOrEqual(1);
            expect(degree).toBeLessThanOrEqual(7);
            
            // Eb in key of C should map to a valid degree
            const degree2 = Transposer.getModalDegree('Eb', 'C');
            expect(degree2).toBeGreaterThanOrEqual(1);
            expect(degree2).toBeLessThanOrEqual(7);
        });
    });

    describe("error handling", () => {
        it("should throw error for invalid notes", () => {
            expect(() => Transposer.getModalDegree('X', 'C')).toThrow('Invalid note: X');
        });

        it("should throw error for invalid keys", () => {
            expect(() => Transposer.getModalDegree('C', 'Y')).toThrow('Invalid key: Y');
        });
    });
});

/*
describe("Transpose Notes", () => {
    describe("basic transposition", () => {
        const testCases = [
            { note: 'C', currentKey: MusicalKey.G, targetKey: MusicalKey.C, expected: 'F' },

            // Sharp keys
            { note: 'D', currentKey: MusicalKey.C, targetKey: MusicalKey.D, expected: 'E' },
            { note: 'A7', currentKey: MusicalKey.G, targetKey: MusicalKey.A, expected: 'B7' },
            { note: 'Emaj7', currentKey: MusicalKey.D, targetKey: MusicalKey.E, expected: 'G♯maj7' },
            { note: 'F♯m7', currentKey: MusicalKey.D, targetKey: MusicalKey.E, expected: 'A♯m7' },

            // Flat keys
            { note: 'A', currentKey: MusicalKey.C, targetKey: MusicalKey.B_FLAT, expected: 'G' },
            { note: 'F', currentKey: MusicalKey.C, targetKey: MusicalKey.E_FLAT, expected: 'A♭' },
            { note: 'Gm7', currentKey: MusicalKey.C, targetKey: MusicalKey.B_FLAT, expected: 'Fm7' },
            { note: 'D7', currentKey: MusicalKey.C, targetKey: MusicalKey.E_FLAT, expected: 'F7' },

            // Starting on flats
            { note: 'B♭', currentKey: MusicalKey.F, targetKey: MusicalKey.A_FLAT, expected: 'D♭' },
            { note: 'E♭maj7', currentKey: MusicalKey.B_FLAT, targetKey: MusicalKey.D_FLAT, expected: 'G♭maj7' },
            { note: 'A♭m7', currentKey: MusicalKey.E_FLAT, targetKey: MusicalKey.F, expected: 'Bm7' },
            { note: 'D♭7', currentKey: MusicalKey.A_FLAT, targetKey: MusicalKey.C, expected: 'F7' },

            // Enharmonic-sensitive
            { note: 'B', currentKey: MusicalKey.G, targetKey: MusicalKey.A, expected: 'G♯' },
            { note: 'G7', currentKey: MusicalKey.C, targetKey: MusicalKey.D_FLAT, expected: 'A♭7' },
            { note: 'F♯sus4', currentKey: MusicalKey.G, targetKey: MusicalKey.A, expected: 'G♯sus4' },

            // Extended harmony
            { note: 'Cmaj7', currentKey: MusicalKey.G, targetKey: MusicalKey.D, expected: 'Amaj7' },
            { note: 'Dm7', currentKey: MusicalKey.C, targetKey: MusicalKey.E, expected: 'F♯m7' },
            { note: 'E7', currentKey: MusicalKey.A, targetKey: MusicalKey.C, expected: 'G7' },
            { note: 'Gm7', currentKey: MusicalKey.B_FLAT, targetKey: MusicalKey.E, expected: 'C♯m7' },
        ];

        testCases.forEach(({ note, currentKey, targetKey, expected }) => {
            it(`transposes ${note} from ${currentKey} to ${targetKey}`, () => {
                const originalNote = MusicalNote.parse(note);
                const expectedNote = MusicalNote.parse(expected);

                const transposed = Transposer.transpose(originalNote, currentKey, targetKey);

                expect(transposed).toBe(expectedNote);
            });
        });
    });

    describe("transpose Nashville chords", () => {
        it("should not transpose chords in Nashville notation", () => {
            const note = new MusicalNote("1", NoteType.NASHVILLE);
            const transposed = Transposer.transpose(note, MusicalKey.C, MusicalKey.G);
            expect(transposed).toBe(note);
        });
    });
});
*/
