// config model for the Obsidian ChordPro plugin

import { LogLevel } from "./logger";

export interface RenderSettings {
    chordColor: string;
    chordSize: number;
    superscriptChordMods: boolean;
    chordDecorations: string;
    normalizedChordDisplay: boolean;
    italicAnnotations: boolean;
}

export interface FlowSettings {
    flowFilesFolder: string;
    flowExtraLine: boolean;
}

export interface ChoproPluginSettings {
    renderSettings: RenderSettings;
    flowSettings: FlowSettings;
    logLevel: LogLevel;
}
