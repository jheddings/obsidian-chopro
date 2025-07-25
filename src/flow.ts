// flow - Flow content processing for ChoPro Obsidian Plugin

import { App, Editor, TFile, Notice, FuzzySuggestModal } from "obsidian";

import { ChoproPluginSettings } from "./main";

export class FlowGenerator {
    private app: App;
    private settings: ChoproPluginSettings;

    constructor(app: App, settings: ChoproPluginSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * Opens a file selector modal for choosing flow files
     */
    async openFlowFileSelector(editor: Editor): Promise<void> {
        const modal = new FlowFileSelector(
            this.app,
            this.settings.flowFilesFolder,
            async (file) => {
                await this.insertFlowFromFile(file, editor);
            }
        );
        modal.open();
    }

    /**
     * Inserts flow content from a selected file into the editor
     */
    async insertFlowFromFile(file: TFile, editor: Editor): Promise<void> {
        try {
            const fileCache = this.app.metadataCache.getFileCache(file);
            const flow = fileCache?.frontmatter?.flow;

            if (!flow) {
                new Notice("Selected file has no flow");
                return;
            }

            if (typeof flow === "string") {
                editor.replaceSelection(flow);
                new Notice("Flow content inserted");
            } else if (Array.isArray(flow)) {
                const insertText = this.processFlowArray(flow, file);
                editor.replaceSelection(insertText.trim());
                new Notice("Processed flow content");
            } else {
                new Notice("Flow property must be a string or array");
            }
        } catch (error) {
            console.error("Error processing flow file:", error);
            new Notice("Error processing flow file");
        }
    }

    /**
     * Processes an array of flow items into formatted text
     */
    private processFlowArray(flow: string[], file: TFile): string {
        let insertText = "";

        for (const item of flow) {
            if (typeof item === "string") {
                if (item.startsWith("#")) {
                    // Section reference - create transclusion
                    insertText += `![[${file.basename}${item}]]\n`;
                } else {
                    // Markdown content
                    insertText += `${item}\n`;
                }
            }
        }

        return insertText;
    }
}

/**
 * Modal for selecting flow files from the vault
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
