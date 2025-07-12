// main - ChoPro Obsidian Plugin

import {
    Plugin,
    PluginSettingTab,
    Setting,
    App,
    Notice,
    MarkdownView,
    Modal,
    ButtonComponent,
    Editor,
} from "obsidian";

import { ChoproFile } from "./parser";
import { ChoproRenderer } from "./render";
import { ChoproBlock } from "./parser";
import { ChoproStyleManager } from "./styles";

import {
    ChoproTransposer,
    TransposeOptions,
    TransposeUtils,
} from "./transpose";

import {
    KeyInfo,
} from "./music";

export interface ChoproPluginSettings {
    chordColor: string;
    chordSize: number;
    superscriptChordMods: boolean;
    chordDecorations: string;
    normalizedChordDisplay: boolean;
    italicAnnotations: boolean;
}

const DEFAULT_SETTINGS: ChoproPluginSettings = {
    chordColor: "#2563eb", // blue
    chordSize: 1.0,
    superscriptChordMods: false,
    chordDecorations: "none",
    normalizedChordDisplay: false,
    italicAnnotations: true,
};

export default class ChoproPlugin extends Plugin {
    settings: ChoproPluginSettings;
    renderer: ChoproRenderer;

    async onload() {
        await this.loadSettings();

        this.renderer = new ChoproRenderer(this.settings);

        this.registerMarkdownCodeBlockProcessor("chopro", (source, el, ctx) => {
            this.processChoproBlock(source, el);
        });

        this.addCommand({
            id: "chopro-transpose",
            name: "Transpose chords in current file",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.openTransposeModal(view);
            },
        });

        this.addSettingTab(new ChoproSettingTab(this.app, this));

        ChoproStyleManager.applyStyles(this.settings);
    }

    private async openTransposeModal(activeView: MarkdownView): Promise<void> {
        const file = activeView.file;

        if (!file) {
            new Notice("No file is currently open");
            return;
        }

        const content = await this.app.vault.read(file);
        const song = ChoproFile.parse(content);
        const detectedKey = TransposeUtils.detectKey(song);
        const currentKey = detectedKey ? detectedKey.toString() : "C";

        const modal = new TransposeModal(
            this.app,
            currentKey,
            async (options) => {
                const transposer = new ChoproTransposer({
                    fromKey: options.fromKey,
                    toKey: options.toKey,
                });

                try {
                    transposer.transpose(song);
                    const transposedContent = song.toString();
                    await this.app.vault.modify(file, transposedContent);
                    new Notice("File transposed successfully");
                } catch (error) {
                    console.error("Transpose error:", error);
                    new Notice("Error transposing file");
                }
            }
        );

        modal.open();
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);

        // Update the renderer with new settings instead of creating new instance
        this.renderer.updateSettings(this.settings);

        // reapply the current styles
        ChoproStyleManager.applyStyles(this.settings);
    }

    processChoproBlock(source: string, el: HTMLElement): void {
        try {
            el.empty();

            const container = el.createDiv({ cls: "chopro-container" });
            const block = ChoproBlock.parse(source);
            this.renderer.renderBlock(block, container);
        } catch (error) {
            console.error('Failed to process ChoPro block:', error);
            el.empty();
            el.createDiv({ 
                cls: "chopro-error",
                text: "Error parsing ChoPro content" 
            });
        }
    }

    onunload(): void {
        ChoproStyleManager.removeStyles();
    }
}

class ChoproSettingTab extends PluginSettingTab {
    plugin: ChoproPlugin;

    constructor(app: App, plugin: ChoproPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl("h2", { text: "ChoPro Settings" });

        new Setting(containerEl)
            .setName("Chord Color")
            .setDesc("Color for chord text (CSS color value)")
            .addText((text) =>
                text
                    .setPlaceholder("#2563eb")
                    .setValue(this.plugin.settings.chordColor)
                    .onChange(async (value) => {
                        this.plugin.settings.chordColor =
                            value || DEFAULT_SETTINGS.chordColor;
                        updatePreview();
                    })
            );

        new Setting(containerEl)
            .setName("Chord Size")
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
            .setName("Superscript Chord Modifiers")
            .setDesc(
                "Display chord modifiers (7, maj7, sus4, etc.) as superscript"
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.superscriptChordMods)
                    .onChange(async (value) => {
                        this.plugin.settings.superscriptChordMods = value;
                        updatePreview();
                    })
            );

        new Setting(containerEl)
            .setName("Chord Decorators")
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
            .setName("Normalized Chord Display")
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
            .setName("Italic Annotations")
            .setDesc("Display inline annotations in italics")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.italicAnnotations)
                    .onChange(async (value) => {
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
            const block = ChoproBlock.parse(sample);
            this.plugin.renderer.renderBlock(block, preview);
        };

        // initial preview
        updatePreview();
    }
}

class TransposeModal extends Modal {
    private fromKey: string | null = null;
    private toKey: string = "C";
    private chordType: string = "alpha";
    private onConfirm: (options: TransposeOptions) => void;

    constructor(
        app: App,
        currentKey: string | null,
        onConfirm: (options: TransposeOptions) => void
    ) {
        super(app);
        this.fromKey = currentKey;
        this.toKey = currentKey || "C";
        this.onConfirm = onConfirm;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "Transpose ChoPro" });

        new Setting(contentEl)
            .setName("Current Key")
            .setDesc("Select the current key of the song")
            .addDropdown((dropdown) => {
                TransposeUtils.getAllKeys().forEach((key) =>
                    dropdown.addOption(key, key)
                );
                if (this.fromKey && TransposeUtils.isValidKey(this.fromKey)) {
                    dropdown.setValue(this.fromKey);
                }
                dropdown.onChange((value) => {
                    this.fromKey = value;
                });
            });

        new Setting(contentEl)
            .setName("Chord Type")
            .setDesc("Choose output format for chords")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("alpha", "Alpha (C, G, Am, etc.)")
                    .addOption("nashville", "Nashville Numbers (1, 5, 6m, etc.)")
                    .setValue(this.chordType)
                    .onChange((value) => {
                        this.chordType = value;
                        if (value === "nashville") {
                            this.toKey = "##";
                            targetKeyDropdown.setDisabled(true);
                            targetKeySetting.setDesc(
                                "Not applicable for the selected chord type"
                            );
                        } else {
                            this.toKey = this.fromKey || "C";
                            targetKeyDropdown.setDisabled(false);
                            targetKeySetting.setDesc(
                                "Choose the key to transpose to"
                            );
                        }
                    })
            );

        let targetKeyDropdown: any;
        const targetKeySetting = new Setting(contentEl)
            .setName("Target Key")
            .setDesc("Choose the key to transpose to")
            .addDropdown((dropdown) => {
                targetKeyDropdown = dropdown;
                TransposeUtils.getAllKeys().forEach((key) =>
                    dropdown.addOption(key, key)
                );
                dropdown.setValue(this.toKey);
                dropdown.onChange((value) => {
                    this.toKey = value;
                });
            });

        if (this.chordType !== "alpha") {
            targetKeyDropdown.setDisabled(true);
            targetKeySetting.setDesc(
                "Not applicable for the selected chord type"
            );
        }

        const buttonContainer = contentEl.createDiv({
            cls: "chopro-modal-button-container",
        });

        new ButtonComponent(buttonContainer)
            .setButtonText("Cancel")
            .onClick(() => this.close());

        new ButtonComponent(buttonContainer)
            .setButtonText("Transpose")
            .setCta()
            .onClick(() => {
                try {
                    if (this.chordType === "alpha" && !this.fromKey) {
                        new Notice("Cannot transpose without the current key.");
                        return;
                    }

                    const options: TransposeOptions = {
                        fromKey: this.fromKey ? TransposeUtils.parseKey(this.fromKey) : undefined,
                        toKey: TransposeUtils.parseKey(this.toKey),
                    };

                    this.onConfirm(options);
                    this.close();
                } catch (error) {
                    console.error('Transpose validation error:', error);
                    new Notice('Invalid transposition parameters');
                }
            });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
