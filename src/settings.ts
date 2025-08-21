import { PluginSettingTab, App, Setting } from "obsidian";
import { ChoproBlock } from "./parser";
import { LogLevel } from "./logger";
import ChoproPlugin from "./main";

/** Configuration for a setting element. */
interface SettingConfig {
    name: string | DocumentFragment;
    description: string;
}

/**
 * Base class for reusable setting elements.
 */
abstract class BaseSetting<T> {
    protected name: string | DocumentFragment;
    protected description: string;

    protected _onChange?: (value: T) => void;

    constructor(config: SettingConfig) {
        this.name = config.name;
        this.description = config.description;
    }

    abstract get value(): T;

    abstract set value(val: T);

    abstract get default(): T;

    /**
     * Creates the setting element in the provided container.
     */
    abstract display(containerEl: HTMLElement): Setting;

    /**
     * Event hook when the value changes.
     */
    onChange(callback: (value: T) => void) {
        this._onChange = callback;
        return this;
    }
}

/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Toggle setting for boolean values.
 */
abstract class ToggleSetting extends BaseSetting<boolean> {
    display(containerEl: HTMLElement): Setting {
        return new Setting(containerEl)
            .setName(this.name)
            .setDesc(this.description)
            .addToggle((toggle) => {
                toggle.setValue(this.value);
                toggle.onChange(async (value) => {
                    this.value = value;
                    this._onChange?.(value);
                });
            });
    }
}

/**
 * Slider setting for numeric values.
 */
abstract class SliderSetting extends BaseSetting<number> {
    display(containerEl: HTMLElement): Setting {
        return new Setting(containerEl)
            .setName(this.name)
            .setDesc(this.description)
            .addSlider((slider) => {
                slider.setLimits(this.minimum, this.maximum, this.step);
                slider.setDynamicTooltip();
                slider.setValue(this.value);
                slider.onChange(async (value) => {
                    this.value = value;
                    this._onChange?.(value);
                });
            });
    }

    abstract get minimum(): number;

    abstract get maximum(): number;

    abstract get step(): number;
}

/**
 * Text area setting for single-line input.
 */
abstract class TextInputSetting extends BaseSetting<string> {
    display(containerEl: HTMLElement): Setting {
        return new Setting(containerEl)
            .setName(this.name)
            .setDesc(this.description)
            .addText((textInput) => {
                textInput.setValue(this.value);
                textInput.setPlaceholder(this.placeholder);
                textInput.onChange(async (value) => {
                    this.value = value;
                    this._onChange?.(value);
                });
            });
    }

    get placeholder(): string {
        return this.default;
    }
}

/**
 * Text area setting for multi-line input.
 */
abstract class TextAreaSetting extends TextInputSetting {
    display(containerEl: HTMLElement): Setting {
        return new Setting(containerEl)
            .setName(this.name)
            .setDesc(this.description)
            .addTextArea((textArea) => {
                textArea.setValue(this.value);
                textArea.setPlaceholder(this.placeholder);
                textArea.onChange(async (value) => {
                    this.value = value;
                    this._onChange?.(value);
                });
            });
    }
}

/**
 * Dropdown setting for enumerated values.
 */
abstract class DropdownSetting<T> extends BaseSetting<T> {
    display(containerEl: HTMLElement): Setting {
        return new Setting(containerEl)
            .setName(this.name)
            .setDesc(this.description)
            .addDropdown((dropdown) => {
                this.options.forEach(({ key, label }) => {
                    dropdown.addOption(key, label);
                });
                dropdown.setValue(this.getKeyForValue(this.value));
                dropdown.onChange(async (key) => {
                    this.value = this.getValueForKey(key);
                    this._onChange?.(this.value);
                });
            });
    }

    abstract get options(): { key: string; label: string; value: T }[];

    /**
     * Get the key for a given value.
     */
    protected getKeyForValue(value: T): string {
        const option = this.options.find((opt) => opt.value === value);
        return option?.key ?? this.options[0]?.key ?? "";
    }

    /**
     * Get the value for a given key.
     */
    protected getValueForKey(key: string): T {
        const option = this.options.find((opt) => opt.key === key);
        return option?.value ?? this.options[0]?.value;
    }
}

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
        return Object.entries(LogLevel)
            .filter(([_key, value]) => typeof value === "number")
            .map(([key, value]) => ({
                key: key,
                label: key.toLowerCase(),
                value: value as LogLevel,
            }));
    }
}

/**
 * Base class for settings tab pages.
 */
abstract class SettingsTabPage {
    public isActive: boolean = false;

    protected plugin: ChoproPlugin;
    protected _name: string;

    /**
     * Creates a new SettingsTabPage instance.
     */
    constructor(plugin: ChoproPlugin, name: string) {
        this.plugin = plugin;
        this._name = name;
    }

    /**
     * Gets the tab page ID.
     * @returns The tab page ID string.
     */
    get id(): string {
        return this._name.toLowerCase().replace(/\s+/g, "-");
    }

    /**
     * Gets the tab page name.
     * @returns The tab page name string.
     */
    get name(): string {
        return this._name;
    }

    abstract display(containerEl: HTMLElement): void;
}

class DisplaySettings extends SettingsTabPage {
    constructor(plugin: ChoproPlugin) {
        super(plugin, "Display");
    }

    display(containerEl: HTMLElement): void {
        new ChordColor(this.plugin).display(containerEl);
        new ChordSize(this.plugin).display(containerEl);
        new SuperscriptChordMods(this.plugin).display(containerEl);
        new ChordDecorations(this.plugin).display(containerEl);
        new NormalizedChordDisplay(this.plugin).display(containerEl);
        new ItalicAnnotations(this.plugin).display(containerEl);

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
    constructor(plugin: ChoproPlugin) {
        super(plugin, "Flow");
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
    constructor(plugin: ChoproPlugin) {
        super(plugin, "Advanced");
    }

    display(containerEl: HTMLElement): void {
        new LogLevelSetting(this.plugin).display(containerEl);
    }
}

export class ChoproSettingTab extends PluginSettingTab {
    private tabs: SettingsTabPage[];

    constructor(app: App, plugin: ChoproPlugin) {
        super(app, plugin);

        this.tabs = [
            new DisplaySettings(plugin),
            new FlowSettings(plugin),
            new AdvancedSettings(plugin),
        ];
    }

    /**
     * Displays the settings tab UI.
     */
    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const tabContainer = containerEl.createEl("div", {
            cls: "chopro-settings-tab-container",
        });

        const tabContentDiv = containerEl.createEl("div");

        this.tabs.forEach((tab) => {
            const tabEl = tabContainer.createEl("button", {
                text: tab.name,
                cls: "chopro-settings-tab-button",
            });

            tabEl.addEventListener("click", () => {
                tabContentDiv.empty();

                this.tabs.forEach((jtab) => {
                    jtab.isActive = jtab.id === tab.id;
                });

                this.updateTabButtonStyles(tabContainer);

                tab.display(tabContentDiv);
            });
        });

        // show the first tab to start off
        this.tabs[0].isActive = true;
        this.tabs[0].display(tabContentDiv);

        this.updateTabButtonStyles(tabContainer);
    }

    /**
     * Updates the styles for the tab buttons.
     */
    private updateTabButtonStyles(tabContainer: HTMLElement): void {
        const tabButtons = tabContainer.querySelectorAll(".chopro-settings-tab-button");

        tabButtons.forEach((button, index) => {
            const tab = this.tabs[index];
            if (tab && tab.isActive) {
                button.addClass("chopro-settings-tab-button-active");
            } else {
                button.removeClass("chopro-settings-tab-button-active");
            }
        });
    }
}
