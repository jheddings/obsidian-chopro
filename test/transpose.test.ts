import { 
    ChordNotation, 
    MusicalNote, 
    Accidental,
    ChoproFile,
} from "../src/parser";

import {
    MusicTheory,
    NoteTransposer,
    NashvilleTransposer,
    ChoproTransposer,
    TransposeUtils,
    KeyQuality,
    MusicalKey,
} from "../src/transpose";

describe("MusicTheory", () => {
    describe("getNoteIndex", () => {
        const noteIndexTestCases = [
            { pitch: "C", accidental: undefined, expectedIndex: 0 },
            { pitch: "C", accidental: "#", expectedIndex: 1 },
            { pitch: "D", accidental: "b", expectedIndex: 1 },
            { pitch: "D", accidental: undefined, expectedIndex: 2 },
            { pitch: "F", accidental: "#", expectedIndex: 6 },
            { pitch: "G", accidental: "b", expectedIndex: 6 },
            { pitch: "B", accidental: undefined, expectedIndex: 11 },
        ];

        test.each(noteIndexTestCases)(
            "should return chromatic index $expectedIndex for $pitch$accidental",
            ({ pitch, accidental, expectedIndex }) => {
                expect(
                    MusicTheory.getNoteIndex(new MusicalNote(pitch, accidental))
                ).toEqual(expectedIndex);
            }
        );
    });

    describe("getPreferredNoteName", () => {
        const preferredNoteTestCases = [
            // Natural notes (single options)
            { index: 0, preference: undefined, expected: "C" },
            { index: 2, preference: undefined, expected: "D" },
            { index: 4, preference: undefined, expected: "E" },
            { index: 5, preference: undefined, expected: "F" },
            { index: 7, preference: undefined, expected: "G" },
            { index: 9, preference: undefined, expected: "A" },
            { index: 11, preference: undefined, expected: "B" },

            // Sharp preference
            { index: 1, preference: Accidental.SHARP, expected: "C#" },
            { index: 3, preference: Accidental.SHARP, expected: "D#" },
            { index: 6, preference: Accidental.SHARP, expected: "F#" },
            { index: 8, preference: Accidental.SHARP, expected: "G#" },
            { index: 10, preference: Accidental.SHARP, expected: "A#" },

            // Flat preference
            { index: 1, preference: Accidental.FLAT, expected: "Db" },
            { index: 3, preference: Accidental.FLAT, expected: "Eb" },
            { index: 6, preference: Accidental.FLAT, expected: "Gb" },
            { index: 8, preference: Accidental.FLAT, expected: "Ab" },
            { index: 10, preference: Accidental.FLAT, expected: "Bb" },
        ];

        test.each(preferredNoteTestCases)(
            "should return $expected for index $index with preference $preference",
            ({ index, preference, expected }) => {
                expect(
                    MusicTheory.getPreferredNoteName(index, preference)
                ).toEqual(expected);
            }
        );
    });
});

describe('MusicalKey', () => {
    describe('parse', () => {
        const validKeyTestCases = [
            // Major keys
            { input: 'C', root: 'C', quality: KeyQuality.MAJOR, accidental: Accidental.NATURAL },
            { input: 'G', root: 'G', quality: KeyQuality.MAJOR, accidental: Accidental.NATURAL },
            { input: 'F#', root: 'F#', quality: KeyQuality.MAJOR, accidental: Accidental.SHARP },
            { input: 'Bb', root: 'Bb', quality: KeyQuality.MAJOR, accidental: Accidental.FLAT },
            { input: 'Db', root: 'Db', quality: KeyQuality.MAJOR, accidental: Accidental.FLAT },
            { input: 'C#', root: 'C#', quality: KeyQuality.MAJOR, accidental: Accidental.SHARP },
            
            // Minor keys
            { input: 'Am', root: 'A', quality: KeyQuality.MINOR, accidental: Accidental.NATURAL },
            { input: 'Em', root: 'E', quality: KeyQuality.MINOR, accidental: Accidental.NATURAL },
            { input: 'F#m', root: 'F#', quality: KeyQuality.MINOR, accidental: Accidental.SHARP },
            { input: 'Bbm', root: 'Bb', quality: KeyQuality.MINOR, accidental: Accidental.FLAT },
            { input: 'C#m', root: 'C#', quality: KeyQuality.MINOR, accidental: Accidental.SHARP },
            { input: 'Ebm', root: 'Eb', quality: KeyQuality.MINOR, accidental: Accidental.FLAT },
        ];

        test.each(validKeyTestCases)(
            'should parse $input correctly',
            ({ input, root, quality, accidental }) => {
                const key = MusicalKey.parse(input);
                expect(key.root).toEqual(root);
                expect(key.quality).toEqual(quality);
                expect(key.accidental).toEqual(accidental);
            }
        );

        const invalidKeyTestCases = [
            'H',
            'C#b',
            '',
            'CM',
            'Am#',
            'X',
            '1',
        ];

        test.each(invalidKeyTestCases)(
            'should throw on invalid key %s',
            (invalidKey) => {
                expect(() => MusicalKey.parse(invalidKey)).toThrow('Invalid key format');
            }
        );
    });

    describe('getInterval', () => {
        const intervalTestCases = [
            { from: new MusicalNote('C'), to: new MusicalNote('C'), expected: 0 },
            { from: new MusicalNote('C'), to: new MusicalNote('D'), expected: 2 },
            { from: new MusicalNote('C'), to: new MusicalNote('G'), expected: 7 },
            { from: new MusicalNote('C'), to: new MusicalNote('C', '#'), expected: 1 },
            { from: new MusicalNote('D'), to: new MusicalNote('C'), expected: 10 },
            { from: new MusicalNote('G'), to: new MusicalNote('F'), expected: 10 },
            { from: new MusicalNote('A'), to: new MusicalNote('A'), expected: 0 },
            { from: new MusicalNote('F', '#'), to: new MusicalNote('G', 'b'), expected: 0 },
        ];

        test.each(intervalTestCases)(
            'should calculate interval from $from.root$from.postfix to $to.root$to.postfix as $expected',
            ({ from, to, expected }) => {
                expect(MusicTheory.getInterval(from, to)).toEqual(expected);
            }
        );
    });
});

describe('NoteTransposer', () => {
    describe('transposeNote', () => {
        const testCases = [
            { input: 'C', interval: 2, expected: 'D' },
            { input: 'C', interval: 1, expected: 'C#' },
            { input: 'B', interval: 1, expected: 'C' },
        ];

        test.each(testCases)(
            'should transpose $input by $interval semitones to $expected',
            ({ input, interval, expected }) => {
                const inputNote = MusicalNote.parse(input);
                const expectedNote = MusicalNote.parse(expected);
                
                NoteTransposer.transposeNote(inputNote, interval);
                
                expect(inputNote.root).toEqual(expectedNote.root);
                expect(inputNote.postfix).toEqual(expectedNote.postfix);
            }
        );

        test('should respect enharmonic preferences', () => {
            const C1 = new MusicalNote('C');
            const C2 = new MusicalNote('C');
            NoteTransposer.transposeNote(C1, 1, Accidental.SHARP);
            NoteTransposer.transposeNote(C2, 1, Accidental.FLAT);
            
            expect(C1.toString()).toEqual('C#');
            expect(C2.toString()).toEqual('Db');
        });
    });

    describe('transposeChord', () => {
        const testCases = [
            // Basic chord
            { input: '[C]', interval: 2, expected: '[D]' },
            
            // Chord with modifier
            { input: '[Cmaj7]', interval: 7, expected: '[Gmaj7]' },
            
            // Chord with bass note
            { input: '[C/E]', interval: 2, expected: '[D/F#]' },
        ];

        test.each(testCases)(
            'should transpose $input by $interval semitones to $expected',
            ({ input, interval, expected }) => {
                const inputChord = ChordNotation.parse(input);
                const expectedChord = ChordNotation.parse(expected);
                
                NoteTransposer.transposeChord(inputChord, interval);
                
                expect(inputChord.note).toEqual(expectedChord.note);
                expect(inputChord.modifier).toEqual(expectedChord.modifier);
                expect(inputChord.bass).toEqual(expectedChord.bass);
            }
        );
    });
});

describe('NashvilleTransposer', () => {
    describe('nashvilleToChord', () => {
        const testCases = [
            // Basic conversions
            { input: '[1]', key: 'C', expected: '[C]' },
            { input: '[5]', key: 'G', expected: '[D]' },
            { input: '[4]', key: 'F', expected: '[Bb]' },
            { input: '[2]', key: 'D', expected: '[E]' },
            { input: '[3]', key: 'A', expected: '[C#]' },
            { input: '[6]', key: 'Bb', expected: '[G]' },
            { input: '[7]', key: 'E', expected: '[D#]' },

            // Chord with modifier
            { input: '[2m7]', key: 'C', expected: '[Dm7]' },

            // Chord with bass note
            { input: '[1/3]', key: 'Bb', expected: '[Bb/D]' },
            { input: '[6m/5]', key: 'C', expected: '[Am/G]' },
        ];

        test.each(testCases)(
            'should convert Nashville $input in key $key to $expected',
            ({ input, key, expected }) => {
                const nashvilleChord = ChordNotation.parse(input);
                const expectedChord = ChordNotation.parse(expected);
                const musicalKey = MusicalKey.parse(key);
                
                NashvilleTransposer.nashvilleToChord(nashvilleChord, musicalKey);
                
                expect(nashvilleChord.note).toEqual(expectedChord.note);
                expect(nashvilleChord.modifier).toEqual(expectedChord.modifier);
                expect(nashvilleChord.bass).toEqual(expectedChord.bass);
            }
        );

        test('should throw on non-Nashville chord', () => {
            const alphaChord = new ChordNotation(new MusicalNote('C'));
            const key = MusicalKey.parse('C');
            
            expect(() => NashvilleTransposer.nashvilleToChord(alphaChord, key))
                .toThrow('Chord is not in Nashville notation');
        });
    });

    describe('chordToNashville', () => {
        const testCases = [
            // Basic conversions
            { input: '[C]', key: 'C', expected: '[1]' },
            { input: '[D]', key: 'G', expected: '[5]' },
            { input: '[Bb]', key: 'F', expected: '[4]' },
            { input: '[E]', key: 'D', expected: '[2]' },
            { input: '[C#]', key: 'A', expected: '[3]' },
            { input: '[G]', key: 'Bb', expected: '[6]' },
            { input: '[D#]', key: 'E', expected: '[7]' },

            // Chord with modifier
            { input: '[Dm7]', key: 'C', expected: '[2m7]' },

            // Chord with bass note
            { input: '[C/E]', key: 'C', expected: '[1/3]' },
            { input: '[G/B]', key: 'C', expected: '[5/7]' },
        ];

        test.each(testCases)(
            'should convert chord $input in key $key to Nashville $expected',
            ({ input, key, expected }) => {
                const alphaChord = ChordNotation.parse(input);
                const expectedChord = ChordNotation.parse(expected);
                const musicalKey = MusicalKey.parse(key);
                
                NashvilleTransposer.chordToNashville(alphaChord, musicalKey);
                
                expect(alphaChord.note).toEqual(expectedChord.note);
                expect(alphaChord.modifier).toEqual(expectedChord.modifier);
                expect(alphaChord.bass).toEqual(expectedChord.bass);
            }
        );

        test('should throw on non-alphabetic chord', () => {
            const nashvilleChord = new ChordNotation(new MusicalNote('1'));
            const key = MusicalKey.parse('C');
            
            expect(() => NashvilleTransposer.chordToNashville(nashvilleChord, key))
                .toThrow('Chord is not in alphabetic notation');
        });
    });
});

describe('TransposeUtils', () => {
    const path = require('path');

    describe('getAllKeys', () => {
        test('should return all major and minor keys', () => {
            const keys = TransposeUtils.getAllKeys();
            
            const expectedKeys = ['C', 'Am', 'F#', 'C#m', 'Bb', 'Ebm'];
            expectedKeys.forEach(key => {
                expect(keys).toContain(key);
            });
            expect(keys.length).toBeGreaterThan(20);
        });
    });

    describe('isValidKey', () => {
        const validKeyTestCases = [
            { key: 'C', description: 'major key without accidental' },
            { key: 'Am', description: 'minor key without accidental' },
            { key: 'F#', description: 'major key with sharp' },
            { key: 'Bbm', description: 'minor key with flat' },
            { key: 'C#', description: 'major key with sharp' },
            { key: 'Eb', description: 'major key with flat' },
            { key: 'G#m', description: 'minor key with sharp' },
            { key: 'Abm', description: 'minor key with flat' },
        ];

        test.each(validKeyTestCases)(
            'should validate $key as valid ($description)',
            ({ key }) => {
                expect(TransposeUtils.isValidKey(key)).toBe(true);
            }
        );

        const invalidKeyTestCases = [
            { key: 'H', description: 'invalid note name' },
            { key: 'C#b', description: 'double accidental' },
            { key: '', description: 'empty string' },
            { key: 'CM', description: 'uppercase minor indicator' },
            { key: 'Am#', description: 'accidental after minor indicator' },
            { key: 'X', description: 'non-musical letter' },
            { key: '1', description: 'numeric character' },
        ];

        test.each(invalidKeyTestCases)(
            'should reject $key as invalid ($description)',
            ({ key }) => {
                expect(TransposeUtils.isValidKey(key)).toBe(false);
            }
        );
    });

    describe('detectKey', () => {
        const detectKeyTestCases = [
            {
                filename: "standard.md",
                expected: MusicalKey.parse('C')
            },
            {
                filename: "minimal.md",
                expected: undefined
            },
            {
                filename: "nashville.md",
                expected: undefined
            }
        ];

        test.each(detectKeyTestCases)(
            'should detect $expected for $filename',
            ({ filename, expected }) => {
                const filePath = path.resolve(__dirname, filename);
                const file = ChoproFile.load(filePath);
                const key = TransposeUtils.detectKey(file);
                
                expect(key).toEqual(expected);
            }
        );
    });
});
