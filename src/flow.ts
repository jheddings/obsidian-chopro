// flow - flow content processing for the ChordPro Plugin

import { App, Editor, TFile, Notice, Plugin } from "obsidian";

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
            const localWikiLinkMatch = item.match(/^!\[\[#([^\]]+)\]\]$/);
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
