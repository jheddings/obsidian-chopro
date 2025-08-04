// flow - Flow content processing for ChoPro Obsidian Plugin

import { App, Editor, TFile, Notice, FuzzySuggestModal } from "obsidian";

import { FlowSettings } from "./config";
import { Logger } from "./logger";
import { ChoproFile, ChoproBlock } from "./parser";
import { ChoproRenderer } from "./render";

export class FlowGenerator {
    private app: App;
    private settings: FlowSettings;
    private logger: Logger;

    constructor(app: App, settings: FlowSettings) {
        this.app = app;
        this.settings = settings;

        this.logger = Logger.getLogger("FlowGenerator");
    }

    /**
     * Opens a file selector modal for choosing flow files
     */
    async openFlowFileSelector(editor: Editor): Promise<void> {
        const modal = new FlowFileSelector(this.app, this.settings.filesFolder, async (file) => {
            await this.insertFlowFromFile(file, editor);
        });
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

        if (this.settings.extraLine) {
            return flowLines.join("\n\n");
        }

        return flowLines.join("\n");
    }

    /**
     * Renders flow content from a file's frontmatter to DOM elements
     */
    async renderFlowToDOM(
        container: HTMLElement,
        file: TFile,
        renderer: ChoproRenderer
    ): Promise<void> {
        const fileCache = this.app.metadataCache.getFileCache(file);
        const flow = fileCache?.frontmatter?.flow;

        if (!flow) {
            this.logger.warn(`No flow found in frontmatter for ${file.basename}`);
            return;
        }

        if (typeof flow === "string") {
            // Simple string flow - render that section as transclusion
            await this.renderTranscludedSection(container, file, flow, renderer);
        } else if (Array.isArray(flow)) {
            // Array flow - process each item
            await this.renderFlowArray(container, file, flow, renderer);
        } else {
            this.logger.warn("Flow property must be a string or array");
        }
    }

    /**
     * Renders an array of flow items to DOM elements
     */
    private async renderFlowArray(
        container: HTMLElement,
        file: TFile,
        flow: string[],
        renderer: ChoproRenderer
    ): Promise<void> {
        for (const item of flow) {
            const itemContainer = container.createDiv({ cls: "chopro-flow-item" });

            // Check for local wiki links (format: [[#Section]])
            const localWikiLinkMatch = item.match(/^\[\[#([^\]]+)\]\]$/);
            if (localWikiLinkMatch) {
                const sectionName = localWikiLinkMatch[1];
                // Render as transclusion - get the full section content
                await this.renderTranscludedSection(itemContainer, file, sectionName, renderer);
            } else if (item.startsWith(">")) {
                // Handle callout-style items (e.g., ">[!note] Key Change")
                itemContainer.innerHTML = item.substring(1); // Remove the leading '>'
                itemContainer.addClass("chopro-flow-callout");
            } else {
                // Handle other flow items as text
                itemContainer.createDiv({ text: item, cls: "chopro-flow-text" });
            }

            if (this.settings.extraLine) {
                container.createEl("br");
            }
        }
    }

    /**
     * Render a specific section from the file as transclusion - includes everything in the section
     */
    private async renderTranscludedSection(
        container: HTMLElement,
        file: TFile,
        sectionName: string,
        renderer: ChoproRenderer
    ): Promise<void> {
        try {
            // Find the section in the file content
            const fileContent = await this.app.vault.read(file);
            const sectionMatch = fileContent.match(
                new RegExp(
                    `## ${sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`,
                    "i"
                )
            );

            if (!sectionMatch) {
                this.logger.warn(`Section not found: ${sectionName}`);
                container.createDiv({
                    text: `Section not found: ${sectionName}`,
                    cls: "chopro-error",
                });
                return;
            }

            const sectionContent = sectionMatch[1].trim();

            // Process the entire section content like a transclusion
            // This includes all content types: ChoPro blocks, text, lists, etc.
            await this.renderSectionContent(container, sectionContent, renderer);
        } catch (error) {
            this.logger.error(`Error rendering section ${sectionName}`, error);
            container.createDiv({
                text: `Error rendering section: ${sectionName}`,
                cls: "chopro-error",
            });
        }
    }

    /**
     * Render section content, handling ChoPro blocks and other markdown content
     */
    private async renderSectionContent(
        container: HTMLElement,
        content: string,
        renderer: ChoproRenderer
    ): Promise<void> {
        // Split content by ChoPro code blocks to handle mixed content
        const parts = content.split(/(```chopro\n[\s\S]*?\n```)/);

        for (const part of parts) {
            const trimmedPart = part.trim();
            if (!trimmedPart) continue;

            // Check if this is a ChoPro code block
            const choproBlockMatch = trimmedPart.match(/^```chopro\n([\s\S]*?)\n```$/);
            if (choproBlockMatch) {
                // Render ChoPro content
                const choproContent = choproBlockMatch[1];
                const choproFile = ChoproFile.parse(choproContent);

                const choproContainer = container.createDiv({ cls: "chopro-transcluded-block" });
                for (const block of choproFile.blocks) {
                    if (block instanceof ChoproBlock) {
                        renderer.renderBlock(block, choproContainer);
                    }
                }
            } else {
                // Render as regular markdown/text content
                const textContainer = container.createDiv({ cls: "chopro-transcluded-text" });

                // Process line by line to handle different markdown elements
                const lines = trimmedPart.split("\n");
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) {
                        textContainer.createEl("br");
                        continue;
                    }

                    // Handle basic markdown formatting
                    if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
                        // List item
                        const listItem = textContainer.createEl("div", { cls: "chopro-list-item" });
                        listItem.textContent = trimmedLine.substring(2);
                    } else if (trimmedLine.startsWith("#")) {
                        // Heading (but skip since we're already in a section)
                        const heading = textContainer.createEl("div", { cls: "chopro-heading" });
                        heading.textContent = trimmedLine.replace(/^#+\s*/, "");
                    } else {
                        // Regular text line
                        const textLine = textContainer.createEl("div", { cls: "chopro-text-line" });
                        textLine.textContent = trimmedLine;
                    }
                }
            }
        }
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
