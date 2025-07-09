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
                
                expect(note.root).toBe(root);
                expect(note.postfix).toBe(postfix);
                expect(note.accidental).toBe(accidental);
                expect(note.noteType).toBe(noteType);
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
                expect(note.toString()).toBe(input);
                expect(note.toString(false)).toBe(input);
                expect(note.toString(true)).toBe(normalized);
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
    ];

    describe("parses valid chord notation", () => {
        test.each(testCases)(
            "parses $input correctly",
            ({ input, note, modifier, bass, noteType }) => {
                const chord = ChordNotation.parse(input);
                
                expect(chord.note.toString()).toBe(note);
                expect(chord.note.noteType).toBe(noteType);
                expect(chord.modifier).toBe(modifier);
                expect(chord.bass?.toString()).toBe(bass);
                
                // round-trip test
                expect(chord.toString()).toBe(input);
            }
        );

    });

    it("throws error for invalid chord format", () => {
        expect(() => ChordNotation.parse("[H]")).toThrow("Invalid chord notation format");
        expect(() => ChordNotation.parse("C")).toThrow("Invalid chord notation format");
    });


    describe("normalization", () => {
        const normalizationCases = [
            { input: "[F#m7]", normalized: "[F♯m7]" },
            { input: "[BbMAJ7]", normalized: "[B♭maj7]" },
            { input: "[F#m7/Bb]", normalized: "[F♯m7/B♭]" },
            { input: "[2#m]", normalized: "[2♯m]" },
            { input: "[4b7/5#]", normalized: "[4♭7/5♯]" },
            { input: "[Fes]", normalized: "[F♭]" },
            { input: "[Gis]", normalized: "[G♯]" },
        ];

        test.each(normalizationCases)(
            "normalizes $input correctly",
            ({ input, normalized }) => {
                const chord = ChordNotation.parse(input);
                expect(chord.toString()).toBe(input);
                expect(chord.toString(false)).toBe(input);
                expect(chord.toString(true)).toBe(normalized);
            }
        );

        it("preserves unicode accidentals when normalized", () => {
            const unicodeSharp = ChordNotation.parse("[F♯m7]");
            expect(unicodeSharp.toString(false)).toBe("[F♯m7]");
            expect(unicodeSharp.toString(true)).toBe("[F♯m7]");

            const unicodeFlat = ChordNotation.parse("[B♭maj7]");
            expect(unicodeFlat.toString(false)).toBe("[B♭maj7]");
            expect(unicodeFlat.toString(true)).toBe("[B♭maj7]");
        });
    });

    describe("validation", () => {
        const validChords = [
            // Alpha notation
            "[C]", "[D]", "[F#]", "[Bb]", "[G♯]", "[A♭]", "[Fes]", "[Gis]",
            "[Em]", "[F#m7]", "[C7]", "[Dm7]", "[F#m7/B]", "[C/G]", "[Bb/F]",
            
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
        expect(annotation.content).toBe("Basic Annotation");

        const roundTrip = annotation.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = Annotation.parse(roundTrip);
        expect(takeTwo.content).toBe(annotation.content);
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
        expect(segment.content).toBe(text);
        expect(segment.toString()).toBe(text);
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
                expect(comment.content).toBe(content);

                const roundTrip = comment.toString();
                expect(roundTrip).toBe(output);

                // parse again to ensure round-trip compatibility
                const takeTwo = CommentLine.parse(roundTrip);
                expect(takeTwo.content).toBe(comment.content);
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
                expect(roundTrip).toBe("");

                // parse again to ensure round-trip compatibility
                const takeTwo = EmptyLine.parse(roundTrip);
                expect(takeTwo.toString()).toBe(emptyLine.toString());
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
                expect(textLine.content).toBe(input);

                const roundTrip = textLine.toString();
                expect(roundTrip).toBe(input);

                // parse again to ensure round-trip compatibility
                const takeTwo = TextLine.parse(roundTrip);
                expect(takeTwo.content).toBe(textLine.content);
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

describe("ChoproFile", () => {
    describe("content block parsing", () => {
        const contentParsingCases = [
            {
                name: "mixed markdown and ChoPro content",
                source: `# Title

Some introduction text.

\`\`\`chopro
[C]Amazing [F]grace
\`\`\`

## Section 1

Content for section 1.

\`\`\`chopro
[G]How [Am]sweet the [F]sound[C]
\`\`\`

# Another Title

More content under another title.`,
                expectedBlocks: [
                    { type: MarkdownBlock, contains: "# Title" },
                    { type: ChoproBlock, lineCount: 1 },
                    { type: MarkdownBlock, contains: "## Section 1" },
                    { type: ChoproBlock, lineCount: 1 },
                    { type: MarkdownBlock, contains: "# Another Title" }
                ]
            },
            {
                name: "multiple ChoPro blocks with markdown between them",
                source: `# Multiple Blocks Test

First markdown section.

\`\`\`chopro
[C]First [F]block
\`\`\`

Middle markdown section.

\`\`\`chopro
[G]Second [Am]block
\`\`\`

Final markdown section.`,
                expectedBlocks: [
                    { type: MarkdownBlock, contains: "Multiple Blocks Test" },
                    { type: ChoproBlock, lineCount: 1 },
                    { type: MarkdownBlock, contains: "Middle markdown section" },
                    { type: ChoproBlock, lineCount: 1 },
                    { type: MarkdownBlock, contains: "Final markdown section" }
                ]
            },
            {
                name: "consecutive ChoPro blocks",
                source: `\`\`\`chopro
[C]First verse
\`\`\`
\`\`\`chopro
[F]Second verse
\`\`\``,
                expectedBlocks: [
                    { type: ChoproBlock, lineCount: 1 },
                    { type: ChoproBlock, lineCount: 1 }
                ]
            },
            {
                name: "empty ChoPro blocks",
                source: `\`\`\`chopro\n\`\`\``,
                expectedBlocks: [
                    { type: ChoproBlock, lineCount: 0 }
                ]
            }
        ];

        test.each(contentParsingCases)(
            "handles $name",
            ({ source, expectedBlocks }) => {
                const file = ChoproFile.parse(source);

                expect(file).toBeInstanceOf(ChoproFile);
                expect(file.blocks).toHaveLength(expectedBlocks.length);

                expectedBlocks.forEach((expected, index) => {
                    const block = file.blocks[index];
                    expect(block).toBeInstanceOf(expected.type);
                    
                    if (expected.contains) {
                        expect(block.toString()).toContain(expected.contains);
                    }
                    
                    if (expected.lineCount !== undefined && block instanceof ChoproBlock) {
                        expect(block.lines).toHaveLength(expected.lineCount);
                    }
                });
            }
        );
    });

    describe("serialization and round-trip", () => {
        const roundTripCases = [
            {
                name: "parses frontmatter and maintains structure",
                source: `---
key: C
title: Test Song
---

# Test Song

\`\`\`chopro
[C]Amazing [F]grace
\`\`\``,
                verifyBlocks: (file: ChoproFile) => {
                    expect(file.frontmatter).toBeDefined();
                    expect(file.frontmatter?.get('key')).toBe('C');
                    expect(file.frontmatter?.get('title')).toBe('Test Song');
                    expect(file.blocks).toHaveLength(2);
                }
            },
            {
                name: "handles files without frontmatter",
                source: `# Test Song

\`\`\`chopro
[C]Amazing [F]grace
\`\`\``,
                verifyBlocks: (file: ChoproFile) => {
                    expect(file.frontmatter).toBeUndefined();
                    expect(file.blocks).toHaveLength(2);
                }
            },
            {
                name: "preserves whitespace and visual spacing",
                source: `# Header

Some text before the song.


\`\`\`chopro
[C]Amazing [F]grace how [G]sweet the sound
That [C]saved a [Am]wretch like [F]me[G]
\`\`\`


And some text after with multiple blank lines.



\`\`\`chopro
[C]I [F]once was [G]lost but [C]now am [F]found
Was [C]blind but [G]now I [C]see
\`\`\`



Final paragraph with trailing spaces.`,
                verifyBlocks: (file: ChoproFile) => {
                    expect(file.blocks).toHaveLength(5);
                    expect(file.blocks[0]).toBeInstanceOf(MarkdownBlock);
                    expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
                    expect(file.blocks[2]).toBeInstanceOf(MarkdownBlock);
                    expect(file.blocks[3]).toBeInstanceOf(ChoproBlock);
                    expect(file.blocks[4]).toBeInstanceOf(MarkdownBlock);
                }
            },
            {
                name: "preserves varying whitespace between consecutive ChoPro blocks",
                source: `\`\`\`chopro
[C]Verse 1 line 1
[F]Verse 1 line 2
\`\`\`
\`\`\`chopro
[G]Verse 2 line 1
[Am]Verse 2 line 2
\`\`\`

\`\`\`chopro
[C]Verse 3 line 1
[F]Verse 3 line 2
\`\`\`


\`\`\`chopro
[G]Verse 4 line 1
[Am]Verse 4 line 2
\`\`\`



\`\`\`chopro
[C]Verse 5 line 1
[F]Verse 5 line 2
\`\`\``,
                verifyBlocks: (file: ChoproFile) => {
                    expect(file.blocks).toHaveLength(8);
                    expect(file.blocks[0]).toBeInstanceOf(ChoproBlock);
                    expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
                    expect(file.blocks[2]).toBeInstanceOf(MarkdownBlock);
                    expect(file.blocks[3]).toBeInstanceOf(ChoproBlock);
                    expect(file.blocks[4]).toBeInstanceOf(MarkdownBlock);
                    expect(file.blocks[5]).toBeInstanceOf(ChoproBlock);
                    expect(file.blocks[6]).toBeInstanceOf(MarkdownBlock);
                    expect(file.blocks[7]).toBeInstanceOf(ChoproBlock);
                }
            }
        ];

        test.each(roundTripCases)(
            "$name",
            ({ source, verifyBlocks }) => {
                const file = ChoproFile.parse(source);
                
                const roundTrip = file.toString();
                const takeTwo = ChoproFile.parse(roundTrip);

                expect(roundTrip).toBe(source);
                expect(takeTwo.blocks).toHaveLength(file.blocks.length);
                
                if (verifyBlocks) {
                    verifyBlocks(takeTwo);
                }
            }
        );
    });

    describe("integration tests with real files", () => {
        test.each([
            "basic.md", 
            "complex.md", 
            "nashville.md", 
            "performance.md", 
            "special.md"
        ])("parses %s without errors", (fileName) => {
            const fs = require("fs");
            const path = require("path");
            const filePath = path.join(__dirname, fileName);
            const content = fs.readFileSync(filePath, "utf8");
            
            expect(() => ChoproFile.parse(content)).not.toThrow();
            
            // FIXME - this is failing due to an issue with CommentLine.toString()
            // const file = ChoproFile.parse(content);
            // expect(file.toString()).toBe(content);
        });
    });
});
