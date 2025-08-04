// main - ChoPro Obsidian Plugin

import {
    Plugin,
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
import { FlowGenerator } from "./flow";
import { ChordLineConverter } from "./convert";
import { ChoproTransposer, TransposeOptions, TransposeUtils } from "./transpose";
import { ChoproPluginSettings } from "./config";
import { ChoproSettingTab } from "./settings";
import { Logger, LogLevel } from "./logger";

const DEFAULT_SETTINGS: ChoproPluginSettings = {
    chordColor: "#2563eb", // blue
    chordSize: 1.0,
    superscriptChordMods: false,
    chordDecorations: "none",
    normalizedChordDisplay: false,
    italicAnnotations: true,
    flowFilesFolder: "",
    flowExtraLine: true,
    logLevel: LogLevel.ERROR,
};

export default class ChoproPlugin extends Plugin {
    settings: ChoproPluginSettings;
    renderer: ChoproRenderer;

    private logger: Logger = Logger.getLogger("main");

    async onload() {
        this.logger.debug("Initializing plugin");

        await this.loadSettings();

        this.registerMarkdownCodeBlockProcessor("chopro", (source, el, _ctx) => {
            this.processChoproBlock(source, el);
        });

        this.addCommand({
            id: "chopro-transpose",
            name: "Transpose chords in current file",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.openTransposeModal(view);
            },
        });

        this.addCommand({
            id: "chopro-insert-flow",
            name: "Insert flow content from file",
            editorCallback: (editor: Editor, _view: MarkdownView) => {
                this.openFlowFileSelector(editor);
            },
        });

        this.addCommand({
            id: "chopro-convert-chord-over-lyrics",
            name: "Convert chord-over-lyrics to bracketed chords",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.convertChordOverLyrics(view);
            },
        });

        this.addSettingTab(new ChoproSettingTab(this.app, this));

        this.logger.info("Plugin loaded");
    }

    onunload(): void {
        ChoproStyleManager.removeStyles();

        this.logger.info("Plugin unloaded");
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.applySettings();
        this.logger.debug("Settings loaded");
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        this.applySettings();
        this.logger.debug("Settings saved");
    }

    private applySettings(): void {
        Logger.setGlobalLogLevel(this.settings.logLevel);

        this.renderer = new ChoproRenderer(this.settings);

        ChoproStyleManager.applyStyles(this.settings);
    }

    private async openTransposeModal(activeView: MarkdownView): Promise<void> {
        const file = activeView.file;

        if (!file) {
            new Notice("No file is currently open");
            this.logger.warn("No file is currently open for transposition");
            return;
        }

        const content = await this.app.vault.read(file);
        const song = ChoproFile.parse(content);
        const detectedKey = TransposeUtils.detectKey(song);
        const currentKey = detectedKey ? detectedKey.toString() : "C";

        const modal = new TransposeModal(this.app, currentKey, async (options) => {
            this.logger.info(
                `Transposing ${file.basename} from ${options.fromKey} to ${options.toKey}`
            );

            const transposer = new ChoproTransposer({
                fromKey: options.fromKey,
                toKey: options.toKey,
            });

            try {
                transposer.transpose(song);
                const transposedContent = song.toString();
                await this.app.vault.modify(file, transposedContent);

                new Notice("File transposed successfully");
                this.logger.info(`File ${file.name} transposed successfully`);
            } catch (error) {
                new Notice("Error transposing file");
                this.logger.error("Transpose operation failed", error);
            }
        });

        modal.open();
    }

    private async openFlowFileSelector(editor: Editor) {
        const flowGenerator = new FlowGenerator(this.app, this.settings);
        await flowGenerator.openFlowFileSelector(editor);
    }

    processChoproBlock(source: string, el: HTMLElement): void {
        this.logger.debug(`Processing ChoPro block with ${source.length} characters`);

        try {
            el.empty();

            const container = el.createDiv({ cls: "chopro-container" });
            const block = ChoproBlock.parseRaw(source);
            this.renderer.renderBlock(block, container);

            this.logger.debug("ChoPro block rendered successfully");
        } catch (error) {
            this.logger.error("Failed to process ChoPro block", error);
            el.empty();
            el.createDiv({
                cls: "chopro-error",
                text: "Error parsing ChoPro content",
            });
        }
    }

    async convertChordOverLyrics(view: MarkdownView): Promise<void> {
        this.logger.debug("Starting chord-over-lyrics conversion");

        const file = view.file;

        if (!file) {
            this.logger.warn("No file is currently open for conversion");
            new Notice("No file is currently open");
            return;
        }

        this.logger.debug(`Loading file content for conversion: ${file.name}`);
        const content = await this.app.vault.read(file);
        const choproFile = ChoproFile.parse(content);

        this.logger.debug("Parsing completed, starting conversion");
        const converter = new ChordLineConverter();
        const changed = converter.convert(choproFile);

        if (changed) {
            this.logger.info(`Chord-over-lyrics conversion applied to file: ${file.name}`);
            const convertedContent = choproFile.toString();
            await this.app.vault.modify(file, convertedContent);
            new Notice("Converted chord-over-lyrics format successfully");
        } else {
            this.logger.debug(`No chord-over-lyrics format found in file: ${file.name}`);
            new Notice("No chord-over-lyrics format found to convert");
        }
    }
}

class TransposeModal extends Modal {
    private fromKey: string | null = null;
    private toKey: string = "C";
    private chordType: string = "alpha";
    private logger: Logger = Logger.getLogger("TransposeModal");
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
                TransposeUtils.getAllKeys().forEach((key) => dropdown.addOption(key, key));
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
                            targetKeySetting.setDesc("Not applicable for the selected chord type");
                        } else {
                            this.toKey = this.fromKey || "C";
                            targetKeyDropdown.setDisabled(false);
                            targetKeySetting.setDesc("Choose the key to transpose to");
                        }
                    })
            );

        let targetKeyDropdown: any;
        const targetKeySetting = new Setting(contentEl)
            .setName("Target Key")
            .setDesc("Choose the key to transpose to")
            .addDropdown((dropdown) => {
                targetKeyDropdown = dropdown;
                TransposeUtils.getAllKeys().forEach((key) => dropdown.addOption(key, key));
                dropdown.setValue(this.toKey);
                dropdown.onChange((value) => {
                    this.toKey = value;
                });
            });

        if (this.chordType !== "alpha") {
            targetKeyDropdown.setDisabled(true);
            targetKeySetting.setDesc("Not applicable for the selected chord type");
        }

        const buttonContainer = contentEl.createDiv({
            cls: "chopro-modal-button-container",
        });

        new ButtonComponent(buttonContainer).setButtonText("Cancel").onClick(() => this.close());

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
                    this.logger.error("Transpose validation error:", error);
                    new Notice("Invalid transposition parameters");
                }
            });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
