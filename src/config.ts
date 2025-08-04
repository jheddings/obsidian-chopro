// config model for the Obsidian ChordPro plugin

import { LogLevel } from "./logger";

export interface ChoproPluginSettings {
    chordColor: string;
    chordSize: number;
    superscriptChordMods: boolean;
    chordDecorations: string;
    normalizedChordDisplay: boolean;
    italicAnnotations: boolean;
    flowFilesFolder: string;
    flowExtraLine: boolean;
    logLevel: LogLevel;
}
