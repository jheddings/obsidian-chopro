import {
    ChordNotation,
    MusicalNote,
    NoteType,
    Annotation,
    TextSegment,
    ChoproFile,
    InstructionLine,
    CommentLine,
    EmptyLine,
    TextLine,
    DirectiveLine,
    CustomDirective,
    MetadataDirective,
    Accidental,
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

        it("preserves unicode accidentals when normalized", () => {
            const unicodeSharp = MusicalNote.parse("F♯");
            expect(unicodeSharp.toString(false)).toBe("F♯");
            expect(unicodeSharp.toString(true)).toBe("F♯");

            const unicodeFlat = MusicalNote.parse("B♭");
            expect(unicodeFlat.toString(false)).toBe("B♭");
            expect(unicodeFlat.toString(true)).toBe("B♭");
        });
    });
});

describe("ChordNotation", () => {
    const testCases = [
        // Alpha notation
        { input: "[C]", note: "C", modifier: undefined, bass: undefined, noteType: NoteType.ALPHA },
        { input: "[F#m7]", note: "F#", modifier: "m7", bass: undefined, noteType: NoteType.ALPHA },
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
    ];

    describe("parsing", () => {
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

        it("throws error for invalid chord format", () => {
            expect(() => ChordNotation.parse("[H]")).toThrow("Invalid chord notation format");
            expect(() => ChordNotation.parse("C")).toThrow("Invalid chord notation format");
        });
    });

    describe("normalization", () => {
        const normalizationCases = [
            { input: "[F#m7]", normalized: "[F♯m7]" },
            { input: "[Bbmaj7]", normalized: "[B♭maj7]" },
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

describe("InstructionLine", () => {
    it("parses and stringifies correctly", () => {
        const original = "(Intro)";

        const instruction = InstructionLine.parse(original);
        expect(instruction.content).toBe("Intro");

        const roundTrip = instruction.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = InstructionLine.parse(roundTrip);
        expect(takeTwo.content).toBe(instruction.content);
    });

    it("parses complex instruction content", () => {
        const original = "(Verse 1 - slowly, with feeling)";

        const instruction = InstructionLine.parse(original);
        expect(instruction.content).toBe("Verse 1 - slowly, with feeling");

        const roundTrip = instruction.toString();
        expect(roundTrip).toBe(original);
    });

    describe("validation", () => {
        const validInstructions = [
            "(Intro)", "(Verse 1)", "(Bridge - repeat 2x)"
        ];

        const invalidInstructions = [
            "Intro", "# Comment", "{key: C}", ""
        ];

        test.each(validInstructions)("accepts valid instruction %s", (instruction) => {
            expect(InstructionLine.test(instruction)).toBe(true);
        });

        test.each(invalidInstructions)("rejects invalid instruction %s", (instruction) => {
            expect(InstructionLine.test(instruction)).toBe(false);
        });
    });
});

describe("CommentLine", () => {
    it("parses and stringifies correctly", () => {
        const original = "# This is a comment";

        const comment = CommentLine.parse(original);
        expect(comment.content).toBe("This is a comment");

        const roundTrip = comment.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = CommentLine.parse(roundTrip);
        expect(takeTwo.content).toBe(comment.content);
    });

    it("parses multiple hash symbols", () => {
        const original = "### Multiple hashes comment";

        const comment = CommentLine.parse(original);
        expect(comment.content).toBe("Multiple hashes comment");

        const roundTrip = comment.toString();
        expect(roundTrip).toBe("# Multiple hashes comment");
    });

    it("parses comment without space after hash", () => {
        const original = "#No space comment";

        const comment = CommentLine.parse(original);
        expect(comment.content).toBe("No space comment");

        const roundTrip = comment.toString();
        expect(roundTrip).toBe("# No space comment");
    });

    it("parses empty comment", () => {
        const original = "#";

        const comment = CommentLine.parse(original);
        expect(comment.content).toBe("");

        const roundTrip = comment.toString();
        expect(roundTrip).toBe("# ");
    });

    describe("validation", () => {
        const validComments = [
            "# This is a comment", "## Another comment", "#", "#No space"
        ];

        const invalidComments = [
            "This is not a comment", "(Instruction)", ""
        ];

        test.each(validComments)("accepts valid comment %s", (comment) => {
            expect(CommentLine.test(comment)).toBe(true);
        });

        test.each(invalidComments)("rejects invalid comment %s", (comment) => {
            expect(CommentLine.test(comment)).toBe(false);
        });
    });
});

describe("EmptyLine", () => {
    it("parses and stringifies correctly", () => {
        const original = "";

        const emptyLine = EmptyLine.parse(original);

        const roundTrip = emptyLine.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = EmptyLine.parse(roundTrip);
        expect(takeTwo.toString()).toBe(emptyLine.toString());
    });

    it("parses whitespace-only lines", () => {
        const original = "   ";

        const emptyLine = EmptyLine.parse(original);

        const roundTrip = emptyLine.toString();
        expect(roundTrip).toBe("");
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

    it("throws errors for non-empty lines", () => {
        expect(() => EmptyLine.parse("Not empty")).toThrow();
        expect(() => EmptyLine.parse("# Comment")).toThrow();
    });
});

describe("TextLine", () => {
    it("parses and stringifies correctly", () => {
        const original = "This is a line of lyrics";

        const textLine = TextLine.parse(original);
        expect(textLine.content).toBe(original);

        const roundTrip = textLine.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = TextLine.parse(roundTrip);
        expect(takeTwo.content).toBe(textLine.content);
    });

    it("parses lines with whitespace", () => {
        const original = "  Text with spaces  ";

        const textLine = TextLine.parse(original);
        expect(textLine.content).toBe(original);

        const roundTrip = textLine.toString();
        expect(roundTrip).toBe(original);
    });

    it("parses lines with special characters", () => {
        const original = "Special chars: !@#$%^&*()";

        const textLine = TextLine.parse(original);
        expect(textLine.content).toBe(original);

        const roundTrip = textLine.toString();
        expect(roundTrip).toBe(original);
    });

    it("parses lines with unicode characters", () => {
        const original = "𝐔𝗇𝗂𝖼𝗈𝖽𝖾: ñ 中文 🎵 ♯♭";

        const textLine = TextLine.parse(original);
        expect(textLine.content).toBe(original);

        const roundTrip = textLine.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = TextLine.parse(roundTrip);
        expect(takeTwo.content).toBe(textLine.content);
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

describe("DirectiveLine", () => {
    describe("validation", () => {
        const validDirectives = [
            "{title: My Song}", "{artist: Bob Dylan}", "{key: C}", "{capo: 2}",
            "{x_custom: value}", "{start_of_chorus}", "{soc}", "{no_value}"
        ];

        const invalidDirectives = [
            "title: My Song", "{incomplete", "incomplete}", "{}", "",
            "# Comment", "(Instruction)", "[C]", "Just text"
        ];

        test.each(validDirectives)("accepts valid directive %s", (directive) => {
            expect(DirectiveLine.test(directive)).toBe(true);
        });

        test.each(invalidDirectives)("rejects invalid directive %s", (directive) => {
            expect(DirectiveLine.test(directive)).toBe(false);
        });
    });

    it("parses to appropriate subclass", () => {
        const customDirective = DirectiveLine.parse("{x_custom: value}");
        expect(customDirective).toBeInstanceOf(CustomDirective);
        expect(customDirective.name).toBe("custom");
        expect(customDirective.value).toBe("value");

        const metadataDirective = DirectiveLine.parse("{title: My Song}");
        expect(metadataDirective).toBeInstanceOf(MetadataDirective);
        expect(metadataDirective.name).toBe("title");
        expect(metadataDirective.value).toBe("My Song");
    });

    it("throws error for unknown directive format", () => {
        expect(() => DirectiveLine.parse("not a directive")).toThrow("Unknown directive");
        expect(() => DirectiveLine.parse("{invalid format")).toThrow("Unknown directive");
    });
});

describe("CustomDirective", () => {
    it("parses and stringifies correctly", () => {
        const original = "{x_custom: value}";

        const directive = CustomDirective.parse(original);
        expect(directive.name).toBe("custom");
        expect(directive.value).toBe("value");

        const roundTrip = directive.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = CustomDirective.parse(original);
        expect(takeTwo.name).toBe(directive.name);
        expect(takeTwo.value).toBe(directive.value);
    });

    it("parses custom directive without value", () => {
        const original = "{x_trigger}";

        const directive = CustomDirective.parse(original);
        expect(directive.name).toBe("trigger");
        expect(directive.value).toBeUndefined();
        expect(directive.toString()).toBe(original);
    });

    it("parses custom directive with spaces", () => {
        const original = "{x_my_custom: complex value with spaces}";

        const directive = CustomDirective.parse(original);
        expect(directive.name).toBe("my_custom");
        expect(directive.value).toBe("complex value with spaces");
        expect(directive.toString()).toBe(original);
    });

    describe("validation", () => {
        const validCustomDirectives = [
            "{x_custom: value}", "{x_trigger}", "{x_my_directive: complex value}", "{X_UPPERCASE: test}"
        ];

        const invalidCustomDirectives = [
            "{title: My Song}", "{artist: Bob Dylan}", "{custom: value}", "x_custom: value",
            "{x_custom", "x_custom}", "", "# Comment", "(Instruction)"
        ];

        test.each(validCustomDirectives)("accepts valid custom directive %s", (directive) => {
            expect(CustomDirective.test(directive)).toBe(true);
        });

        test.each(invalidCustomDirectives)("rejects invalid custom directive %s", (directive) => {
            expect(CustomDirective.test(directive)).toBe(false);
        });
    });
});

describe("MetadataDirective", () => {
    it("parses and stringifies correctly", () => {
        const original = "{title: My Song}";

        const directive = MetadataDirective.parse(original);
        expect(directive.name).toBe("title");
        expect(directive.value).toBe("My Song");

        const roundTrip = directive.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = MetadataDirective.parse(roundTrip);
        expect(takeTwo.name).toBe(directive.name);
        expect(takeTwo.value).toBe(directive.value);
    });

    it("parses directive without value", () => {
        const original = "{copyright}";

        const directive = MetadataDirective.parse(original);
        expect(directive.name).toBe("copyright");
        expect(directive.value).toBeUndefined();

        const roundTrip = directive.toString();
        expect(roundTrip).toBe(original);
    });

    it("parses directive with complex value", () => {
        const original = "{subtitle: A Song About Love and Loss}";

        const directive = MetadataDirective.parse(original);
        expect(directive.name).toBe("subtitle");
        expect(directive.value).toBe("A Song About Love and Loss");

        const roundTrip = directive.toString();
        expect(roundTrip).toBe(original);
    });

    it("parses directive with numeric value", () => {
        const original = "{capo: 3}";

        const directive = MetadataDirective.parse(original);
        expect(directive.name).toBe("capo");
        expect(directive.value).toBe("3");
        
        const roundTrip = directive.toString();
        expect(roundTrip).toBe(original);
    });

    it("normalizes directive name to lowercase", () => {
        const original = "{TITLE: My Song}";

        const directive = MetadataDirective.parse(original);
        expect(directive.name).toBe("title");
        expect(directive.value).toBe("My Song");

        const roundTrip = directive.toString();
        expect(roundTrip).toBe("{title: My Song}");
    });

    it("handles malformed directive gracefully", () => {
        const original = "malformed directive";

        const directive = MetadataDirective.parse(original);
        expect(directive.name).toBe("unknown");
        expect(directive.value).toBe(original);
    });

    describe("validation", () => {
        const validMetadataDirectives = [
            "{title: My Song}", "{artist: Bob Dylan}", "{key: C}", "{capo: 2}", "{tempo: 120}"
        ];

        const invalidMetadataDirectives = [
            "{x_custom: value}", "{X_CUSTOM: value}", "title: My Song", "{title", "title}",
            "", "# Comment", "(Instruction)", "[C]"
        ];

        test.each(validMetadataDirectives)("accepts valid metadata directive %s", (directive) => {
            expect(MetadataDirective.test(directive)).toBe(true);
        });

        test.each(invalidMetadataDirectives)("rejects invalid metadata directive %s", (directive) => {
            expect(MetadataDirective.test(directive)).toBe(false);
        });
    });
});

describe("File Parsing", () => {
    test.each(
        ["basic.md", "complex.md", "nashville.md", "performance.md", "special.md"])(
        "parses %s without errors",
        (fileName) => {
            const fs = require("fs");
            const path = require("path");
            const filePath = path.join(__dirname, fileName);
            const content = fs.readFileSync(filePath, "utf8");
            expect(() => ChoproFile.parse(content)).not.toThrow();
        }
    );
});
