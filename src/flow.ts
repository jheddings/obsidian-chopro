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
     * This generates flow with embed links intact for Obsidian's transclusion system.
     */
    async insertFlowFromFile(file: TFile, editor: Editor): Promise<void> {
        try {
            const insertText = await this.generateFlowMarkdown(file, false);
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
    async generateFlowMarkdown(file: TFile, resolveEmbeds: boolean = false): Promise<string> {
        let flowLines: string[] = await this.generateFlow(file);

        if (resolveEmbeds) {
            flowLines = await Promise.all(
                flowLines.map((line) => this.resolveFlowItem(line, file))
            );
        }

        if (this.settings.extraLine) {
            return flowLines.join("\n\n");
        }

        return flowLines.join("\n");
    }

    /**
     * Processes flow content from a file.
     */
    async generateFlow(file: TFile): Promise<string[]> {
        const fileCache = this.app.metadataCache.getFileCache(file);
        const flow = fileCache?.frontmatter?.flow;

        if (!flow) {
            throw new Error("Selected file has no flow");
        }

        let flowLines: string[] = [];

        for (const item of flow) {
            this.logger.debug(`Processing flow item: ${item}`);

            // check for local embed links (format: ![[#Section]])
            const localEmbedLinkMatch = item.match(/^!\[\[#([^\]]+)\]\]$/);
            if (localEmbedLinkMatch) {
                const sectionName = localEmbedLinkMatch[1];
                flowLines.push(`![[${file.path}#${sectionName}]]`);
            } else {
                flowLines.push(item);
            }
        }

        return flowLines;
    }

    /**
     * Resolves a single flow item, either by extracting embedded content or keeping it as-is.
     */
    private async resolveFlowItem(item: string, sourceFile: TFile): Promise<string> {
        const embedMatch = item.match(/^!\[\[([^\]]+)\]\]$/);

        if (!embedMatch) {
            return item;
        }

        const embedRef = embedMatch[1];

        // Check if it's a local section reference (![[#Section]])
        if (embedRef.startsWith("#")) {
            const sectionName = embedRef.substring(1);
            return await this.extractSectionContent(sourceFile, sectionName);
        }

        // Check if it's a file with section reference (![[filename#section]])
        const fileSectionMatch = embedRef.match(/^([^#]+)#(.+)$/);
        if (fileSectionMatch) {
            const fileName = fileSectionMatch[1];
            const sectionName = fileSectionMatch[2];
            const targetFile = this.app.metadataCache.getFirstLinkpathDest(
                fileName,
                sourceFile.path
            );

            if (targetFile) {
                return await this.extractSectionContent(targetFile, sectionName);
            } else {
                this.logger.warn(`Could not find file: ${fileName}`);
                return `> [!warning] Could not find file: ${fileName}`;
            }
        }

        // It's a simple file reference (![[filename]])
        const targetFile = this.app.metadataCache.getFirstLinkpathDest(embedRef, sourceFile.path);
        if (targetFile) {
            return await this.extractFileContent(targetFile);
        } else {
            this.logger.warn(`Could not find file: ${embedRef}`);
            return `> [!warning] Could not find file: ${embedRef}`;
        }
    }

    /**
     * Extracts the content of a specific section from a file.
     */
    private async extractSectionContent(file: TFile, sectionName: string): Promise<string> {
        const fileContent = await this.app.vault.read(file);
        const fileCache = this.app.metadataCache.getFileCache(file);

        if (!fileCache?.headings) {
            this.logger.warn(`No headings found in file: ${file.name}`);
            return `> [!warning] No headings found in file: ${file.name}`;
        }

        const targetHeading = fileCache.headings.find(
            (heading) => heading.heading.toLowerCase() === sectionName.toLowerCase()
        );

        if (!targetHeading) {
            this.logger.warn(`Section "${sectionName}" not found in ${file.name}`);
            return `> [!warning] Section "${sectionName}" not found in ${file.name}`;
        }

        const nextHeading = fileCache.headings.find(
            (heading) =>
                heading.position.start.line > targetHeading.position.start.line &&
                heading.level <= targetHeading.level
        );

        const lines = fileContent.split("\n");
        const startLine = targetHeading.position.start.line;
        const endLine = nextHeading ? nextHeading.position.start.line - 1 : lines.length - 1;

        const sectionContent = lines
            .slice(startLine, endLine + 1)
            .join("\n")
            .trim();

        if (!sectionContent) {
            return `> [!info] Section "${sectionName}" is empty`;
        }

        return sectionContent;
    }

    /**
     * Extracts the entire content of a file.
     */
    private async extractFileContent(file: TFile): Promise<string> {
        try {
            const content = await this.app.vault.read(file);
            return content.trim();
        } catch (error) {
            this.logger.error(`Error reading file ${file.name}:`, error);
            return `> [!error] Error reading file: ${file.name}`;
        }
    }
}
