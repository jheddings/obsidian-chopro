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
                ).toBe(expectedIndex);
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
                ).toBe(expected);
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
                expect(key.root).toBe(root);
                expect(key.quality).toBe(quality);
                expect(key.accidental).toBe(accidental);
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
                expect(MusicTheory.getInterval(from, to)).toBe(expected);
            }
        );
    });
});

describe('NoteTransposer', () => {
    describe('transposeNote', () => {
        const testCases = [
            { note: 'C', interval: 2, expected: 'D', postfix: undefined },
            { note: 'C', interval: 1, expected: 'C', postfix: '#' },
            { note: 'B', interval: 1, expected: 'C', postfix: undefined },
        ];

        test.each(testCases)(
            'should transpose $note by $interval semitones to $expected',
            ({ note, interval, expected, postfix }) => {
                const musicalNote = new MusicalNote(note);
                NoteTransposer.transposeNote(musicalNote, interval);
                expect(musicalNote.root).toBe(expected);
                expect(musicalNote.postfix).toBe(postfix);
            }
        );

        test('should respect enharmonic preferences', () => {
            const C1 = new MusicalNote('C');
            const C2 = new MusicalNote('C');
            NoteTransposer.transposeNote(C1, 1, Accidental.SHARP);
            NoteTransposer.transposeNote(C2, 1, Accidental.FLAT);
            
            expect(C1.toString()).toBe('C#');
            expect(C2.toString()).toBe('Db');
        });
    });

    describe('transposeChord', () => {
        test('should transpose basic chord', () => {
            const chord = new ChordNotation(new MusicalNote('C'));
            NoteTransposer.transposeChord(chord, 2);
            expect(chord.note.root).toBe('D');
            expect(chord.modifier).toBeUndefined();
        });

        test('should transpose chord with modifier', () => {
            const chord = new ChordNotation(new MusicalNote('C'), 'maj7');
            NoteTransposer.transposeChord(chord, 7);
            expect(chord.note.root).toBe('G');
            expect(chord.modifier).toBe('maj7');
        });

        test('should transpose chord with bass note', () => {
            const chord = new ChordNotation(
                new MusicalNote('C'), 
                undefined, 
                new MusicalNote('E')
            );
            NoteTransposer.transposeChord(chord, 2);
            expect(chord.note.root).toBe('D');
            expect(chord.bass?.root).toBe('F');
        });
    });
});

describe('NashvilleTransposer', () => {
    describe('nashvilleToChord', () => {
        test('should convert Nashville to chord in C major', () => {
            const nashvilleChord = new ChordNotation(new MusicalNote('1'));
            const key = MusicalKey.parse('C');
            NashvilleTransposer.nashvilleToChord(nashvilleChord, key);
            
            expect(nashvilleChord.note.root).toBe('C');
        });

        test('should convert Nashville to chord in G major', () => {
            const nashvilleChord = new ChordNotation(new MusicalNote('5'));
            const key = MusicalKey.parse('G');
            NashvilleTransposer.nashvilleToChord(nashvilleChord, key);
            
            expect(nashvilleChord.note.root).toBe('D');
        });

        test('should convert Nashville to chord in F major', () => {
            const nashvilleChord = new ChordNotation(new MusicalNote('4'));
            const key = MusicalKey.parse('F');
            NashvilleTransposer.nashvilleToChord(nashvilleChord, key);
            
            // Should be Bb in F major (4th degree)
            expect(nashvilleChord.note.root).toBe('B');
            expect(nashvilleChord.note.postfix).toBe('b');
        });

        test('should handle Nashville chord with modifier', () => {
            const nashvilleChord = new ChordNotation(new MusicalNote('2'), 'm7');
            const key = MusicalKey.parse('C');
            NashvilleTransposer.nashvilleToChord(nashvilleChord, key);
            
            expect(nashvilleChord.note.root).toBe('D');
            expect(nashvilleChord.modifier).toBe('m7');
        });

        test('should handle Nashville chord with bass note', () => {
            const nashvilleChord = new ChordNotation(
                new MusicalNote('1'), 
                undefined, 
                new MusicalNote('5')
            );
            const key = MusicalKey.parse('C');
            NashvilleTransposer.nashvilleToChord(nashvilleChord, key);
            
            expect(nashvilleChord.note.root).toBe('C');
            expect(nashvilleChord.bass?.root).toBe('G');
        });

        test('should throw on non-Nashville chord', () => {
            const alphaChord = new ChordNotation(new MusicalNote('C'));
            const key = MusicalKey.parse('C');
            
            expect(() => NashvilleTransposer.nashvilleToChord(alphaChord, key))
                .toThrow('Chord is not in Nashville notation');
        });
    });

    describe('chordToNashville', () => {
        test('should convert chord to Nashville in C major', () => {
            const chord = new ChordNotation(new MusicalNote('G'));
            const key = MusicalKey.parse('C');
            NashvilleTransposer.chordToNashville(chord, key);
            
            expect(chord.note.root).toBe('5');
        });

        test('should convert chord to Nashville in G major', () => {
            const chord = new ChordNotation(new MusicalNote('D'));
            const key = MusicalKey.parse('G');
            NashvilleTransposer.chordToNashville(chord, key);
            
            expect(chord.note.root).toBe('5');
        });

        test('should throw on non-alphabetic chord', () => {
            const nashvilleChord = new ChordNotation(new MusicalNote('1'));
            const key = MusicalKey.parse('C');
            
            expect(() => NashvilleTransposer.chordToNashville(nashvilleChord, key))
                .toThrow('Chord is not in alphabetic notation');
        });
    });
});

describe('ChoproTransposer', () => {
    describe('Basic transposition', () => {
        test('should transpose simple chord progression', async () => {
            const fs = require("fs");
            const path = require("path");
            const filePath = path.join(__dirname, "basic.md");
            const content = fs.readFileSync(filePath, "utf8");
            const song = ChoproFile.parse(content);
            const transposer = new ChoproTransposer({ fromKey: 'C', toKey: 'D' });
            const result = await transposer.transposeFileAsync(song);

            expect(result.success).toBe(true);
        });
    });
});

describe('TransposeUtils', () => {
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
                description: 'key from frontmatter',
                content: `---
key: Am
---

# Test Song`,
                expected: 'Am'
            },
            {
                description: 'major key from frontmatter',
                content: `---
key: F#
title: Test Song
---

# Test Song`,
                expected: 'F#'
            },
            {
                description: 'undefined when no key in frontmatter',
                content: `---
title: Test Song
---

# Test Song`,
                expected: undefined
            },
            {
                description: 'undefined when no frontmatter',
                content: `# Test Song

Just a simple song`,
                expected: undefined
            }
        ];

        test.each(detectKeyTestCases)(
            'should detect $expected for $description',
            ({ content, expected }) => {
                const file = ChoproFile.parse(content);
                const key = TransposeUtils.detectKey(file);
                expect(key).toBe(expected);
            }
        );
    });
});
