// flow - flow content processing for the ChordPro Plugin

import { App, Editor, TFile, Notice, FuzzySuggestModal, Plugin } from "obsidian";

import { FlowSettings } from "./config";
import { Logger } from "./logger";

export class FlowGenerator {
    private app: App;
    private settings: FlowSettings;
    private logger: Logger;

    constructor(plugin: Plugin, settings: FlowSettings) {
        this.app = plugin.app;
        this.settings = settings;

        this.logger = Logger.getLogger("FlowGenerator");
    }

    /**
     * Opens a file selector modal for choosing flow files.
     */
    async openFlowFileSelector(editor: Editor): Promise<void> {
        const modal = new FlowFileSelector(this.app, this.settings.filesFolder, async (file) => {
            await this.insertFlowFromFile(file, editor);
        });
        modal.open();
    }

    /**
     * Inserts flow content from a selected file into the editor.
     */
    async insertFlowFromFile(file: TFile, editor: Editor): Promise<void> {
        try {
            const insertText = this.generateFlowMarkdown(file);
            editor.replaceSelection(insertText.trim());
            new Notice("Processed flow content");
        } catch (error) {
            console.error("Error processing flow file:", error);
            new Notice(error.message || "Error processing flow file");
        }
    }

    /**
     * Processes an array of flow items into markdown text.
     */
    generateFlowMarkdown(file: TFile): string {
        let flowLines = this.generateFlow(file);

        if (this.settings.extraLine) {
            return flowLines.join("\n\n");
        }

        return flowLines.join("\n");
    }

    /**
     * Processes flow content from a file, resolving local wikilinks.
     */
    generateFlow(file: TFile): string[] {
        const fileCache = this.app.metadataCache.getFileCache(file);
        const flow = fileCache?.frontmatter?.flow;

        if (!flow) {
            throw new Error("Selected file has no flow");
        }

        let flowLines: string[] = [];

        for (const item of flow) {
            this.logger.debug(`Processing flow item: ${item}`);

            // check for local wiki links (format: [[#Section]])
            const localWikiLinkMatch = item.match(/^\[\[#([^\]]+)\]\]$/);
            if (localWikiLinkMatch) {
                const sectionName = localWikiLinkMatch[1];
                flowLines.push(`![[${file.basename}#${sectionName}]]`);
            } else {
                flowLines.push(item);
            }
        }

        return flowLines;
    }
}

/**
 * Modal for selecting flow files from the vault.
 */
export class FlowFileSelector extends FuzzySuggestModal<TFile> {
    private onSelect: (file: TFile) => Promise<void>;
    private folderPath: string;

    constructor(app: App, folderPath: string, onSelect: (file: TFile) => Promise<void>) {
        super(app);
        this.onSelect = onSelect;
        this.folderPath = folderPath;
    }

    getItems(): TFile[] {
        let files = this.app.vault.getMarkdownFiles();

        if (this.folderPath && this.folderPath.trim() !== "") {
            files = files.filter(
                (file) =>
                    file.path.startsWith(this.folderPath + "/") || file.path === this.folderPath
            );
        }

        // Only include files that have a flow property in frontmatter
        return files.filter((file) => {
            const cache = this.app.metadataCache.getFileCache(file);
            return cache?.frontmatter?.flow !== undefined;
        });
    }

    onChooseItem(item: TFile, _evt: MouseEvent | KeyboardEvent): void {
        this.close();
        this.onSelect(item);
    }

    getItemText(item: TFile): string {
        return item.path;
    }
}
