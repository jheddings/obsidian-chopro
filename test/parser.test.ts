import { ChordNotation, ChordType, Annotation, TextSegment } from '../src/parser';

describe('Basic ChordNotation', () => {
  it('parses a standard C chord', () => {
    const chord = ChordNotation.parse('[C]');
    expect(chord.root).toBe('C');
    expect(chord.accidental).toBeUndefined();
    expect(chord.modifier).toBeUndefined();
    expect(chord.bass).toBeUndefined();
    expect(chord.note).toBe('C');
    expect(chord.chordType).toBe(ChordType.ALPHA);
    expect(chord.toString()).toBe('[C]');
  });
});

describe('Basic Annotation', () => {
  it('parses and stringifies correctly', () => {
    const original = '[*Basic Annotation]';

    const annotation = Annotation.parse(original);
    expect(annotation.content).toBe('Basic Annotation');

    const roundTrip = annotation.toString();
    expect(roundTrip).toBe(original);

    // parse again to ensure round-trip compatibility
    const takeTwo = Annotation.parse(roundTrip);
    expect(takeTwo.content).toBe(annotation.content);
  });
});

describe('Basic TextSegment', () => {
  it('stores and stringifies plain text', () => {
    const text = 'Just some lyrics';
    const segment = new TextSegment(text);
    expect(segment.content).toBe(text);
    expect(segment.toString()).toBe(text);
  });
});
