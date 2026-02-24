import {
    BracketChord,
    LetterNotation,
    NashvilleNotation,
    Annotation,
    TextSegment,
    ChoproFile,
    CommentLine,
    DirectiveLine,
    EmptyLine,
    TextLine,
    ChoproBlock,
    MarkdownBlock,
    Frontmatter,
    SegmentedLine,
    ChordLine,
    ChordSegment,
} from "../src/parser";
import { loadChoproFile } from "./helpers";
import { verifyChordsInLine } from "./util";

describe("ChordSegment", () => {
    describe("normalization", () => {
        const normalizationCases = [
            // Basic accidental normalization
            { input: "F#m7", normalized: "F♯m7" },
            { input: "BbMAJ7", normalized: "B♭maj7" },
            { input: "F#m7/Bb", normalized: "F♯m7/B♭" },
            { input: "#2m", normalized: "♯2m" },
            { input: "b4m7/#5", normalized: "♭4m7/♯5" },
            { input: "Fes", normalized: "F♭" },
            { input: "Gis", normalized: "G♯" },

            // Alternative chord quality normalization
            { input: "CΔ", normalized: "Cmaj" },
            { input: "FΔ7", normalized: "Fmaj7" },
            { input: "BbΔ9", normalized: "B♭maj9" },
            { input: "DΔ#11", normalized: "Dmaj♯11" },
            { input: "Co", normalized: "Cdim" },
            { input: "Co7", normalized: "Cdim7" },
            { input: "F#o", normalized: "F♯dim" },
            { input: "Go7/B", normalized: "Gdim7/B" },
            { input: "Cø", normalized: "Cm7♭5" },
            { input: "Cø7", normalized: "Cm7♭5" },
            { input: "F#ø7", normalized: "F♯m7♭5" },
            { input: "Amø", normalized: "Amm7♭5" },
            { input: "C+7", normalized: "Caug7" },
            { input: "F+", normalized: "Faug" },
            { input: "A+add9", normalized: "Aaugadd9" },
        ];

        test.each(normalizationCases)("normalizes $input correctly", ({ input, normalized }) => {
            const chord = ChordSegment.parse(input);
            expect(chord.toString()).toEqual(input);
            expect(chord.toString(false)).toEqual(input);
            expect(chord.toString(true)).toEqual(normalized);
        });

        // Test the quality property specifically
        const qualityTests = [
            { input: "CΔ7", expectedQuality: "maj7" },
            { input: "Co", expectedQuality: "dim" },
            { input: "Cø7", expectedQuality: "m7♭5" },
            { input: "C+", expectedQuality: "aug" },
            { input: "C", expectedQuality: undefined },
            { input: "Cmaj7", expectedQuality: "maj7" },
            { input: "C#Δ9", expectedQuality: "maj9" },
            { input: "F#o7", expectedQuality: "dim7" },
            { input: "Bbø", expectedQuality: "m7♭5" },
            { input: "D+add9", expectedQuality: "augadd9" },
        ];

        test.each(qualityTests)(
            "exposes correct quality property for $input",
            ({ input, expectedQuality }) => {
                const chord = ChordSegment.parse(input);
                expect(chord.quality).toEqual(expectedQuality);
            }
        );
    });
});

describe("BracketChord", () => {
    describe("handles letter notation correctly", () => {
        const letterNotationCases = [
            "[C]",
            "[F6add9]",
            "[Bbmaj7]",
            "[F#m7/B]",
            "[C/G]",
            "[Am7add13]",
            "[CΔ7/E]",
        ];

        test.each(letterNotationCases)("parses $input correctly", (input) => {
            const chord = BracketChord.parse(input);
            expect(chord.chord).toBeInstanceOf(LetterNotation);
            expect(chord.toString()).toEqual(input);
        });
    });

    describe("handles Nashville notation correctly", () => {
        const nashvilleNotationCases = ["[1]", "[b4m7]", "[b4m7/5]", "[6m/4]"];

        test.each(nashvilleNotationCases)("parses $input correctly", (input) => {
            const chord = BracketChord.parse(input);
            expect(chord.chord).toBeInstanceOf(NashvilleNotation);
            expect(chord.toString()).toEqual(input);
        });
    });

    describe("error handling", () => {
        const invalidChords = [
            // Missing brackets or malformed
            "C",
            "[C",
            "C]",
            "[]",

            // Invalid note names
            "[H]",
            "[0]",
            "[8]",

            // Other notation types
            "[*Annotation]",
            "(Instruction)",
            "{capo: 2]",
            "# Comment",
            "",

            // Nashville specific invalid
            "[*1]",
            "(1)",
        ];

        test.each(invalidChords)("rejects invalid chord %s", (chord) => {
            expect(BracketChord.test(chord)).toBe(false);
            expect(() => BracketChord.parse(chord)).toThrow();
        });
    });
});

describe("LetterNotation", () => {
    const letterNotationCases = [
        { input: "C", note: "C", modifier: undefined, bass: undefined },
        { input: "Dsus", note: "D", modifier: "sus", bass: undefined },
        { input: "F#", note: "F#", modifier: undefined, bass: undefined },
        { input: "Bb", note: "Bb", modifier: undefined, bass: undefined },
        { input: "G♯", note: "G♯", modifier: undefined, bass: undefined },
        { input: "A♭", note: "A♭", modifier: undefined, bass: undefined },
        { input: "Fes", note: "Fes", modifier: undefined, bass: undefined },
        { input: "Gis", note: "Gis", modifier: undefined, bass: undefined },
        { input: "Em", note: "E", modifier: "m", bass: undefined },
        { input: "F#m7", note: "F#", modifier: "m7", bass: undefined },
        { input: "C7", note: "C", modifier: "7", bass: undefined },
        { input: "Dm7", note: "D", modifier: "m7", bass: undefined },
        { input: "F#m7/B", note: "F#", modifier: "m7", bass: "B" },
        { input: "C/G", note: "C", modifier: undefined, bass: "G" },
        { input: "Bb/F", note: "Bb", modifier: undefined, bass: "F" },
        { input: "F6add9", note: "F", modifier: "6add9", bass: undefined },
        { input: "Bbmaj7", note: "Bb", modifier: "maj7", bass: undefined },
        { input: "F♯m7", note: "F♯", modifier: "m7", bass: undefined },
        { input: "B♭maj7", note: "B♭", modifier: "maj7", bass: undefined },
        { input: "CΔ", note: "C", modifier: "Δ", bass: undefined },
        { input: "FΔ7", note: "F", modifier: "Δ7", bass: undefined },
        { input: "Co", note: "C", modifier: "o", bass: undefined },
        { input: "Cø7", note: "C", modifier: "ø7", bass: undefined },
        { input: "C+", note: "C", modifier: "+", bass: undefined },
    ];

    describe("parsing", () => {
        test.each(letterNotationCases)(
            "parses letter notation $input correctly",
            ({ input, note, modifier, bass }) => {
                const chord = LetterNotation.parse(input);

                expect(chord.note.toString()).toEqual(note);
                expect(chord.modifier).toEqual(modifier);
                expect(chord.bass?.toString()).toEqual(bass);

                // round-trip test
                expect(chord.toString()).toEqual(input);
            }
        );
    });

    describe("validation", () => {
        test.each(letterNotationCases)("accepts valid letter chord -- %s", ({ input }) => {
            expect(LetterNotation.test(input)).toBe(true);
            expect(ChordSegment.test(input)).toBe(true);
        });
    });

    describe("error handling", () => {
        const invalidLetterChords = [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "",
            "H",
            "0",
            "\n",
            "[C]",
            "[D]",
            "[F#]",
            "[Bb]",
            "[G♯]",
            "[A♭]",
        ];

        test.each(invalidLetterChords)("rejects invalid letter chord -- %s", (chord) => {
            expect(LetterNotation.test(chord)).toBe(false);
            expect(() => LetterNotation.parse(chord)).toThrow();
        });
    });
});

describe("NashvilleNotation", () => {
    const nashvilleNotationCases = [
        { input: "1", note: "1", modifier: undefined, bass: undefined, degree: 1 },
        { input: "2", note: "2", modifier: undefined, bass: undefined, degree: 2 },
        { input: "3", note: "3", modifier: undefined, bass: undefined, degree: 3 },
        { input: "4", note: "4", modifier: undefined, bass: undefined, degree: 4 },
        { input: "5", note: "5", modifier: undefined, bass: undefined, degree: 5 },
        { input: "6", note: "6", modifier: undefined, bass: undefined, degree: 6 },
        { input: "7", note: "7", modifier: undefined, bass: undefined, degree: 7 },
        { input: "#1", note: "#1", modifier: undefined, bass: undefined, degree: 1 },
        { input: "b2", note: "b2", modifier: undefined, bass: undefined, degree: 2 },
        { input: "♯3", note: "♯3", modifier: undefined, bass: undefined, degree: 3 },
        { input: "♭4", note: "♭4", modifier: undefined, bass: undefined, degree: 4 },
        { input: "1m", note: "1", modifier: "m", bass: undefined, degree: 1 },
        { input: "2m7", note: "2", modifier: "m7", bass: undefined, degree: 2 },
        { input: "3maj7", note: "3", modifier: "maj7", bass: undefined, degree: 3 },
        { input: "b4m7", note: "b4", modifier: "m7", bass: undefined, degree: 4 },
        { input: "b4m7/5", note: "b4", modifier: "m7", bass: "5", degree: 4 },
        { input: "1/3", note: "1", modifier: undefined, bass: "3", degree: 1 },
        { input: "6m/4", note: "6", modifier: "m", bass: "4", degree: 6 },
        { input: "♭4m7/5", note: "♭4", modifier: "m7", bass: "5", degree: 4 },
    ];

    describe("parsing", () => {
        test.each(nashvilleNotationCases)(
            "parses Nashville notation $input correctly",
            ({ input, note, modifier, bass, degree }) => {
                const chord = NashvilleNotation.parse(input);

                expect(chord.note.toString()).toEqual(note);
                expect(chord.modifier).toEqual(modifier);
                expect(chord.bass?.toString()).toEqual(bass);
                expect(chord.degree).toEqual(degree);

                // round-trip test
                expect(chord.toString()).toEqual(input);
            }
        );
    });

    describe("validation", () => {
        test.each(nashvilleNotationCases)("accepts valid Nashville chord -- %s", ({ input }) => {
            expect(NashvilleNotation.test(input)).toBe(true);
            expect(ChordSegment.test(input)).toBe(true);
        });
    });

    describe("error handling", () => {
        const invalidNashvilleChords = [
            "C",
            "D",
            "F#",
            "Bb",
            "G♯",
            "A♭",
            "Em",
            "F#m7",
            "C7",
            "Dm7",
            "C/G",
            "[1]",
            "[2]",
            "[3]",
            "[4]",
            "[5]",
            "[6]",
            "[7]",
        ];

        test.each(invalidNashvilleChords)("rejects invalid Nashville chord -- %s", (chord) => {
            expect(NashvilleNotation.test(chord)).toBe(false);
            expect(() => NashvilleNotation.parse(chord)).toThrow();
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
            "[*Multi-word annotation with spaces]",
        ];

        const invalidAnnotations = [
            "[*]",
            "Simple annotation",
            "[Simple annotation]",
            "*Simple annotation",
            "[*Simple annotation",
            "Simple annotation]",
            "",
            "[C]",
            "(Instruction)",
            "{title: Annotation}",
            "# Comment",
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
        {
            input: "# This is a comment",
            content: "This is a comment",
            output: "# This is a comment",
        },
        {
            input: "### Multiple hashes comment",
            content: "Multiple hashes comment",
            output: "# Multiple hashes comment",
        },
        { input: "#No space comment", content: "No space comment", output: "# No space comment" },
        { input: "#", content: "", output: "# " },
        { input: "## Another comment", content: "Another comment", output: "# Another comment" },
    ];

    describe("parsing", () => {
        test.each(testCases)("parses $input correctly", ({ input, content, output }) => {
            const comment = CommentLine.parse(input);
            expect(comment.content).toEqual(content);

            const roundTrip = comment.toString();
            expect(roundTrip).toEqual(output);

            // parse again to ensure round-trip compatibility
            const takeTwo = CommentLine.parse(roundTrip);
            expect(takeTwo.content).toEqual(comment.content);
        });
    });

    describe("validation", () => {
        const validComments = ["# This is a comment", "## Another comment", "#", "#No space"];

        test.each(validComments)("accepts valid comment %s", (comment) => {
            expect(CommentLine.test(comment)).toBe(true);
        });

        const invalidComments = ["This is not a comment", "(Instruction)", ""];

        test.each(invalidComments)("rejects invalid comment %s", (comment) => {
            expect(CommentLine.test(comment)).toBe(false);
        });
    });
});

describe("EmptyLine", () => {
    const testCases = [{ input: "" }, { input: "   " }, { input: "\t" }, { input: " \t " }];

    describe("parsing", () => {
        test.each(testCases)("parses '$input' correctly", ({ input }) => {
            const emptyLine = EmptyLine.parse(input);

            const roundTrip = emptyLine.toString();
            expect(roundTrip).toEqual("");

            // parse again to ensure round-trip compatibility
            const takeTwo = EmptyLine.parse(roundTrip);
            expect(takeTwo.toString()).toEqual(emptyLine.toString());
        });

        const invalidCases = ["Not empty", "# Comment", "(Instruction)"];

        test.each(invalidCases)("throws errors for non-empty line '%s'", (input) => {
            expect(() => EmptyLine.parse(input)).toThrow();
        });
    });

    describe("validation", () => {
        const validEmptyLines = ["", "   ", "\t"];

        const invalidEmptyLines = ["Not empty", "# Comment", "(Instruction)", "  \n  "];

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
        test.each(testCases)("parses '$input' correctly", ({ input }) => {
            const textLine = TextLine.parse(input);
            expect(textLine.content).toEqual(input);

            const roundTrip = textLine.toString();
            expect(roundTrip).toEqual(input);

            // parse again to ensure round-trip compatibility
            const takeTwo = TextLine.parse(roundTrip);
            expect(takeTwo.content).toEqual(textLine.content);
        });
    });

    describe("validation", () => {
        const validTextLines = [
            "Simple text",
            "Text with numbers 123",
            "Text with punctuation!",
            "  Text with leading spaces",
            "Text with trailing spaces  ",
            "123",
            "Special chars: àáâãäå",
        ];

        const invalidTextLines = ["", "   ", "\t", "  \n  "];

        test.each(validTextLines)("accepts valid text line '%s'", (line) => {
            expect(TextLine.test(line)).toBe(true);
        });

        test.each(invalidTextLines)("rejects invalid text line '%s'", (line) => {
            expect(TextLine.test(line)).toBe(false);
        });
    });
});

describe("DirectiveLine", () => {
    const testCases = [
        "{title: Amazing Grace}",
        "{artist: John Newton}",
        "{key: C}",
        "{capo: 2}",
        "{tempo: 120}",
        "{comment: This is a comment}",
        "{start_of_chorus}",
        "{end_of_chorus}",
        "{soc}",
    ];

    describe("parsing", () => {
        test.each(testCases)("parses %s correctly", (input) => {
            const directive = DirectiveLine.parse(input);
            expect(directive.line).toEqual(input);

            const roundTrip = directive.toString();
            expect(roundTrip).toEqual(input);

            // parse again to ensure round-trip compatibility
            const takeTwo = DirectiveLine.parse(roundTrip);
            expect(takeTwo.line).toEqual(directive.line);
        });
    });

    describe("validation", () => {
        const validDirectives = [
            "{title: Test Song}",
            "{artist: Test Artist}",
            "{key: G}",
            "{start_of_verse}",
            "{sov}",
            "{capo: 3}",
        ];

        test.each(validDirectives)("accepts valid directive %s", (directive) => {
            expect(DirectiveLine.test(directive)).toBe(true);
        });

        const invalidDirectives = [
            "This is not a directive",
            "# Comment",
            "[C]Chord line",
            "",
            "{ incomplete",
            "incomplete }",
            "title: Missing braces",
        ];

        test.each(invalidDirectives)("rejects invalid directive %s", (directive) => {
            expect(DirectiveLine.test(directive)).toBe(false);
        });
    });
});

describe("SegmentedLine", () => {
    describe("chords getter", () => {
        const testCases = [
            {
                input: "[C]Hello [G]world",
                expected: ["C", "G"],
            },
            {
                input: "[Am]Just one chord with lyrics",
                expected: ["Am"],
            },
            {
                input: "[C] [G] [Am] [F]",
                expected: ["C", "G", "Am", "F"],
            },
            {
                input: "[*verse] [C]Hello [*bridge] [G]world",
                expected: ["C", "G"],
            },
            {
                input: "[F#m7/B]Complex [Bb7add9]chord [C/G]notation",
                expected: ["F#m7/B", "Bb7add9", "C/G"],
            },
        ];

        test.each(testCases)("parses chord segments from $input", ({ input, expected }) => {
            const line = SegmentedLine.parse(input);
            verifyChordsInLine(line, expected);
        });
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
            },
        ];

        test.each(testCases)("parses lyrics segments from $input", ({ input, expected }) => {
            const line = SegmentedLine.parse(input);

            const lyrics = line.lyrics;

            expect(lyrics).toHaveLength(expected.length);

            lyrics.forEach((segment) => {
                expect(segment).toBeInstanceOf(TextSegment);
            });

            const segments = expected.map((text) => new TextSegment(text));

            expect(lyrics).toEqual(segments);
        });
    });
});

describe("ChordLine", () => {
    const chordLineTests = [
        { input: "Am    Dm   E7" },
        { input: "F#m7/B Bb7add9 C/G" },
        { input: "C   Intro   G7" },
        { input: "C   D   E   F   G" },
        { input: "C" },
        { input: "   B" },
    ];

    describe("parsing", () => {
        test.each(chordLineTests)("round-trips '$input'", ({ input }) => {
            const chordLine = ChordLine.parse(input);
            expect(chordLine.toString()).toEqual(input);
        });
    });

    describe("validation", () => {
        test.each(chordLineTests)("validates '$input'", ({ input }) => {
            expect(ChordLine.test(input)).toBe(true);
        });
    });

    describe("error handling", () => {
        const invalidChordLines = [
            "This line has no chords",
            "C G H J K",
            "[C] [G] [Am] [F]",
            "",
            "  \t  ",
        ];

        test.each(invalidChordLines)("rejects invalid chord line '%s'", (line) => {
            expect(ChordLine.test(line)).toBe(false);
        });
    });
});

describe("ChoproBlock", () => {
    describe("empty blocks", () => {
        it("creates an empty block", () => {
            const block = new ChoproBlock([]);
            expect(block.lines).toHaveLength(0);
            expect(block.toString()).toEqual("```chopro\n```");
        });

        it("parses an empty block", () => {
            const block = ChoproBlock.parse("```chopro\n```");
            expect(block.lines).toHaveLength(0);
            expect(block.toString()).toEqual("```chopro\n```");
        });

        it("parses a block with an empty line", () => {
            const block = ChoproBlock.parse("```chopro\n\n```");
            expect(block.lines).toHaveLength(1);
            expect(block.toString()).toEqual("```chopro\n\n```");
        });
    });

    describe("with content", () => {
        it("parses and serializes content correctly", () => {
            const content = "```chopro\n[C]Amazing [F]Grace\nHow [G]sweet the [C]sound\n```";
            const block = ChoproBlock.parse(content);
            expect(block.lines).toHaveLength(2);
            expect(block.toString()).toEqual(content);
        });

        it("handles round-trip parsing", () => {
            const originalContent = "```chopro\n# Verse 1\n[C]Test line\n\n[F]Another line\n```";
            const block = ChoproBlock.parse(originalContent);
            const serialized = block.toString();
            const reparsed = ChoproBlock.parse(serialized);
            expect(reparsed.toString()).toEqual(originalContent);
        });
    });
});

describe("MarkdownBlock", () => {
    describe("basic functionality", () => {
        it("creates and serializes simple markdown", () => {
            const content = "# Heading\n\nThis is some markdown content.";
            const block = new MarkdownBlock(content);
            expect(block.content).toEqual(content);
            expect(block.toString()).toEqual(content);
        });

        it("parses markdown content correctly", () => {
            const content = "## Verse 1\n\nSome lyrics here\n- List item\n- Another item";
            const block = MarkdownBlock.parse(content);
            expect(block.content).toEqual(content);
            expect(block.toString()).toEqual(content);
        });

        it("handles round-trip parsing", () => {
            const originalContent =
                "**Bold text** and *italic text*\n\n> Blockquote\n\n```\nCode block\n```";
            const block = MarkdownBlock.parse(originalContent);
            const serialized = block.toString();
            const reparsed = MarkdownBlock.parse(serialized);
            expect(reparsed.toString()).toEqual(originalContent);
        });
    });

    describe("test method", () => {
        it("identifies markdown content correctly", () => {
            expect(MarkdownBlock.test("# Regular markdown")).toBe(true);
        });
    });
});

describe("Frontmatter", () => {
    describe("basic functionality", () => {
        it("creates and serializes empty frontmatter", () => {
            const frontmatter = new Frontmatter();
            expect(frontmatter.properties).toEqual({});
            expect(frontmatter.toString()).toEqual("---\n{}\n---");
        });

        it("parses frontmatter with properties", () => {
            const content = "---\ntitle: Test Song\nartist: Test Artist\ntempo: 120\n---";
            const frontmatter = Frontmatter.parse(content);
            expect(frontmatter.get("title")).toEqual("Test Song");
            expect(frontmatter.get("artist")).toEqual("Test Artist");
            expect(frontmatter.get("tempo")).toEqual(120);
        });

        it("handles round-trip parsing", () => {
            const originalContent = "---\ntitle: Amazing Grace\nkey: C\ntime: 3/4\n---";
            const frontmatter = Frontmatter.parse(originalContent);
            const serialized = frontmatter.toString();
            const reparsed = Frontmatter.parse(serialized);
            expect(reparsed.get("title")).toEqual("Amazing Grace");
            expect(reparsed.get("key")).toEqual("C");
            expect(reparsed.get("time")).toEqual("3/4");
        });
    });

    describe("property management", () => {
        it("manages properties correctly", () => {
            const frontmatter = new Frontmatter();

            frontmatter.set("title", "Test Song");
            expect(frontmatter.has("title")).toBe(true);
            expect(frontmatter.get("title")).toEqual("Test Song");

            frontmatter.set("tempo", 100);
            expect(frontmatter.keys()).toContain("title");
            expect(frontmatter.keys()).toContain("tempo");

            frontmatter.remove("title");
            expect(frontmatter.has("title")).toBe(false);
            expect(frontmatter.get("title")).toBeUndefined();
        });
    });

    describe("test method", () => {
        it("identifies frontmatter correctly", () => {
            expect(Frontmatter.test("---\ntitle: test\n---")).toBe(true);
            expect(Frontmatter.test("---\nkey: C\ntime: 4/4\n---")).toBe(true);
            expect(Frontmatter.test("# Regular markdown")).toBe(false);
            expect(Frontmatter.test("```chopro\n[C]chord\n```")).toBe(false);
        });
    });
});

describe("ChoproFile", () => {
    const path = require("path");
    const fs = require("fs");

    /**
     * Helper function to load a test file, parse it, and verify round-trip serialization.
     */
    const prepareTestFile = (filename: string): ChoproFile => {
        const filePath = path.resolve(__dirname, filename);
        const fileContent = fs.readFileSync(filePath, "utf-8");

        const file = loadChoproFile(filePath);

        const roundTrip = file.toString();
        expect(roundTrip).toEqual(fileContent);

        const reparsed = ChoproFile.parse(roundTrip);
        expect(reparsed).toEqual(file);

        return file;
    };

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
            expect(file.frontmatter?.get("tempo")).toEqual(80);

            expect(file.key).toEqual("C");
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
            expect(file.blocks[0].toString()).toContain("# Verse 1");
            expect(file.blocks[1].toString()).toContain(
                "[C]Amazing grace, how [F]sweet the [C]sound"
            );
            expect(file.blocks[2].toString()).toContain("# Verse 2");
            expect(file.blocks[3].toString()).toContain("'Twas [C]grace that taught my [F]heart");
            expect(file.blocks[4].toString()).toContain("# Verse 3");
            expect(file.blocks[5].toString()).toContain("Through [C]many dangers");
            expect(file.blocks[6].toString()).toContain("# Verse 4");
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
            expect(file.blocks).toHaveLength(5);
        });

        it("identifies block types correctly", () => {
            expect(file.blocks[0]).toBeInstanceOf(MarkdownBlock);
            expect(file.blocks[1]).toBeInstanceOf(ChoproBlock);
            expect(file.blocks[2]).toBeInstanceOf(MarkdownBlock);
        });

        it("parses block content correctly", () => {
            expect(file.blocks[0].toString()).toContain("# Goofy");
            expect(file.blocks[1].toString()).toEqual("```chopro\n```");
            expect(file.blocks[3].toString()).toEqual("```chopro\n\n```");
        });
    });

    describe("nashville.md", () => {
        let file: ChoproFile;

        beforeAll(() => {
            file = prepareTestFile("nashville.md");
        });

        it("parses file structure correctly", () => {
            expect(file.blocks).toHaveLength(19);
            expect(file.frontmatter).toBeDefined();
            expect(file.frontmatter?.get("title")).toEqual("House of the Rising Sun");
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
            expect(file.blocks[0].toString()).toContain("# Intro");
            expect(file.blocks[1].toString()).toContain("[1m] [3] [4] [6]");
        });

        it("parses verse sections correctly", () => {
            expect(file.blocks[2].toString()).toContain("# Verse 1");
            expect(file.blocks[3].toString()).toContain(
                "There [1m]is a house in [3]New Or[4]leans"
            );
            expect(file.blocks[4].toString()).toContain("# Turn");
            expect(file.blocks[5].toString()).toContain("[3] [4] [6] [1m] [5] [1m] [5]");
            expect(file.blocks[6].toString()).toContain("# Verse 2");
            expect(file.blocks[7].toString()).toContain("My [1m]mother was a [3]tailor");
            expect(file.blocks[8].toString()).toContain("# Verse 3");
            expect(file.blocks[9].toString()).toContain("Now the [1m]only thing a [3]gambler");
            expect(file.blocks[10].toString()).toContain("# Verse 4");
            expect(file.blocks[11].toString()).toContain("Oh [1m]mother, tell your [3]children");
            expect(file.blocks[12].toString()).toContain("# Verse 5");
            expect(file.blocks[13].toString()).toContain("Well, I [1m]got one foot on");
        });

        it("parses outro and ending correctly", () => {
            expect(file.blocks[14].toString()).toContain("# Outro");
            expect(file.blocks[15].toString()).toContain("there [1m]is a house ");
            expect(file.blocks[16].toString()).toContain("# Ending");
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

    describe("convert.md", () => {
        let file: ChoproFile;

        beforeAll(() => {
            file = prepareTestFile("convert.md");
        });

        it("parses file structure correctly", () => {
            expect(file.frontmatter).toBeUndefined();
        });
    });
});
