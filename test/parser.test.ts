import {
    ChordNotation,
    MusicalNote,
    NoteType,
    Annotation,
    TextSegment,
    ChoproFile,
    CommentLine,
    EmptyLine,
    TextLine,
    Accidental,
    ChoproBlock,
    MarkdownBlock,
    SegmentedLine,
} from "../src/parser";

describe("MusicalNote", () => {
    const testCases = [
        // Basic alpha notes
        { input: "C", root: "C", postfix: undefined, accidental: Accidental.NATURAL, noteType: NoteType.ALPHA },
        { input: "G", root: "G", postfix: undefined, accidental: Accidental.NATURAL, noteType: NoteType.ALPHA },
        { input: "F#", root: "F", postfix: "#", accidental: Accidental.SHARP, noteType: NoteType.ALPHA },
        { input: "Bb", root: "B", postfix: "b", accidental: Accidental.FLAT, noteType: NoteType.ALPHA },
        
        // German notation
        { input: "Gis", root: "G", postfix: "is", accidental: Accidental.SHARP, noteType: NoteType.ALPHA },
        { input: "Fes", root: "F", postfix: "es", accidental: Accidental.FLAT, noteType: NoteType.ALPHA },
        { input: "As", root: "A", postfix: "s", accidental: Accidental.FLAT, noteType: NoteType.ALPHA },
        
        // Nashville notation
        { input: "1", root: "1", postfix: undefined, accidental: Accidental.NATURAL, noteType: NoteType.NASHVILLE },
        { input: "4b", root: "4", postfix: "b", accidental: Accidental.FLAT, noteType: NoteType.NASHVILLE },
        { input: "2#", root: "2", postfix: "#", accidental: Accidental.SHARP, noteType: NoteType.NASHVILLE },
        
        // Unicode accidentals
        { input: "F♯", root: "F", postfix: "♯", accidental: Accidental.SHARP, noteType: NoteType.ALPHA },
        { input: "B♭", root: "B", postfix: "♭", accidental: Accidental.FLAT, noteType: NoteType.ALPHA },
        { input: "3♯", root: "3", postfix: "♯", accidental: Accidental.SHARP, noteType: NoteType.NASHVILLE },
    ];

    describe("parsing", () => {
        test.each(testCases)(
            "parses $input correctly",
            ({ input, root, postfix, accidental, noteType }) => {
                const note = MusicalNote.parse(input);
                
                expect(note.root).toEqual(root);
                expect(note.postfix).toEqual(postfix);
                expect(note.accidental).toEqual(accidental);
                expect(note.noteType).toEqual(noteType);
            }
        );

        it("throws error for invalid note format", () => {
            expect(() => MusicalNote.parse("H")).toThrow("Invalid note format");
            expect(() => MusicalNote.parse("8")).toThrow("Invalid note format");
            expect(() => MusicalNote.parse("")).toThrow("Invalid note format");
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
            { input: "2#", normalized: "2♯" },
            { input: "4b", normalized: "4♭" },
            
            // Unicode accidentals
            { input: "B♮", normalized: "B" },
            { input: "A♭", normalized: "A♭" },
            { input: "F♯", normalized: "F♯" },

            // German notation to Unicode
            { input: "Gis", normalized: "G♯" },
            { input: "Fes", normalized: "F♭" },
        ];

        test.each(normalizationCases)(
            "normalizes $input correctly",
            ({ input, normalized }) => {
                const note = MusicalNote.parse(input);
                expect(note.toString()).toEqual(input);
                expect(note.toString(false)).toEqual(input);
                expect(note.toString(true)).toEqual(normalized);
            }
        );
    });
});

describe("ChordNotation", () => {
    const testCases = [
        // Alpha notation
        { input: "[C]", note: "C", modifier: undefined, bass: undefined, noteType: NoteType.ALPHA },
        { input: "[F6add9]", note: "F", modifier: "6add9", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[Bbmaj7]", note: "Bb", modifier: "maj7", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[F#m7/B]", note: "F#", modifier: "m7", bass: "B", noteType: NoteType.ALPHA },
        { input: "[C/G]", note: "C", modifier: undefined, bass: "G", noteType: NoteType.ALPHA },
        
        // Nashville notation
        { input: "[1]", note: "1", modifier: undefined, bass: undefined, noteType: NoteType.NASHVILLE },
        { input: "[4b7]", note: "4b", modifier: "7", bass: undefined, noteType: NoteType.NASHVILLE },
        { input: "[4b7/5]", note: "4b", modifier: "7", bass: "5", noteType: NoteType.NASHVILLE },
        { input: "[6m/4]", note: "6", modifier: "m", bass: "4", noteType: NoteType.NASHVILLE },
        
        // Unicode accidentals
        { input: "[F♯m7]", note: "F♯", modifier: "m7", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[B♭maj7]", note: "B♭", modifier: "maj7", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[4♭7/5]", note: "4♭", modifier: "7", bass: "5", noteType: NoteType.NASHVILLE },

        // Complex modifiers
        { input: "[C#dim]", note: "C#", modifier: "dim", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[Fmaj7]", note: "F", modifier: "maj7", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[G7alt]", note: "G", modifier: "7alt", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[Am7add13]", note: "A", modifier: "m7add13", bass: undefined, noteType: NoteType.ALPHA },

        // Alternative chord quality notations
        { input: "[CΔ]", note: "C", modifier: "Δ", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[FΔ7]", note: "F", modifier: "Δ7", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[Co]", note: "C", modifier: "o", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[Cø7]", note: "C", modifier: "ø7", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[C+]", note: "C", modifier: "+", bass: undefined, noteType: NoteType.ALPHA },
        { input: "[CΔ7/E]", note: "C", modifier: "Δ7", bass: "E", noteType: NoteType.ALPHA },
        { input: "[Go7/B]", note: "G", modifier: "o7", bass: "B", noteType: NoteType.ALPHA },
        { input: "[A+add9]", note: "A", modifier: "+add9", bass: undefined, noteType: NoteType.ALPHA },
    ];

    describe("parses valid chord notation", () => {
        test.each(testCases)(
            "parses $input correctly",
            ({ input, note, modifier, bass, noteType }) => {
                const chord = ChordNotation.parse(input);
                
                expect(chord.note.toString()).toEqual(note);
                expect(chord.note.noteType).toEqual(noteType);
                expect(chord.modifier).toEqual(modifier);
                expect(chord.bass?.toString()).toEqual(bass);
                
                // round-trip test
                expect(chord.toString()).toEqual(input);
            }
        );

    });

    it("throws error for invalid chord format", () => {
        expect(() => ChordNotation.parse("[H]")).toThrow("Invalid chord notation format");
        expect(() => ChordNotation.parse("C")).toThrow("Invalid chord notation format");
    });


    describe("normalization", () => {
        const normalizationCases = [
            // Basic accidental normalization
            { input: "[F#m7]", normalized: "[F♯m7]" },
            { input: "[BbMAJ7]", normalized: "[B♭maj7]" },
            { input: "[F#m7/Bb]", normalized: "[F♯m7/B♭]" },
            { input: "[2#m]", normalized: "[2♯m]" },
            { input: "[4b7/5#]", normalized: "[4♭7/5♯]" },
            { input: "[Fes]", normalized: "[F♭]" },
            { input: "[Gis]", normalized: "[G♯]" },
            
            // Alternative chord quality normalization
            { input: "[CΔ]", normalized: "[Cmaj]" },
            { input: "[FΔ7]", normalized: "[Fmaj7]" },
            { input: "[BbΔ9]", normalized: "[B♭maj9]" },
            { input: "[DΔ#11]", normalized: "[Dmaj♯11]" },
            { input: "[Co]", normalized: "[Cdim]" },
            { input: "[Co7]", normalized: "[Cdim7]" },
            { input: "[F#o]", normalized: "[F♯dim]" },
            { input: "[Go7/B]", normalized: "[Gdim7/B]" },
            { input: "[Cø]", normalized: "[Cm7♭5]" },
            { input: "[Cø7]", normalized: "[Cm7♭5]" },
            { input: "[F#ø7]", normalized: "[F♯m7♭5]" },
            { input: "[Amø]", normalized: "[Amm7♭5]" },
            { input: "[C+7]", normalized: "[Caug7]" },
            { input: "[F+]", normalized: "[Faug]" },
            { input: "[A+add9]", normalized: "[Aaugadd9]" },
        ];

        test.each(normalizationCases)(
            "normalizes $input correctly",
            ({ input, normalized }) => {
                const chord = ChordNotation.parse(input);
                expect(chord.toString()).toEqual(input);
                expect(chord.toString(false)).toEqual(input);
                expect(chord.toString(true)).toEqual(normalized);
            }
        );

        // Test the quality property specifically
        const qualityTests = [
            { input: "[CΔ7]", expectedQuality: "maj7" },
            { input: "[Co]", expectedQuality: "dim" },
            { input: "[Cø7]", expectedQuality: "m7♭5" },
            { input: "[C+]", expectedQuality: "aug" },
            { input: "[C]", expectedQuality: undefined },
            { input: "[Cmaj7]", expectedQuality: "maj7" },
            { input: "[C#Δ9]", expectedQuality: "maj9" },
            { input: "[F#o7]", expectedQuality: "dim7" },
            { input: "[Bbø]", expectedQuality: "m7♭5" },
            { input: "[D+add9]", expectedQuality: "augadd9" },
        ];

        test.each(qualityTests)(
            "exposes correct quality property for $input",
            ({ input, expectedQuality }) => {
                const chord = ChordNotation.parse(input);
                expect(chord.quality).toEqual(expectedQuality);
            }
        );
    });

    describe("validation", () => {
        const validChords = [
            // Alpha notation
            "[C]", "[D]", "[F#]", "[Bb]", "[G♯]", "[A♭]", "[Fes]", "[Gis]",
            "[Em]", "[F#m7]", "[C7]", "[Dm7]", "[F#m7/B]", "[C/G]", "[Bb/F]",
            
            // Alternative chord quality notations
            "[CΔ]", "[FΔ7]", "[BbΔ9]", "[DΔ#11]", "[CΔ7/E]",
            "[Co]", "[Co7]", "[F#o]", "[Go7/B]", "[C#odim]",
            "[Cø]", "[Cø7]", "[F#ø7]", "[Amø]", "[Dmø7/F#]",
            "[C+]", "[C+7]", "[F+]", "[A+add9]", "[G+maj7]",
            
            // Nashville notation
            "[1]", "[2]", "[3]", "[4]", "[5]", "[6]", "[7]",
            "[1#]", "[2b]", "[3♯]", "[4♭]", "[5es]", "[6is]",
            "[1m]", "[2m7]", "[3maj7]", "[4b7/5]", "[1/3]", "[6m/4]"
        ];

        const invalidChords = [
            // Missing brackets or malformed
            "C", "[C", "C]", "[]",
            
            // Invalid note names
            "[H]", "[0]", "[8]",
            
            // Other notation types
            "[*Annotation]", "(Instruction)", "{capo: 2]", "# Comment", "",
            
            // Nashville specific invalid
            "[*1]", "(1)"
        ];

        test.each(validChords)("accepts valid chord %s", (chord) => {
            expect(ChordNotation.test(chord)).toBe(true);
        });

        test.each(invalidChords)("rejects invalid chord %s", (chord) => {
            expect(ChordNotation.test(chord)).toBe(false);
        });
    });
});

describe("Annotation", () => {
    it("parses and stringifies correctly", () => {
        const original = "[*Basic Annotation]";

        const annotation = Annotation.parse(original);
        expect(annotation.content).toEqual("Basic Annotation");

        const roundTrip = annotation.toString();
        expect(roundTrip).toEqual(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = Annotation.parse(roundTrip);
        expect(takeTwo.content).toEqual(annotation.content);
    });

    describe("validation", () => {
        const validAnnotations = [
            "[*Simple annotation]",
            "[*Complex annotation with numbers 123]",
            "[*Annotation with punctuation!@#$%]",
            "[*Multi-word annotation with spaces]"
        ];

        const invalidAnnotations = [
            "[*]", "Simple annotation", "[Simple annotation]", "*Simple annotation",
            "[*Simple annotation", "Simple annotation]", "", "[C]", "(Instruction)",
            "{title: Annotation}", "# Comment"
        ];

        test.each(validAnnotations)("accepts valid annotation %s", (annotation) => {
            expect(Annotation.test(annotation)).toBe(true);
        });

        test.each(invalidAnnotations)("rejects invalid annotation %s", (annotation) => {
            expect(Annotation.test(annotation)).toBe(false);
        });
    });
});

describe("TextSegment", () => {
    it("stores and stringifies plain text", () => {
        const text = "Just some lyrics";
        const segment = new TextSegment(text);
        expect(segment.content).toEqual(text);
        expect(segment.toString()).toEqual(text);
    });
});

describe("CommentLine", () => {
    const testCases = [
        { input: "# This is a comment", content: "This is a comment", output: "# This is a comment" },
        { input: "### Multiple hashes comment", content: "Multiple hashes comment", output: "# Multiple hashes comment" },
        { input: "#No space comment", content: "No space comment", output: "# No space comment" },
        { input: "#", content: "", output: "# " },
        { input: "## Another comment", content: "Another comment", output: "# Another comment" },
    ];

    describe("parsing", () => {
        test.each(testCases)(
            "parses $input correctly",
            ({ input, content, output }) => {
                const comment = CommentLine.parse(input);
                expect(comment.content).toEqual(content);

                const roundTrip = comment.toString();
                expect(roundTrip).toEqual(output);

                // parse again to ensure round-trip compatibility
                const takeTwo = CommentLine.parse(roundTrip);
                expect(takeTwo.content).toEqual(comment.content);
            }
        );
    });

    describe("validation", () => {
        const validComments = [
            "# This is a comment",
            "## Another comment",
            "#",
            "#No space",
        ];

        test.each(validComments)("accepts valid comment %s", (comment) => {
            expect(CommentLine.test(comment)).toBe(true);
        });

        const invalidComments = [
            "This is not a comment",
            "(Instruction)", ""
        ];

        test.each(invalidComments)("rejects invalid comment %s", (comment) => {
            expect(CommentLine.test(comment)).toBe(false);
        });
    });
});

describe("EmptyLine", () => {
    const testCases = [
        { input: "" },
        { input: "   " },
        { input: "\t" },
        { input: " \t " },
    ];

    describe("parsing", () => {
        test.each(testCases)(
            "parses '$input' correctly",
            ({ input }) => {
                const emptyLine = EmptyLine.parse(input);

                const roundTrip = emptyLine.toString();
                expect(roundTrip).toEqual("");

                // parse again to ensure round-trip compatibility
                const takeTwo = EmptyLine.parse(roundTrip);
                expect(takeTwo.toString()).toEqual(emptyLine.toString());
            }
        );

        const invalidCases = [
            "Not empty", "# Comment", "(Instruction)"
        ];

        test.each(invalidCases)("throws errors for non-empty line '%s'", (input) => {
            expect(() => EmptyLine.parse(input)).toThrow();
        });
    });

    describe("validation", () => {
        const validEmptyLines = [
            "", "   ", "\t"
        ];

        const invalidEmptyLines = [
            "Not empty", "# Comment", "(Instruction)", "  \n  "
        ];

        test.each(validEmptyLines)("accepts valid empty line '%s'", (line) => {
            expect(EmptyLine.test(line)).toBe(true);
        });

        test.each(invalidEmptyLines)("rejects invalid empty line '%s'", (line) => {
            expect(EmptyLine.test(line)).toBe(false);
        });
    });
});

describe("TextLine", () => {
    const testCases = [
        { input: "This is a line of lyrics" },
        { input: "  Text with spaces  " },
        { input: "Special chars: !@#$%^&*()" },
        { input: "𝐔𝗇𝗂𝖼𝗈𝖽𝖾: ñ 中文 🎵 ♯♭" },
        { input: "Text with numbers 123" },
        { input: "Text with punctuation!" },
        { input: "  Text with leading spaces" },
        { input: "Text with trailing spaces  " },
        { input: "123" },
        { input: "Special chars: àáâãäå" },
    ];

    describe("parsing", () => {
        test.each(testCases)(
            "parses '$input' correctly",
            ({ input }) => {
                const textLine = TextLine.parse(input);
                expect(textLine.content).toEqual(input);

                const roundTrip = textLine.toString();
                expect(roundTrip).toEqual(input);

                // parse again to ensure round-trip compatibility
                const takeTwo = TextLine.parse(roundTrip);
                expect(takeTwo.content).toEqual(textLine.content);
            }
        );
    });

    describe("validation", () => {
        const validTextLines = [
            "Simple text", "Text with numbers 123", "Text with punctuation!",
            "  Text with leading spaces", "Text with trailing spaces  ", "123",
            "Special chars: àáâãäå"
        ];

        const invalidTextLines = [
            "", "   ", "\t", "  \n  "
        ];

        test.each(validTextLines)("accepts valid text line '%s'", (line) => {
            expect(TextLine.test(line)).toBe(true);
        });

        test.each(invalidTextLines)("rejects invalid text line '%s'", (line) => {
            expect(TextLine.test(line)).toBe(false);
        });
    });
});

describe("SegmentedLine", () => {
    describe("chords getter", () => {
        const testCases = [
            {
                input: "[C]Hello [G]world",
                expected: ["[C]", "[G]"],
            },
            {
                input: "[Am]Just one chord with lyrics",
                expected: ["[Am]"],
            },
            {
                input: "[C] [G] [Am] [F]",
                expected: ["[C]", "[G]", "[Am]", "[F]"],
            },
            {
                input: "[*verse] [C]Hello [*bridge] [G]world",
                expected: ["[C]", "[G]"],
            },
            {
                input: "[F#m7/B]Complex [Bb7add9]chord [C/G]notation",
                expected: ["[F#m7/B]", "[Bb7add9]", "[C/G]"],
            }
        ];

        test.each(testCases)(
            "parses chord segments from $input",
            ({ input, expected }) => {
                const line = SegmentedLine.parse(input);

                const chords = line.chords;

                expect(chords).toHaveLength(expected.length);

                chords.forEach(chord => {
                    expect(chord).toBeInstanceOf(ChordNotation);
                });

                const segments = expected.map(text => ChordNotation.parse(text));

                expect(chords).toEqual(segments);
            }
        );
    });

    describe("lyrics getter", () => {
        const testCases = [
            {
                input: "[C]Hello [G]world",
                expected: ["Hello ", "world"],
            },
            {
                input: "[Am]Just one chord with lyrics",
                expected: ["Just one chord with lyrics"],
            },
            {
                input: "[C] [G] [Am] [F]",
                expected: [" ", " ", " "],
            },
            {
                input: "[*verse] [C]Hello [*bridge] [G]world",
                expected: [" ", "Hello ", " ", "world"],
            },
            {
                input: "Start [C]middle [G]end",
                expected: ["Start ", "middle ", "end"],
            }
        ];

        test.each(testCases)(
            "parses lyrics segments from $input",
            ({ input, expected }) => {
                const line = SegmentedLine.parse(input);
                
                const lyrics = line.lyrics;
                
                expect(lyrics).toHaveLength(expected.length);

                lyrics.forEach(segment => {
                    expect(segment).toBeInstanceOf(TextSegment);
                });

                const segments = expected.map(text => new TextSegment(text));

                expect(lyrics).toEqual(segments);
            }
        );
    });
});

describe("ChoproFile", () => {
    const path = require('path');
    const fs = require('fs');

    /**
     * Helper function to load a test file, parse it, and verify round-trip serialization.
     */
    const prepareTestFile = (filename: string): ChoproFile => {
        const filePath = path.resolve(__dirname, filename);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        const file = ChoproFile.load(filePath);

        const roundTrip = file.toString();
        expect(roundTrip).toEqual(fileContent);

        const reparsed = ChoproFile.parse(roundTrip);
        expect(reparsed).toEqual(file);

        return file;
    };

    describe("content block parsing & serialization", () => {
        describe("minimal.md", () => {
            let file: ChoproFile;

            beforeAll(() => {
                file = prepareTestFile("minimal.md");
            });

            it("parses file structure correctly", () => {
                expect(file.frontmatter).toBeUndefined();
                expect(file.blocks).toHaveLength(9);
            });

            it("identifies block types correctly", () => {
                expect(file.blocks[0]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[2]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[3]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[4]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[5]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[6]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[7]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[8]).toBeInstanceOf(MarkdownBlock);
            });

            it("parses block content correctly", () => {
                expect(file.blocks[0].toString()).toContain("# Wheels on the Bus");
                expect(file.blocks[1].toString()).toContain("[D]wheels on the bus");
                expect(file.blocks[2].toString()).toEqual("");
                expect(file.blocks[3].toString()).toContain("[D]wipers on the bus");
                expect(file.blocks[4].toString()).toEqual("");
                expect(file.blocks[5].toString()).toContain("[D]horn on the bus");
                expect(file.blocks[6].toString()).toEqual("");
                expect(file.blocks[7].toString()).toContain("[D]doors on the bus");
                expect(file.blocks[8].toString()).toEqual("");
            });
        });

        describe("standard.md", () => {
            let file: ChoproFile;

            beforeAll(() => {
                file = prepareTestFile("standard.md");
            });

            it("parses file structure correctly", () => {
                expect(file.blocks).toHaveLength(9);
                expect(file.frontmatter).toBeDefined();
            });

            it("parses frontmatter correctly", () => {
                expect(file.frontmatter?.get("title")).toEqual("Amazing Grace (Traditional)");
                expect(file.frontmatter?.get("artist")).toEqual("John Newton");
                expect(file.frontmatter?.get("time")).toEqual("3/4");
                expect(file.frontmatter?.get("key")).toEqual("C");
                expect(file.frontmatter?.get("tempo")).toEqual(80);
            });

            it("identifies block types correctly", () => {
                expect(file.blocks[0]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[2]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[3]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[4]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[5]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[6]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[7]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[8]).toBeInstanceOf(MarkdownBlock);
            });

            it("parses block content correctly", () => {
                expect(file.blocks[0].toString()).toContain("# Amazing Grace");
                expect(file.blocks[0].toString()).toContain("## Verse 1");
                expect(file.blocks[1].toString()).toContain("[C]Amazing grace, how [F]sweet the [C]sound");
                expect(file.blocks[2].toString()).toContain("## Verse 2");
                expect(file.blocks[3].toString()).toContain("'Twas [C]grace that taught my [F]heart");
                expect(file.blocks[4].toString()).toContain("## Verse 3");
                expect(file.blocks[5].toString()).toContain("Through [C]many dangers");
                expect(file.blocks[6].toString()).toContain("## Verse 4");
                expect(file.blocks[7].toString()).toContain("When [D]we've been there");
                expect(file.blocks[8].toString()).toEqual("");
            });
        });

        describe("goofy-chopro.md", () => {
            let file: ChoproFile;

            beforeAll(() => {
                file = prepareTestFile("goofy-chopro.md");
            });

            it("parses file structure correctly", () => {
                expect(file.blocks).toHaveLength(3);
            });

            it("identifies block types correctly", () => {
                expect(file.blocks[0]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[2]).toBeInstanceOf(MarkdownBlock);
            });

            it("parses block content correctly", () => {
                expect(file.blocks[0].toString()).toContain("# Goofy");
                expect(file.blocks[1].toString()).toEqual("```chopro\n```");
                expect(file.blocks[2].toString()).toEqual("");
            });
        });

        describe("nashville.md", () => {
            let file: ChoproFile;

            beforeAll(() => {
                file = prepareTestFile("nashville.md");
            });

            it("parses file structure correctly", () => {
                expect(file.blocks).toHaveLength(19);
                expect(file.frontmatter).toBeUndefined();
            });

            it("identifies block types correctly", () => {
                expect(file.blocks[0]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[2]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[3]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[4]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[5]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[6]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[7]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[8]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[9]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[10]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[11]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[12]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[13]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[14]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[15]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[16]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[17]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[18]).toBeInstanceOf(MarkdownBlock);
            });

            it("parses header and intro content correctly", () => {
                expect(file.blocks[0].toString()).toContain("# House of the Rising Sun");
                expect(file.blocks[1].toString()).toContain("[1m] [3] [4] [6]");
            });

            it("parses verse sections correctly", () => {
                expect(file.blocks[2].toString()).toContain("## Verse 1");
                expect(file.blocks[3].toString()).toContain("There [1m]is a house in [3]New Or[4]leans");
                expect(file.blocks[4].toString()).toContain("## Turn");
                expect(file.blocks[5].toString()).toContain("[3] [4] [6] [1m] [5] [1m] [5]");
                expect(file.blocks[6].toString()).toContain("## Verse 2");
                expect(file.blocks[7].toString()).toContain("My [1m]mother was a [3]tailor");
                expect(file.blocks[8].toString()).toContain("## Verse 3");
                expect(file.blocks[9].toString()).toContain("Now the [1m]only thing a [3]gambler");
                expect(file.blocks[10].toString()).toContain("## Verse 4");
                expect(file.blocks[11].toString()).toContain("Oh [1m]mother, tell your [3]children");
                expect(file.blocks[12].toString()).toContain("## Verse 5");
                expect(file.blocks[13].toString()).toContain("Well, I [1m]got one foot on");
            });

            it("parses outro and ending correctly", () => {
                expect(file.blocks[14].toString()).toContain("## Outro");
                expect(file.blocks[15].toString()).toContain("there [1m]is a house ");
                expect(file.blocks[16].toString()).toContain("## Ending");
                expect(file.blocks[17].toString()).toContain("[3] [4] [6]");
                expect(file.blocks[18].toString()).toEqual("");
            });
        });

        describe("block-spacing.md", () => {
            let file: ChoproFile;

            beforeAll(() => {
                file = prepareTestFile("block-spacing.md");
            });

            it("parses file structure correctly", () => {
                expect(file.blocks).toHaveLength(16);
                expect(file.frontmatter).toBeUndefined();
                expect(file.blocks[0]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[0].toString()).toContain("# Mixed Spacing");
            });

            it("handles adjacent chopro blocks correctly", () => {
                expect(file.blocks[0].toString()).toContain("## No Spacing");
                expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[2]).toBeInstanceOf(ChoproBlock);
            });

            it("preserves single empty line spacing correctly", () => {
                expect(file.blocks[3].toString()).toContain("## Single Empty Line");

                expect(file.blocks[3]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[4]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[5]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[6]).toBeInstanceOf(ChoproBlock);

                expect(file.blocks[5].toString()).toEqual("");
            });

            it("preserves multiple empty line spacing correctly", () => {
                expect(file.blocks[7].toString()).toContain("## Multiple Empty Lines");

                expect(file.blocks[7]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[8]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[9]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[10]).toBeInstanceOf(ChoproBlock);

                expect(file.blocks[9].toString()).toEqual("\n\n");
            });

            it("handles extra markdown spacing correctly", () => {
                expect(file.blocks[11].toString()).toContain("## Extra Markdown Spacing");

                expect(file.blocks[11]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[12]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[13]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[14]).toBeInstanceOf(ChoproBlock);
                expect(file.blocks[15]).toBeInstanceOf(MarkdownBlock);
            });
        });

        describe("no-chopro.md", () => {
            let file: ChoproFile;

            beforeAll(() => {
                file = prepareTestFile("no-chopro.md");
            });

            it("parses file structure correctly", () => {
                expect(file.blocks).toHaveLength(1);
                expect(file.frontmatter).toBeUndefined();
            });

            it("identifies single markdown block correctly", () => {
                expect(file.blocks[0]).toBeInstanceOf(MarkdownBlock);
                expect(file.blocks[0].toString()).toContain("# No `chopro` Blocks in Here");
            });
        });
    });
});
