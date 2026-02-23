// config model for the Obsidian ChordPro plugin

import { LogLevel } from "obskit";

export type RenderSettings = {
    chordColor: string;
    chordSize: number;
    superscriptChordMods: boolean;
    chordDecorations: string;
    normalizedChordDisplay: boolean;
    italicAnnotations: boolean;
    showMetadataHeader: boolean;
};

export type FlowSettings = {
    filesFolder: string;
    extraLine: boolean;
};

export type ChoproPluginSettings = {
    rendering: RenderSettings;
    flow: FlowSettings;
    logLevel: LogLevel;
};
