import { App } from "obsidian";

import {
    LogLevel,
    PluginSettingsTab,
    SettingsTabPage,
    TextInputSetting,
    DropdownSetting,
    SliderSetting,
    ToggleSetting,
} from "obskit";

import { ChoproBlock } from "./parser";
import ChoproPlugin from "./main";

/**
 * User setting for chord color.
 */
class ChordColor extends TextInputSetting {
    constructor(private plugin: ChoproPlugin) {
        super({
            name: "Chord color",
            description: "Color for chord text (CSS color value)",
        });
    }

    get value(): string {
        return this.plugin.settings.rendering.chordColor;
    }

    set value(value: string) {
        this.plugin.settings.rendering.chordColor = value;
    }

    get default(): string {
        return "#2563eb";
    }
}

/**
 * User setting for chord size.
 */
class ChordSize extends SliderSetting {
    constructor(private plugin: ChoproPlugin) {
        super({
            name: "Chord size",
            description: "Font size for chord text (relative to base font)",
        });
    }

    get value(): number {
        return this.plugin.settings.rendering.chordSize;
    }

    set value(value: number) {
        this.plugin.settings.rendering.chordSize = value;
    }

    get default(): number {
        return 1.0;
    }

    get minimum(): number {
        return 0.5;
    }

    get maximum(): number {
        return 2.0;
    }

    get step(): number {
        return 0.05;
    }
}

/**
 * User setting for superscript chord modifiers.
 */
class SuperscriptChordMods extends ToggleSetting {
    constructor(private plugin: ChoproPlugin) {
        super({
            name: "Superscript chord modifiers",
            description: "Display chord modifiers (7, maj7, sus4, etc.) as superscript",
        });
    }

    get value(): boolean {
        return this.plugin.settings.rendering.superscriptChordMods;
    }

    set value(value: boolean) {
        this.plugin.settings.rendering.superscriptChordMods = value;
    }

    get default(): boolean {
        return false;
    }
}

/**
 * User setting for chord decorations.
 */
class ChordDecorations extends DropdownSetting<string> {
    constructor(private plugin: ChoproPlugin) {
        super({
            name: "Chord decorations",
            description: "Wrap chords with bracket pairs for emphasis",
        });
    }

    get value(): string {
        return this.plugin.settings.rendering.chordDecorations;
    }

    set value(value: string) {
        this.plugin.settings.rendering.chordDecorations = value;
    }

    get default(): string {
        return "none";
    }

    get options(): { key: string; label: string; value: string }[] {
        return [
            { key: "none", label: "None", value: "none" },
            { key: "square", label: "[ ]", value: "square" },
            { key: "round", label: "( )", value: "round" },
            { key: "curly", label: "{ }", value: "curly" },
            { key: "angle", label: "< >", value: "angle" },
        ];
    }
}

/**
 * User setting for normalized chord display.
 */
class NormalizedChordDisplay extends ToggleSetting {
    constructor(private plugin: ChoproPlugin) {
        super({
            name: "Normalized chord display",
            description: "Use normalized chord representations (F# → F♯, Bb → B♭)",
        });
    }

    get value(): boolean {
        return this.plugin.settings.rendering.normalizedChordDisplay;
    }

    set value(value: boolean) {
        this.plugin.settings.rendering.normalizedChordDisplay = value;
    }

    get default(): boolean {
        return false;
    }
}

/**
 * User setting for italic annotations.
 */
class ItalicAnnotations extends ToggleSetting {
    constructor(private plugin: ChoproPlugin) {
        super({
            name: "Italic annotations",
            description: "Display inline annotations in italics",
        });
    }

    get value(): boolean {
        return this.plugin.settings.rendering.italicAnnotations;
    }

    set value(value: boolean) {
        this.plugin.settings.rendering.italicAnnotations = value;
    }

    get default(): boolean {
        return false;
    }
}

/**
 * User setting for song folder.
 */
class SongFolder extends TextInputSetting {
    constructor(private plugin: ChoproPlugin) {
        super({
            name: "Song folder",
            description: "Folder to search for song files (leave empty for all files)",
        });
    }

    get value(): string {
        return this.plugin.settings.flow.filesFolder;
    }

    set value(value: string) {
        this.plugin.settings.flow.filesFolder = value;
    }

    get default(): string {
        return "";
    }
}

/**
 * User setting for blank lines in flow.
 */
class BlankLinesInFlow extends ToggleSetting {
    constructor(private plugin: ChoproPlugin) {
        super({
            name: "Blank lines in flow",
            description: "Add a blank line after each flow item",
        });
    }

    get value(): boolean {
        return this.plugin.settings.flow.extraLine;
    }

    set value(value: boolean) {
        this.plugin.settings.flow.extraLine = value;
    }

    get default(): boolean {
        return false;
    }
}

/**
 * Control the log level user setting.
 */
class LogLevelSetting extends DropdownSetting<LogLevel> {
    constructor(private plugin: ChoproPlugin) {
        super({
            name: "Log level",
            description: "Set the logging level for console output.",
        });
    }

    get value(): LogLevel {
        return this.plugin.settings.logLevel ?? this.default;
    }

    set value(val: LogLevel) {
        this.plugin.settings.logLevel = val;
        this.plugin.saveSettings();
    }

    get default(): LogLevel {
        return LogLevel.INFO;
    }

    get options(): { key: string; label: string; value: LogLevel }[] {
        return [
            { key: "debug", label: "Debug", value: LogLevel.DEBUG },
            { key: "info", label: "Info", value: LogLevel.INFO },
            { key: "warn", label: "Warn", value: LogLevel.WARN },
            { key: "error", label: "Error", value: LogLevel.ERROR },
            { key: "silent", label: "Silent", value: LogLevel.SILENT },
        ];
    }
}

class DisplaySettings extends SettingsTabPage {
    constructor(private plugin: ChoproPlugin) {
        super("Display");
    }

    display(containerEl: HTMLElement): void {
        new ChordColor(this.plugin)
            .onChange((_value) => {
                updatePreview();
            })
            .display(containerEl);

        new ChordSize(this.plugin)
            .onChange((_value) => {
                updatePreview();
            })
            .display(containerEl);

        new SuperscriptChordMods(this.plugin)
            .onChange((_value) => {
                updatePreview();
            })
            .display(containerEl);

        new ChordDecorations(this.plugin)
            .onChange((_value) => {
                updatePreview();
            })
            .display(containerEl);

        new NormalizedChordDisplay(this.plugin)
            .onChange((_value) => {
                updatePreview();
            })
            .display(containerEl);

        new ItalicAnnotations(this.plugin)
            .onChange((_value) => {
                updatePreview();
            })
            .display(containerEl);

        const previewDiv = containerEl.createDiv({ cls: "setting-item" });
        previewDiv
            .createDiv({ cls: "setting-item-info" })
            .createDiv({ cls: "setting-item-name", text: "Preview" });

        const previewContent = previewDiv.createDiv({
            cls: "setting-item-control",
        });
        const preview = previewContent.createDiv();

        const choproPreview = `
            [F]Amazing [F7]grace, how [Bb]sweet the [F]sound, that [Dm]saved a [FMAJ7]wretch like [C]me
            I [F]once was [F7]lost but [Bb]now I'm [F]found, was [Dm]blind but [C]now I [F]see [*Rit.]
        `;

        // update preview content based on current settings
        const updatePreview = () => {
            preview.empty();
            this.plugin.saveSettings();

            const sample = choproPreview.replace(/^\s+/m, "");
            const block = ChoproBlock.parseRaw(sample);
            this.plugin.renderer.renderChoproBlock(block, preview);
        };

        // initial preview
        updatePreview();
    }
}

class FlowSettings extends SettingsTabPage {
    constructor(private plugin: ChoproPlugin) {
        super("Flow");
    }

    display(containerEl: HTMLElement): void {
        new SongFolder(this.plugin).display(containerEl);
        new BlankLinesInFlow(this.plugin).display(containerEl);
    }
}

/**
 * Settings page for advanced options.
 */
class AdvancedSettings extends SettingsTabPage {
    constructor(private plugin: ChoproPlugin) {
        super("Advanced");
    }

    display(containerEl: HTMLElement): void {
        new LogLevelSetting(this.plugin).display(containerEl);
    }
}

/**
 * ChordPro settings tab.
 */
export class ChoproSettingTab extends PluginSettingsTab {
    constructor(app: App, plugin: ChoproPlugin) {
        super(app, plugin);

        this.addTabs([
            new DisplaySettings(plugin),
            new FlowSettings(plugin),
            new AdvancedSettings(plugin),
        ]);
    }
}
