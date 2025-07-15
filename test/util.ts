import { ChoproBlock, ChordNotation, SegmentedLine } from "../src/parser";

/**
 * Helper function to verify that a SegmentedLine contains the expected chords.
 * Expected chords can be provided as either strings or ChordNotation objects.
 */
export function verifyChordsInLine(
    line: SegmentedLine,
    expected: (string | ChordNotation)[]
): void {
    const actualChords = line.chords;

    expect(actualChords).toHaveLength(expected.length);

    const expectedChords = expected.map((chord) =>
        typeof chord === "string" ? ChordNotation.parse(chord) : chord
    );

    actualChords.forEach((actualChord, index) => {
        expect(actualChord).toBeInstanceOf(ChordNotation);
        expect(actualChord).toEqual(expectedChords[index]);
    });
}

export function verifyChordsInBlock(
    block: ChoproBlock,
    expected: (string[] | ChordNotation[])[]
): void {
    const lines = block.lines;

    expect(lines).toHaveLength(expected.length);

    lines.forEach((line, index) => {
        verifyChordsInLine(line as SegmentedLine, expected[index]);
    });
}
