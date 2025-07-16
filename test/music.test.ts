import {
    AbstractNote,
    MusicNote,
    NashvilleNumber,
    Accidental,
    MusicTheory,
    KeyInfo,
    MajorKeyInfo,
    MinorKeyInfo,
} from "../src/music";

describe("AbstractNote", () => {
    describe("handles music notes correctly", () => {
        const musicNoteCases = ["C", "G", "F#", "Bb", "G♯", "A♭", "Gis", "Fes"];

        test.each(musicNoteCases)("parses %s correctly", (input) => {
            const note = AbstractNote.parse(input);
            expect(note).toBeInstanceOf(MusicNote);
            expect(note.toString()).toEqual(input);
        });
    });

    describe("handles Nashville numbers correctly", () => {
        const nashvilleNumberCases = ["1", "b4", "#2", "♯7", "♭3"];

        test.each(nashvilleNumberCases)("parses %s correctly", (input) => {
            const note = AbstractNote.parse(input);
            expect(note).toBeInstanceOf(NashvilleNumber);
            expect(note.toString()).toEqual(input);
        });
    });

    describe("normalization", () => {
        const normalizationCases = [
            // Basic notes (no change)
            { input: "C", normalized: "C" },
            { input: "G", normalized: "G" },

            // ASCII accidentals to Unicode
            { input: "F#", normalized: "F♯" },
            { input: "Bb", normalized: "B♭" },
            { input: "#2", normalized: "♯2" },
            { input: "b4", normalized: "♭4" },

            // Unicode accidentals
            { input: "B♮", normalized: "B" },
            { input: "A♭", normalized: "A♭" },
            { input: "F♯", normalized: "F♯" },

            // German notation to Unicode
            { input: "Gis", normalized: "G♯" },
            { input: "Fes", normalized: "F♭" },
        ];

        test.each(normalizationCases)("normalizes $input correctly", ({ input, normalized }) => {
            const note = AbstractNote.parse(input);
            expect(note.toString()).toEqual(input);
            expect(note.toString(false)).toEqual(input);
            expect(note.toString(true)).toEqual(normalized);
        });
    });

    describe("error handling", () => {
        const invalidNotes = ["H", "8", "0", "", "invalid", "I", "iv", "&", "#"];

        test.each(invalidNotes)("rejects invalid note %s", (note) => {
            expect(() => AbstractNote.parse(note)).toThrow();
        });
    });
});

describe("MusicNote", () => {
    const musicNoteCases = [
        { input: "C", root: "C", postfix: undefined, accidental: Accidental.NATURAL },
        { input: "F#", root: "F", postfix: "#", accidental: Accidental.SHARP },
        { input: "Bb", root: "B", postfix: "b", accidental: Accidental.FLAT },
        { input: "G♯", root: "G", postfix: "♯", accidental: Accidental.SHARP },
        { input: "A♭", root: "A", postfix: "♭", accidental: Accidental.FLAT },
        { input: "Gis", root: "G", postfix: "is", accidental: Accidental.SHARP },
        { input: "Fes", root: "F", postfix: "es", accidental: Accidental.FLAT },
        { input: "F♯", root: "F", postfix: "♯", accidental: Accidental.SHARP },
        { input: "B♭", root: "B", postfix: "♭", accidental: Accidental.FLAT },
    ];

    describe("parsing", () => {
        test.each(musicNoteCases)(
            "parses music note $input correctly",
            ({ input, root, postfix, accidental }) => {
                const note = MusicNote.parse(input);

                expect(note.root).toEqual(root);
                expect(note.postfix).toEqual(postfix);
                expect(note.accidental).toEqual(accidental);

                // round-trip test
                expect(note.toString()).toEqual(input);
            }
        );
    });

    describe("validation", () => {
        test.each(musicNoteCases)("accepts valid music note %s", ({ input }) => {
            expect(MusicNote.test(input)).toBe(true);
        });
    });

    describe("error handling", () => {
        const invalidMusicNotes = [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "1m",
            "b4",
            "#2",
            "♯7",
            "♭3",
            "[G]",
            "[Am]",
            "C♪",
            "Do",
        ];

        test.each(invalidMusicNotes)("rejects invalid note %s", (note) => {
            expect(MusicNote.test(note)).toBe(false);
            expect(() => MusicNote.parse(note)).toThrow();
        });
    });
});

describe("NashvilleNumber", () => {
    const nashvilleNumberCases = [
        { input: "1", root: "1", postfix: undefined, accidental: Accidental.NATURAL },
        { input: "2", root: "2", postfix: undefined, accidental: Accidental.NATURAL },
        { input: "3", root: "3", postfix: undefined, accidental: Accidental.NATURAL },
        { input: "4", root: "4", postfix: undefined, accidental: Accidental.NATURAL },
        { input: "5", root: "5", postfix: undefined, accidental: Accidental.NATURAL },
        { input: "6", root: "6", postfix: undefined, accidental: Accidental.NATURAL },
        { input: "7", root: "7", postfix: undefined, accidental: Accidental.NATURAL },
        { input: "b4", root: "4", postfix: "b", accidental: Accidental.FLAT },
        { input: "#2", root: "2", postfix: "#", accidental: Accidental.SHARP },
        { input: "♯7", root: "7", postfix: "♯", accidental: Accidental.SHARP },
        { input: "♭3", root: "3", postfix: "♭", accidental: Accidental.FLAT },
        { input: "♯3", root: "3", postfix: "♯", accidental: Accidental.SHARP },
    ];

    describe("parsing", () => {
        test.each(nashvilleNumberCases)(
            "parses Nashville number $input correctly",
            ({ input, root, postfix, accidental }) => {
                const note = NashvilleNumber.parse(input);

                expect(note.root).toEqual(root);
                expect(note.postfix).toEqual(postfix);
                expect(note.accidental).toEqual(accidental);

                // round-trip test
                expect(note.toString()).toEqual(input);
            }
        );
    });

    describe("validation", () => {
        test.each(nashvilleNumberCases)("accepts valid Nashville number %s", ({ input }) => {
            expect(NashvilleNumber.test(input)).toBe(true);
        });
    });

    describe("error handling", () => {
        const invalidNashvilleNumbers = [
            "7b",
            "4#",
            "C",
            "D",
            "F#",
            "Bb",
            "G♯",
            "A♭",
            "Gis",
            "Fes",
            "As",
            "8",
            "0",
            "[1]",
        ];

        test.each(invalidNashvilleNumbers)("rejects invalid number %s", (note) => {
            expect(NashvilleNumber.test(note)).toBe(false);
            expect(() => NashvilleNumber.parse(note)).toThrow();
        });
    });
});

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
                expect(MusicTheory.getPreferredNoteName(index, preference)).toEqual(expected);
            }
        );
    });
});

describe("KeyInfo", () => {
    describe("parse major keys", () => {
        const majorKeyTestCases = [
            { input: "C", root: "C", accidental: Accidental.NATURAL, minor: "Am" },
            { input: "G", root: "G", accidental: Accidental.NATURAL, minor: "Em" },
            { input: "F#", root: "F#", accidental: Accidental.SHARP, minor: "D#m" },
            { input: "Bb", root: "Bb", accidental: Accidental.FLAT, minor: "Gm" },
            { input: "Db", root: "Db", accidental: Accidental.FLAT, minor: "Bbm" },
            { input: "C#", root: "C#", accidental: Accidental.SHARP, minor: "A#m" },
        ];

        test.each(majorKeyTestCases)(
            "should parse $input correctly",
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

    describe("parse minor keys", () => {
        const minorKeyTestCases = [
            { input: "Am", root: "A", accidental: Accidental.NATURAL, major: "C" },
            { input: "Em", root: "E", accidental: Accidental.NATURAL, major: "G" },
            { input: "F#m", root: "F#", accidental: Accidental.SHARP, major: "A" },
            { input: "Bbm", root: "Bb", accidental: Accidental.FLAT, major: "Db" },
            { input: "C#m", root: "C#", accidental: Accidental.SHARP, major: "E" },
            { input: "Ebm", root: "Eb", accidental: Accidental.FLAT, major: "Gb" },
        ];

        test.each(minorKeyTestCases)(
            "should parse $input correctly",
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

        const invalidKeyTestCases = ["H", "C#b", "", "CM", "Am#", "X", "1"];

        test.each(invalidKeyTestCases)("should throw on invalid key %s", (invalidKey) => {
            expect(() => KeyInfo.parse(invalidKey)).toThrow();
        });
    });

    describe("getInterval", () => {
        const intervalTestCases = [
            { from: new MusicNote("C"), to: new MusicNote("C"), expected: 0 },
            { from: new MusicNote("C"), to: new MusicNote("D"), expected: 2 },
            { from: new MusicNote("C"), to: new MusicNote("G"), expected: 7 },
            { from: new MusicNote("C"), to: new MusicNote("C", "#"), expected: 1 },
            { from: new MusicNote("D"), to: new MusicNote("C"), expected: 10 },
            { from: new MusicNote("G"), to: new MusicNote("F"), expected: 10 },
            { from: new MusicNote("A"), to: new MusicNote("A"), expected: 0 },
            { from: new MusicNote("F", "#"), to: new MusicNote("G", "b"), expected: 0 },
        ];

        test.each(intervalTestCases)(
            "should calculate interval from $from.root$from.postfix to $to.root$to.postfix as $expected",
            ({ from, to, expected }) => {
                expect(MusicTheory.getInterval(from, to)).toEqual(expected);
            }
        );
    });
});
