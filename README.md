# ChoPro Plugin for Obsidian

An Obsidian plugin that renders ChordPro format chord sheets with accurate chord positioning above lyrics.

![Source](docs/chopro-source.png)

... becomes ...

![Rendered](docs/chopro-render.png)

## Features

- **Accurate Chord Positioning**: Improved algorithm for precise chord-to-lyric alignment
- **ChordPro Directives Support**: Display song metadata like `{title}`, `{artist}`, `{key}`, etc.
- **Configurable Styling**: Customizable chord color, directive display
- **Chord Normalization**: Automatic cleanup and standardization of chord notation

## Usage

Create a code block with the `chopro` language identifier:

````markdown
```chopro
{title: Amazing Grace}
{artist: Traditional}

[C]Amazing [F]grace how [G]sweet the sound
That [C]saved a [Am]wretch like [F]me[G]
[C]I once was [F]lost but [G]now am found
Was [C]blind but [Am]now I [F]see[C]
```
````

## Configuration

Access settings via Settings → Community Plugins → ChordPro Viewer:

- **Chord Color**: Set the color for chord text (CSS color value)
- **Show Directives**: Toggle display of ChordPro metadata directives

## Supported ChordPro Features

### Chords
- Basic chords: `[C]`, `[F]`, `[G]`, etc.
- Complex chords: `[Am7]`, `[Bmaj7]`, `[C#dim]`, `[F/A]`
- Nashville numbers: `[1]`, `[4]`, `[5]`, `[6m]`, `[1maj7]`, `[5/7]`, etc.
- Multiple consecutive chords: `[C][F][G]` or `[1][4][5]`
- Chords at any position in the line

### Directives
- `{title: Song Title}`
- `{artist: Artist Name}`
- `{album: Album Name}`
- `{key: C}`
- `{tempo: 120}`
- `{capo: 2}`
- And other standard ChordPro directives

## Installation

### Manual Installation

1. Download the latest release files:
   - `main.js`
   - `manifest.json`

2. Create a folder named `obsidian-chopro` in your vault's `.obsidian/plugins/` directory

3. Copy the downloaded files into this folder

4. Enable the plugin in Settings → Community Plugins

### Development Installation

1. Clone this repository into your vault's `.obsidian/plugins/` directory
2. Run `npm install` to install dependencies
3. Run `npm run dev` for development with hot reload
4. Run `npm run build` for production build

## License

MIT License - see LICENSE file for details

## Support

If you encounter any issues or have feature requests, please open an issue on the GitHub repository.
