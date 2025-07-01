import {
    ChordNotation,
    ChordType,
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
} from "../src/parser";

describe("Alpha ChordNotation", () => {
    it("parses a standard chord", () => {
        const original = "[C]";

        const chord = ChordNotation.parse(original);
        expect(chord.root).toBe("C");
        expect(chord.accidental).toBeUndefined();
        expect(chord.modifier).toBeUndefined();
        expect(chord.bass).toBeUndefined();
        expect(chord.note).toBe("C");
        expect(chord.chordType).toBe(ChordType.ALPHA);

        const roundTrip = chord.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = ChordNotation.parse(roundTrip);
        expect(takeTwo.root).toBe(chord.root);
        expect(takeTwo.accidental).toBe(chord.accidental);
        expect(takeTwo.modifier).toBe(chord.modifier);
        expect(takeTwo.bass).toBe(chord.bass);
    });

    it("parses a complex chord", () => {
        const original = "[F#m7/B]";
        const chord = ChordNotation.parse(original);

        expect(chord.root).toBe("F");
        expect(chord.accidental).toBe("#");
        expect(chord.modifier).toBe("m7");
        expect(chord.bass).toBe("B");
        expect(chord.note).toBe("F#");
        expect(chord.chordType).toBe(ChordType.ALPHA);

        const roundTrip = chord.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = ChordNotation.parse(roundTrip);
        expect(takeTwo.root).toBe(chord.root);
        expect(takeTwo.accidental).toBe(chord.accidental);
        expect(takeTwo.modifier).toBe(chord.modifier);
        expect(takeTwo.bass).toBe(chord.bass);
    });

    it("parses unicode sharp", () => {
        const original = "[F♯m7]";
        const chord = ChordNotation.parse(original);

        expect(chord.root).toBe("F");
        expect(chord.accidental).toBe("♯");
        expect(chord.modifier).toBe("m7");
        expect(chord.note).toBe("F♯");
        expect(chord.chordType).toBe(ChordType.ALPHA);

        const roundTrip = chord.toString();
        expect(roundTrip).toBe(original);
    });

    it("accepts valid formats", () => {
        expect(ChordNotation.test("[C]")).toBe(true);
        expect(ChordNotation.test("[D]")).toBe(true);
        expect(ChordNotation.test("[F#]")).toBe(true);
        expect(ChordNotation.test("[Bb]")).toBe(true);
        expect(ChordNotation.test("[G♯]")).toBe(true);
        expect(ChordNotation.test("[A♭]")).toBe(true);
        expect(ChordNotation.test("[Fes]")).toBe(true);
        expect(ChordNotation.test("[Gis]")).toBe(true);
        expect(ChordNotation.test("[Em]")).toBe(true);
        expect(ChordNotation.test("[F#m7]")).toBe(true);
        expect(ChordNotation.test("[C7]")).toBe(true);
        expect(ChordNotation.test("[Dm7]")).toBe(true);
        expect(ChordNotation.test("[F#m7/B]")).toBe(true);
        expect(ChordNotation.test("[C/G]")).toBe(true);
        expect(ChordNotation.test("[Bb/F]")).toBe(true);
    });

    it("rejects invalid formats", () => {
        expect(ChordNotation.test("C")).toBe(false);
        expect(ChordNotation.test("[H]")).toBe(false);
        expect(ChordNotation.test("[C")).toBe(false);
        expect(ChordNotation.test("C]")).toBe(false);
        expect(ChordNotation.test("[]")).toBe(false);
        expect(ChordNotation.test("[*Annotation]")).toBe(false);
        expect(ChordNotation.test("(Instruction)")).toBe(false);
        expect(ChordNotation.test("{capo: 2]")).toBe(false);
        expect(ChordNotation.test("# Comment")).toBe(false);
        expect(ChordNotation.test("")).toBe(false);
    });
});

describe("Nashville ChordNotation", () => {
    it("parses a basic Nashville chord", () => {
        const original = "[1]";
        const chord = ChordNotation.parse(original);
        expect(chord.root).toBe("1");
        expect(chord.accidental).toBeUndefined();
        expect(chord.modifier).toBeUndefined();
        expect(chord.bass).toBeUndefined();
        expect(chord.note).toBe("1");
        expect(chord.chordType).toBe(ChordType.NASHVILLE);

        const roundTrip = chord.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = ChordNotation.parse(roundTrip);
        expect(takeTwo.root).toBe(chord.root);
        expect(takeTwo.accidental).toBe(chord.accidental);
        expect(takeTwo.modifier).toBe(chord.modifier);
        expect(takeTwo.bass).toBe(chord.bass);
    });

    it("parses a complex Nashville chord", () => {
        const original = "[4b7/5]";
        const chord = ChordNotation.parse(original);
        expect(chord.root).toBe("4");
        expect(chord.accidental).toBe("b");
        expect(chord.modifier).toBe("7");
        expect(chord.bass).toBe("5");
        expect(chord.note).toBe("4b");
        expect(chord.chordType).toBe(ChordType.NASHVILLE);

        const roundTrip = chord.toString();
        expect(roundTrip).toBe(original);

        // parse again to ensure round-trip compatibility
        const takeTwo = ChordNotation.parse(roundTrip);
        expect(takeTwo.root).toBe(chord.root);
        expect(takeTwo.accidental).toBe(chord.accidental);
        expect(takeTwo.modifier).toBe(chord.modifier);
        expect(takeTwo.bass).toBe(chord.bass);
    });

    it("parses unicode flat", () => {
        const original = "[4♭7/5]";
        const chord = ChordNotation.parse(original);
        expect(chord.root).toBe("4");
        expect(chord.accidental).toBe("♭");
        expect(chord.note).toBe("4♭");
        expect(chord.chordType).toBe(ChordType.NASHVILLE);

        const roundTrip = chord.toString();
        expect(roundTrip).toBe(original);
    });

    it("accepts valid formats", () => {
        expect(ChordNotation.test("[1]")).toBe(true);
        expect(ChordNotation.test("[2]")).toBe(true);
        expect(ChordNotation.test("[3]")).toBe(true);
        expect(ChordNotation.test("[4]")).toBe(true);
        expect(ChordNotation.test("[5]")).toBe(true);
        expect(ChordNotation.test("[6]")).toBe(true);
        expect(ChordNotation.test("[7]")).toBe(true);
        expect(ChordNotation.test("[1#]")).toBe(true);
        expect(ChordNotation.test("[2b]")).toBe(true);
        expect(ChordNotation.test("[3♯]")).toBe(true);
        expect(ChordNotation.test("[4♭]")).toBe(true);
        expect(ChordNotation.test("[5es]")).toBe(true);
        expect(ChordNotation.test("[6is]")).toBe(true);
        expect(ChordNotation.test("[1m]")).toBe(true);
        expect(ChordNotation.test("[2m7]")).toBe(true);
        expect(ChordNotation.test("[3maj7]")).toBe(true);
        expect(ChordNotation.test("[4b7/5]")).toBe(true);
        expect(ChordNotation.test("[1/3]")).toBe(true);
        expect(ChordNotation.test("[6m/4]")).toBe(true);
    });

    it("rejects invalid formats", () => {
        expect(ChordNotation.test("[0]")).toBe(false);
        expect(ChordNotation.test("[8]")).toBe(false);
        expect(ChordNotation.test("[1")).toBe(false);
        expect(ChordNotation.test("1]")).toBe(false);
        expect(ChordNotation.test("1")).toBe(false);
        expect(ChordNotation.test("[*1]")).toBe(false);
        expect(ChordNotation.test("(1)")).toBe(false);
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

    it("accepts valid formats", () => {
        expect(Annotation.test("[*Simple annotation]")).toBe(true);
        expect(Annotation.test("[*Complex annotation with numbers 123]")).toBe(true);
        expect(Annotation.test("[*Annotation with punctuation!@#$%]")).toBe(true);
        expect(Annotation.test("[*Multi-word annotation with spaces]")).toBe(true);
    });

    it("rejects invalid formats", () => {
        expect(Annotation.test("[*]")).toBe(false);
        expect(Annotation.test("Simple annotation")).toBe(false);
        expect(Annotation.test("[Simple annotation]")).toBe(false);
        expect(Annotation.test("*Simple annotation")).toBe(false);
        expect(Annotation.test("[*Simple annotation")).toBe(false);
        expect(Annotation.test("Simple annotation]")).toBe(false);
        expect(Annotation.test("")).toBe(false);
        expect(Annotation.test("[C]")).toBe(false);
        expect(Annotation.test("(Instruction)")).toBe(false);
        expect(Annotation.test("{title: Annotation}")).toBe(false);
        expect(Annotation.test("# Comment")).toBe(false);
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

    it("accepts valid formats", () => {
        expect(InstructionLine.test("(Intro)")).toBe(true);
        expect(InstructionLine.test("(Verse 1)")).toBe(true);
        expect(InstructionLine.test("(Bridge - repeat 2x)")).toBe(true);
    });

    it("rejects invalid formats", () => {
        expect(InstructionLine.test("Intro")).toBe(false);
        expect(InstructionLine.test("# Comment")).toBe(false);
        expect(InstructionLine.test("{key: C}")).toBe(false);
        expect(InstructionLine.test("")).toBe(false);
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

    it("accepts valid formats", () => {
        expect(CommentLine.test("# This is a comment")).toBe(true);
        expect(CommentLine.test("## Another comment")).toBe(true);
        expect(CommentLine.test("#")).toBe(true);
        expect(CommentLine.test("#No space")).toBe(true);
    });

    it("rejects invalid formats", () => {
        expect(CommentLine.test("This is not a comment")).toBe(false);
        expect(CommentLine.test("(Instruction)")).toBe(false);
        expect(CommentLine.test("")).toBe(false);
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

    it("accepts valid formats", () => {
        expect(EmptyLine.test("")).toBe(true);
        expect(EmptyLine.test("   ")).toBe(true);
        expect(EmptyLine.test("\t")).toBe(true);
    });

    it("rejects invalid formats", () => {
        expect(EmptyLine.test("Not empty")).toBe(false);
        expect(EmptyLine.test("# Comment")).toBe(false);
        expect(EmptyLine.test("(Instruction)")).toBe(false);
        expect(EmptyLine.test("  \n  ")).toBe(false);
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

    it("accepts valid formats", () => {
        expect(TextLine.test("Simple text")).toBe(true);
        expect(TextLine.test("Text with numbers 123")).toBe(true);
        expect(TextLine.test("Text with punctuation!")).toBe(true);
        expect(TextLine.test("  Text with leading spaces")).toBe(true);
        expect(TextLine.test("Text with trailing spaces  ")).toBe(true);
        expect(TextLine.test("123")).toBe(true);
        expect(TextLine.test("Special chars: àáâãäå")).toBe(true);
    });

    it("rejects invalid formats", () => {
        expect(TextLine.test("")).toBe(false);
        expect(TextLine.test("   ")).toBe(false);
        expect(TextLine.test("\t")).toBe(false);
        expect(TextLine.test("  \n  ")).toBe(false);
    });
});

describe("DirectiveLine", () => {
    it("accepts valid formats", () => {
        expect(DirectiveLine.test("{title: My Song}")).toBe(true);
        expect(DirectiveLine.test("{artist: Bob Dylan}")).toBe(true);
        expect(DirectiveLine.test("{key: C}")).toBe(true);
        expect(DirectiveLine.test("{capo: 2}")).toBe(true);
        expect(DirectiveLine.test("{x_custom: value}")).toBe(true);
        expect(DirectiveLine.test("{start_of_chorus}")).toBe(true);
        expect(DirectiveLine.test("{soc}")).toBe(true);
        expect(DirectiveLine.test("{no_value}")).toBe(true);
    });

    it("rejects invalid formats", () => {
        expect(DirectiveLine.test("title: My Song")).toBe(false);
        expect(DirectiveLine.test("{incomplete")).toBe(false);
        expect(DirectiveLine.test("incomplete}")).toBe(false);
        expect(DirectiveLine.test("{}")).toBe(false);
        expect(DirectiveLine.test("")).toBe(false);
        expect(DirectiveLine.test("# Comment")).toBe(false);
        expect(DirectiveLine.test("(Instruction)")).toBe(false);
        expect(DirectiveLine.test("[C]")).toBe(false);
        expect(DirectiveLine.test("Just text")).toBe(false);
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

    it("accepts valid formats", () => {
        expect(CustomDirective.test("{x_custom: value}")).toBe(true);
        expect(CustomDirective.test("{x_trigger}")).toBe(true);
        expect(CustomDirective.test("{x_my_directive: complex value}")).toBe(true);
        expect(CustomDirective.test("{X_UPPERCASE: test}")).toBe(true);
    });

    it("rejects invalid formats", () => {
        expect(CustomDirective.test("{title: My Song}")).toBe(false);
        expect(CustomDirective.test("{artist: Bob Dylan}")).toBe(false);
        expect(CustomDirective.test("{custom: value}")).toBe(false);
        expect(CustomDirective.test("x_custom: value")).toBe(false);
        expect(CustomDirective.test("{x_custom")).toBe(false);
        expect(CustomDirective.test("x_custom}")).toBe(false);
        expect(CustomDirective.test("")).toBe(false);
        expect(CustomDirective.test("# Comment")).toBe(false);
        expect(CustomDirective.test("(Instruction)")).toBe(false);
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

    it("accepts valid formats", () => {
        expect(MetadataDirective.test("{title: My Song}")).toBe(true);
        expect(MetadataDirective.test("{artist: Bob Dylan}")).toBe(true);
        expect(MetadataDirective.test("{key: C}")).toBe(true);
        expect(MetadataDirective.test("{capo: 2}")).toBe(true);
        expect(MetadataDirective.test("{tempo: 120}")).toBe(true);
    });

    it("rejects invalid formats", () => {
        expect(MetadataDirective.test("{x_custom: value}")).toBe(false);
        expect(MetadataDirective.test("{X_CUSTOM: value}")).toBe(false);
        expect(MetadataDirective.test("title: My Song")).toBe(false);
        expect(MetadataDirective.test("{title")).toBe(false);
        expect(MetadataDirective.test("title}")).toBe(false);
        expect(MetadataDirective.test("")).toBe(false);
        expect(MetadataDirective.test("# Comment")).toBe(false);
        expect(MetadataDirective.test("(Instruction)")).toBe(false);
        expect(MetadataDirective.test("[C]")).toBe(false);
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
