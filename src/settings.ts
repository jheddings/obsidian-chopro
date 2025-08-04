import { PluginSettingTab, App, Setting } from "obsidian";
import { ChoproBlock } from "./parser";
import { LogLevel } from "./logger";
import ChoproPlugin from "./main";

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
        new Setting(containerEl)
            .setName("Chord color")
            .setDesc("Color for chord text (CSS color value)")
            .addText((text) =>
                text
                    .setPlaceholder("#2563eb")
                    .setValue(this.plugin.settings.chordColor)
                    .onChange(async (value) => {
                        this.plugin.settings.chordColor = value;
                        updatePreview();
                    })
            );

        new Setting(containerEl)
            .setName("Chord size")
            .setDesc("Font size for chord text (relative to base font)")
            .addSlider((slider) =>
                slider
                    .setLimits(0.5, 2.0, 0.05)
                    .setValue(this.plugin.settings.chordSize)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.chordSize = value;
                        updatePreview();
                    })
            );

        new Setting(containerEl)
            .setName("Superscript chord modifiers")
            .setDesc("Display chord modifiers (7, maj7, sus4, etc.) as superscript")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.superscriptChordMods)
                    .onChange(async (value) => {
                        this.plugin.settings.superscriptChordMods = value;
                        updatePreview();
                    })
            );

        new Setting(containerEl)
            .setName("Chord decorations")
            .setDesc("Wrap chords with bracket pairs for emphasis")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("none", "None")
                    .addOption("square", "[ ]")
                    .addOption("round", "( )")
                    .addOption("curly", "{ }")
                    .addOption("angle", "< >")
                    .setValue(this.plugin.settings.chordDecorations)
                    .onChange(async (value) => {
                        this.plugin.settings.chordDecorations = value;
                        updatePreview();
                    })
            );

        new Setting(containerEl)
            .setName("Normalized chord display")
            .setDesc("Use normalized chord representations (F# → F♯, Bb → B♭)")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.normalizedChordDisplay)
                    .onChange(async (value) => {
                        this.plugin.settings.normalizedChordDisplay = value;
                        updatePreview();
                    })
            );

        new Setting(containerEl)
            .setName("Italic annotations")
            .setDesc("Display inline annotations in italics")
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.italicAnnotations).onChange(async (value) => {
                    this.plugin.settings.italicAnnotations = value;
                    updatePreview();
                })
            );

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
            this.plugin.renderer.renderBlock(block, preview);
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
        new Setting(containerEl)
            .setName("Song folder")
            .setDesc("Folder to search for song files (leave empty for all files)")
            .addText((text) =>
                text
                    .setPlaceholder("folder/path")
                    .setValue(this.plugin.settings.flowFilesFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.flowFilesFolder = value;
                        this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Blank line")
            .setDesc("Add a blank line after each flow item")
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.flowExtraLine).onChange(async (value) => {
                    this.plugin.settings.flowExtraLine = value;
                })
            );
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
        new Setting(containerEl)
            .setName("Log level")
            .setDesc("Set the logging level for console output")
            .addDropdown((dropdown) => {
                dropdown.addOption(LogLevel.ERROR.toString(), "Error");
                dropdown.addOption(LogLevel.WARN.toString(), "Warning");
                dropdown.addOption(LogLevel.INFO.toString(), "Info");
                dropdown.addOption(LogLevel.DEBUG.toString(), "Debug");
                dropdown.setValue(this.plugin.settings.logLevel.toString());
                dropdown.onChange(async (value) => {
                    this.plugin.settings.logLevel = parseInt(value) as LogLevel;
                    await this.plugin.saveSettings();
                });
            });
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
