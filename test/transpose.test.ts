import { 
    ChordNotation, 
    ChoproFile,
    ChoproBlock,
} from "../src/parser";

import {
    AbstractNote, 
    Accidental,
    MusicNote,
    NashvilleNumber,
    MusicTheory,
    KeyInfo,
    MajorKeyInfo,
    MinorKeyInfo,
} from "../src/music";

import {
    NoteTransposer,
    NashvilleTransposer,
    ChoproTransposer,
    TransposeUtils,
} from "../src/transpose";

import { verifyChordsInBlock } from "./parser.test";

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
                const note = new MusicNote(pitch, accidental);
                const noteIndex = MusicTheory.getNoteIndex(note);
                expect(noteIndex).toEqual(expectedIndex);
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

describe('KeyInfo', () => {
    describe('parse major keys', () => {
        const majorKeyTestCases = [
            { input: 'C', root: 'C', accidental: Accidental.NATURAL, minor: 'Am' },
            { input: 'G', root: 'G', accidental: Accidental.NATURAL, minor: 'Em' },
            { input: 'F#', root: 'F#', accidental: Accidental.SHARP, minor: 'D#m' },
            { input: 'Bb', root: 'Bb', accidental: Accidental.FLAT, minor: 'Gm' },
            { input: 'Db', root: 'Db', accidental: Accidental.FLAT, minor: 'Bbm' },
            { input: 'C#', root: 'C#', accidental: Accidental.SHARP, minor: 'A#m' },
        ];

        test.each(majorKeyTestCases)(
            'should parse $input correctly',
            ({ input, root, accidental, minor }) => {
                const key = MajorKeyInfo.parse(input);

                expect(key).toBeInstanceOf(MajorKeyInfo);
                expect(key.toString()).toEqual(input);

                expect(key.root.toString()).toEqual(root);
                expect(key.accidental).toEqual(accidental);

                // verify major key info properties
                expect(key.getScaleDegrees()).toEqual([0, 2, 4, 5, 7, 9, 11]);

                // verify relative minor key
                const expectedMinor = KeyInfo.parse(minor) as MinorKeyInfo;
                const relativeMinor = key.getRelativeMinor();
                expect(relativeMinor).toEqual(expectedMinor);
            }
        );

    });

    describe('parse minor keys', () => {
        const minorKeyTestCases = [
            { input: 'Am', root: 'A', accidental: Accidental.NATURAL, major: 'C' },
            { input: 'Em', root: 'E', accidental: Accidental.NATURAL, major: 'G' },
            { input: 'F#m', root: 'F#', accidental: Accidental.SHARP, major: 'A' },
            { input: 'Bbm', root: 'Bb', accidental: Accidental.FLAT, major: 'Db' },
            { input: 'C#m', root: 'C#', accidental: Accidental.SHARP, major: 'E' },
            { input: 'Ebm', root: 'Eb', accidental: Accidental.FLAT, major: 'Gb' },
        ];

        test.each(minorKeyTestCases)(
            'should parse $input correctly',
            ({ input, root, accidental, major }) => {
                const key = MinorKeyInfo.parse(input);

                expect(key).toBeInstanceOf(MinorKeyInfo);
                expect(key.toString()).toEqual(input);

                expect(key.root.toString()).toEqual(root);
                expect(key.accidental).toEqual(accidental);

                // verify minor key info properties
                expect(key.getScaleDegrees()).toEqual([0, 2, 3, 5, 7, 8, 10]);

                // verify relative major key
                const expectedMajor = KeyInfo.parse(major) as MajorKeyInfo;
                const relativeMajor = key.getRelativeMajor();
                expect(relativeMajor).toEqual(expectedMajor);
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
                expect(() => KeyInfo.parse(invalidKey)).toThrow();
            }
        );
    });

    describe('getInterval', () => {
        const intervalTestCases = [
            { from: new MusicNote('C'), to: new MusicNote('C'), expected: 0 },
            { from: new MusicNote('C'), to: new MusicNote('D'), expected: 2 },
            { from: new MusicNote('C'), to: new MusicNote('G'), expected: 7 },
            { from: new MusicNote('C'), to: new MusicNote('C', '#'), expected: 1 },
            { from: new MusicNote('D'), to: new MusicNote('C'), expected: 10 },
            { from: new MusicNote('G'), to: new MusicNote('F'), expected: 10 },
            { from: new MusicNote('A'), to: new MusicNote('A'), expected: 0 },
            { from: new MusicNote('F', '#'), to: new MusicNote('G', 'b'), expected: 0 },
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
                const inputNote = AbstractNote.parse(input);
                const expectedNote = AbstractNote.parse(expected);
                
                NoteTransposer.transposeNote(inputNote, interval);
                
                expect(inputNote.root).toEqual(expectedNote.root);
                expect(inputNote.postfix).toEqual(expectedNote.postfix);
            }
        );

        test('should respect enharmonic preferences', () => {
            const C1 = new MusicNote('C');
            const C2 = new MusicNote('C');
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
                const musicalKey = KeyInfo.parse(key);
                
                NashvilleTransposer.nashvilleToChord(nashvilleChord, musicalKey);
                
                expect(nashvilleChord.note).toEqual(expectedChord.note);
                expect(nashvilleChord.modifier).toEqual(expectedChord.modifier);
                expect(nashvilleChord.bass).toEqual(expectedChord.bass);
            }
        );

        test('should throw on non-Nashville chord', () => {
            const alphaNote = new MusicNote('C');
            const alphaChord = new ChordNotation(alphaNote);
            const key = KeyInfo.parse('C');
            
            expect(() => NashvilleTransposer.nashvilleToChord(alphaChord, key)).toThrow();
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
                const musicalKey = KeyInfo.parse(key);
                
                NashvilleTransposer.chordToNashville(alphaChord, musicalKey);
                
                expect(alphaChord.note).toEqual(expectedChord.note);
                expect(alphaChord.modifier).toEqual(expectedChord.modifier);
                expect(alphaChord.bass).toEqual(expectedChord.bass);
            }
        );

        test('should throw on non-alphabetic chord', () => {
            const nashvilleNum = new NashvilleNumber('1');
            const nashvilleChord = new ChordNotation(nashvilleNum);
            const key = KeyInfo.parse('C');
            
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
                expected: KeyInfo.parse('C')
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

describe('ChoproTransposer', () => {
    const path = require('path');

   /**
     * Helper function to load a test file & parse it.
     */
    const loadTestFile = (filename: string): ChoproFile => {
        const filePath = path.resolve(__dirname, filename);
        return ChoproFile.load(filePath);
    }

    describe('transpose standard.md', () => {
        describe('should transpose standard.md from C to G', () => {
            let file: ChoproFile;

            beforeAll(() => {
                file = loadTestFile("standard.md");
                expect(file.key).toBe('C');

                const transposer = new ChoproTransposer({
                    fromKey: 'C',
                    toKey: 'G'
                });

                transposer.transpose(file);
                expect(file.key).toBe('G');
            });

            it("transposes verse 1 correctly", () => {
                expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
                verifyChordsInBlock(file.blocks[1] as ChoproBlock, [
                    [ "[G]", "[C]", "[G]", "[Em]", "[G]", "[D]" ],
                    [ "[G]", "[C]", "[G]", "[Em]", "[D]", "[C]", "[G]" ],
                ]);
            });

            it("transposes verse 4 correctly", () => {
                expect(file.blocks[7]).toBeInstanceOf(ChoproBlock);
                verifyChordsInBlock(file.blocks[7] as ChoproBlock, [
                    [ "[A]", "[D]", "[A]", "[F#m]", "[A]", "[E]" ],
                    [ "[A]", "[D]", "[A]", "[F#m]", "[E]", "[D]", "[A]" ],
                ]);
            });
        });

        describe('should transpose standard.md from C to Bb (flat key)', () => {
            let file: ChoproFile;

            beforeAll(() => {
                file = loadTestFile("standard.md");
                expect(file.key).toBe('C');

                const transposer = new ChoproTransposer({
                    fromKey: 'C',
                    toKey: 'Bb'
                });

                transposer.transpose(file);
                expect(file.key).toBe('Bb');
            });

            it("transposes verse 1 correctly", () => {
                expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
                verifyChordsInBlock(file.blocks[1] as ChoproBlock, [
                    [ "[Bb]", "[Eb]", "[Bb]", "[Gm]", "[Bb]", "[F]" ],
                    [ "[Bb]", "[Eb]", "[Bb]", "[Gm]", "[F]", "[Eb]", "[Bb]" ],
                ]);
            });
        });

        describe('should transpose standard.md from C to F# (sharp key)', () => {
            let file: ChoproFile;

            beforeAll(() => {
                file = loadTestFile("standard.md");
                expect(file.key).toBe('C');

                const transposer = new ChoproTransposer({
                    fromKey: 'C',
                    toKey: 'F#'
                });

                transposer.transpose(file);
                expect(file.key).toBe('F#');
            });

            it("transposes verse 1 correctly", () => {
                expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
                verifyChordsInBlock(file.blocks[1] as ChoproBlock, [
                    [ "[F#]", "[B]", "[F#]", "[D#m]", "[F#]", "[C#]" ],
                    [ "[F#]", "[B]", "[F#]", "[D#m]", "[C#]", "[B]", "[F#]" ],
                ]);
            });
        });

        /*
        describe('should transpose standard.md from C to Nashville notation', () => {
            let file: ChoproFile;

            beforeAll(() => {
                file = loadTestFile("standard.md");
                expect(file.key).toBe('C');

                const transposer = new ChoproTransposer({
                    fromKey: 'C',
                    toKey: '##'
                });

                transposer.transpose(file);
                expect(file.key).toBe('nashville');
            });

            it("transposes verse 1 correctly", () => {
                expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
                verifyChordsInBlock(file.blocks[1] as ChoproBlock, [
                    [ "[1]", "[4]", "[1]", "[6m]", "[1]", "[5]" ],
                    [ "[1]", "[4]", "[1]", "[6m]", "[5]", "[4]", "[1]" ],
                ]);
            });

            it("transposes verse 4 correctly", () => {
                expect(file.blocks[7]).toBeInstanceOf(ChoproBlock);
                verifyChordsInBlock(file.blocks[7] as ChoproBlock, [
                    [ "[2]", "[5]", "[2]", "[7m]", "[2]", "[6]" ],
                    [ "[2]", "[5]", "[2]", "[7m]", "[6]", "[5]", "[2]" ],
                ]);
            });
        });
        */
    });

    describe('validation', () => {
        const validKeyTestCases = [
            { fromKey: 'C', toKey: 'G' },
            { fromKey: 'F#m', toKey: 'Bbm' },
        ];

        test.each(validKeyTestCases)(
            'should accept valid keys: fromKey=$fromKey, toKey=$toKey',
            ({ fromKey, toKey }) => {
                expect(() => new ChoproTransposer({ fromKey, toKey })).not.toThrow();
            }
        );

        const invalidKeyTestCases = [
            { fromKey: 'InvalidKey', toKey: 'G', },
            { fromKey: 'C', toKey: 'InvalidKey', }
        ];

        test.each(invalidKeyTestCases)(
            'should error for invalid keys: fromKey=$fromKey, toKey=$toKey',
            ({ fromKey, toKey }) => {
                expect(() => new ChoproTransposer({ fromKey, toKey })).toThrow();
            }
        );
    });
});
