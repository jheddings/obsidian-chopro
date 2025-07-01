import { ChordNotation, ChordType, Annotation, TextSegment } from '../src/parser';

describe('Basic Alpha ChordNotation', () => {
  it('parses a standard chord', () => {
    const original = '[C]';

    const chord = ChordNotation.parse(original);
    expect(chord.root).toBe('C');
    expect(chord.accidental).toBeUndefined();
    expect(chord.modifier).toBeUndefined();
    expect(chord.bass).toBeUndefined();
    expect(chord.note).toBe('C');
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
});

describe('Complex Alpha ChordNotation', () => {
  it('parses a complex chord', () => {
    const original = '[F#m7/B]';
    const chord = ChordNotation.parse(original);

    expect(chord.root).toBe('F');
    expect(chord.accidental).toBe('#');
    expect(chord.modifier).toBe('m7');
    expect(chord.bass).toBe('B');
    expect(chord.note).toBe('F#');
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
});

describe('Basic Nashville ChordNotation', () => {
  it('parses a basic Nashville chord', () => {
    const original = '[1]';
    const chord = ChordNotation.parse(original);
    expect(chord.root).toBe('1');
    expect(chord.accidental).toBeUndefined();
    expect(chord.modifier).toBeUndefined();
    expect(chord.bass).toBeUndefined();
    expect(chord.note).toBe('1');
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
});

describe('Complex Nashville ChordNotation', () => {
  it('parses a complex Nashville chord', () => {
    const original = '[4b7/5]';
    const chord = ChordNotation.parse(original);
    expect(chord.root).toBe('4');
    expect(chord.accidental).toBe('b');
    expect(chord.modifier).toBe('7');
    expect(chord.bass).toBe('5');
    expect(chord.note).toBe('4b');
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
