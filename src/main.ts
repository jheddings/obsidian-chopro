// main - ChoPro Obsidian Plugin

import { Plugin, Notice, MarkdownView, Editor } from "obsidian";

import { ChoproFile } from "./parser";
import { ContentRenderer } from "./render";
import { ChoproBlock } from "./parser";
import { ChoproStyleManager } from "./styles";
import { FlowGenerator } from "./flow";
import { ChordLineConverter } from "./convert";
import { ChoproTransposer, TransposeUtils } from "./transpose";
import { ChoproPluginSettings } from "./config";
import { ChoproSettingTab } from "./settings";
import { Logger, LogLevel } from "./logger";
import { CalloutProcessor } from "./callout";
import { FlowFileSelector, TransposeModal } from "./modals";

const DEFAULT_SETTINGS: ChoproPluginSettings = {
    rendering: {
        chordColor: "#2563eb", // blue
        chordSize: 1.0,
        superscriptChordMods: false,
        chordDecorations: "none",
        normalizedChordDisplay: false,
        italicAnnotations: true,
    },
    flow: {
        filesFolder: "",
        extraLine: true,
    },
    logLevel: LogLevel.ERROR,
};

export default class ChoproPlugin extends Plugin {
    settings: ChoproPluginSettings;
    renderer: ContentRenderer;
    flowGenerator: FlowGenerator;
    calloutProcessor: CalloutProcessor;

    private logger: Logger = Logger.getLogger("main");

    async onload() {
        this.logger.debug("Initializing plugin");

        await this.loadSettings();

        this.registerMarkdownCodeBlockProcessor("chopro", async (source, el, _ctx) => {
            await this.processChoproBlock(source, el);
        });

        this.registerMarkdownPostProcessor(async (el, ctx) => {
            await this.calloutProcessor.processCallouts(el, ctx);
        });

        this.addCommand({
            id: "chopro-transpose",
            name: "Transpose chords in current file",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.transposeActiveView(view);
            },
        });

        this.addCommand({
            id: "chopro-insert-flow",
            name: "Insert flow content from file",
            editorCallback: (editor: Editor, _view: MarkdownView) => {
                this.insertFlowContent(editor);
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

        this.renderer = new ContentRenderer(this.settings.rendering);
        this.flowGenerator = new FlowGenerator(this, this.settings.flow);
        this.calloutProcessor = new CalloutProcessor(this, this.flowGenerator);

        ChoproStyleManager.applyStyles(this.settings.rendering);
    }

    private async transposeActiveView(activeView: MarkdownView): Promise<void> {
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

    private async insertFlowContent(editor: Editor) {
        const modal = new FlowFileSelector(
            this.app,
            this.settings.flow.filesFolder,
            async (file) => {
                await this.flowGenerator.insertFlowFromFile(file, editor);
            }
        );

        modal.open();
    }

    async processChoproBlock(source: string, el: HTMLElement): Promise<void> {
        this.logger.debug(`Processing ChoPro block with ${source.length} characters`);

        el.empty();

        const container = el.createDiv({ cls: "chopro-container" });

        try {
            const block = ChoproBlock.parseRaw(source);
            this.renderer.renderChoproBlock(block, container);
            this.logger.debug("ChoPro block rendered successfully");
        } catch (error) {
            this.logger.error("Failed to process ChoPro block: ", error);
            el.empty();
            el.createDiv({ cls: "chopro-error", text: "Error parsing ChoPro content" });
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
