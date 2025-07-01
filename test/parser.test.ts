import {
    ChordNotation,
    ChordType,
    Annotation,
    TextSegment,
    ChoproFile,
    CommentLine,
    EmptyLine,
    TextLine,
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
