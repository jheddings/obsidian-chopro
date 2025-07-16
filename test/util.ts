import { ChoproBlock, BracketChord, SegmentedLine, ChordSegment } from "../src/parser";

/**
 * Helper function to verify that a SegmentedLine contains the expected chords.
 * Expected chords can be provided as either strings or chord objects.
 */
export function verifyChordsInLine(line: SegmentedLine, expected: (string | ChordSegment)[]): void {
    const actualChords = line.chords;

    expect(actualChords).toHaveLength(expected.length);

    const expectedChords = expected.map((chord) =>
        typeof chord === "string" ? ChordSegment.parse(chord) : chord
    );

    actualChords.forEach((actualChord, index) => {
        const expected = expectedChords[index];

        expect(actualChord).toBeInstanceOf(BracketChord);
        expect(actualChord.chord).toEqual(expected);
    });
}

export function verifyChordsInBlock(
    block: ChoproBlock,
    expected: (string[] | ChordSegment[])[]
): void {
    const lines = block.lines;

    expect(lines).toHaveLength(expected.length);

    lines.forEach((line, index) => {
        verifyChordsInLine(line as SegmentedLine, expected[index]);
    });
}
