// config model for the Obsidian ChordPro plugin

import { LogLevel } from "obskit";

export interface RenderSettings {
    chordColor: string;
    chordSize: number;
    superscriptChordMods: boolean;
    chordDecorations: string;
    normalizedChordDisplay: boolean;
    italicAnnotations: boolean;
    chordPairSpacing: number;
}

export interface FlowSettings {
    filesFolder: string;
    extraLine: boolean;
}

export interface ChoproPluginSettings {
    rendering: RenderSettings;
    flow: FlowSettings;
    logLevel: LogLevel;
}
