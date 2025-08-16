// flow - flow content processing for the ChordPro Plugin

import { App, TFile, Plugin } from "obsidian";
import { FlowSettings } from "./config";
import { Logger } from "./logger";

/**
 * Represents a flow item that will be resolved when rendered.
 */
export abstract class FlowItem {
    content: string;

    constructor(content: string) {
        this.content = content;
    }

    abstract resolve(app: App, resolver: FlowContentResolver): Promise<string>;
}

/**
 * A simple text item that returns its content as-is.
 */
export class TextFlowItem extends FlowItem {
    constructor(content: string) {
        super(content);
    }

    async resolve(): Promise<string> {
        return this.content;
    }
}

/**
 * An embed item that resolves to file or section content.
 */
export class EmbedFlowItem extends FlowItem {
    filePath?: string;
    section?: string;

    constructor(content: string, filePath?: string, section?: string) {
        super(content);
        this.filePath = filePath;
        this.section = section;
    }

    async resolve(app: App, resolver: FlowContentResolver): Promise<string> {
        return resolver.resolveEmbedContent(this, app);
    }

    getCacheKey(): string {
        return `${this.filePath}${this.section ? "#" + this.section : ""}`;
    }
}

/**
 * Represents the complete flow configuration from frontmatter
 */
export interface FlowDefinition {
    items: FlowItem[];
    sourceFile: TFile;
}

/**
 * Core flow parser - responsible for parsing frontmatter flow data into structured items
 */
export class FlowParser {
    private app: App;
    private logger: Logger;

    constructor(app: App) {
        this.app = app;
        this.logger = Logger.getLogger("FlowParser");
    }

    /**
     * Parse flow definition from a file's frontmatter
     */
    parseFlowDefinition(file: TFile): FlowDefinition | null {
        const fileCache = this.app.metadataCache.getFileCache(file);
        const flowData = fileCache?.frontmatter?.flow;

        if (!flowData || !Array.isArray(flowData)) {
            return null;
        }

        const items: FlowItem[] = flowData.map((item) => this.parseFlowItem(item, file));

        return {
            items,
            sourceFile: file,
        };
    }

    /**
     * Parse a single flow item string into a structured FlowItem
     */
    private parseFlowItem(item: string, sourceFile: TFile): FlowItem {
        // Check for embed pattern: ![[...]]
        const embedMatch = item.match(/^!\[\[([^\]]+)\]\]$/);

        if (!embedMatch) {
            return new TextFlowItem(item);
        }

        const embedRef = embedMatch[1];

        // Local section reference: ![[#Section]]
        if (embedRef.startsWith("#")) {
            return new EmbedFlowItem(item, sourceFile.path, embedRef.substring(1));
        }

        // File with section: ![[filename#section]]
        const fileSectionMatch = embedRef.match(/^([^#]+)#(.+)$/);
        if (fileSectionMatch) {
            const fileName = fileSectionMatch[1];
            const targetFile = this.app.metadataCache.getFirstLinkpathDest(
                fileName,
                sourceFile.path
            );

            return new EmbedFlowItem(
                item,
                targetFile?.path || fileName, // fallback to filename if not found
                fileSectionMatch[2]
            );
        }

        // Simple file reference: ![[filename]]
        const targetFile = this.app.metadataCache.getFirstLinkpathDest(embedRef, sourceFile.path);

        return new EmbedFlowItem(
            item,
            targetFile?.path || embedRef // fallback to ref if not found
        );
    }
}

/**
 * Content resolver - responsible for resolving embed references to actual content
 */
export class FlowContentResolver {
    private app: App;
    private logger: Logger;
    private contentCache: Map<string, string> = new Map();

    constructor(app: App) {
        this.app = app;
        this.logger = Logger.getLogger("FlowContentResolver");
    }

    /**
     * Resolve a flow item to its actual content
     */
    async resolveFlowItem(item: FlowItem): Promise<string> {
        return item.resolve(this.app, this);
    }

    /**
     * Resolve an embed item to its content (public method for EmbedFlowItem)
     */
    async resolveEmbedContent(item: EmbedFlowItem, app: App): Promise<string> {
        const cacheKey = item.getCacheKey();

        if (this.contentCache.has(cacheKey)) {
            return this.contentCache.get(cacheKey)!;
        }

        const content = await this.doResolveEmbedContent(item, app);
        this.contentCache.set(cacheKey, content);

        return content;
    }

    /**
     * Internal method to resolve embed content
     */
    private async doResolveEmbedContent(item: EmbedFlowItem, app: App): Promise<string> {
        if (!item.filePath) {
            return `> [!error] Invalid embed: ${item.content}`;
        }

        const file = app.vault.getAbstractFileByPath(item.filePath);
        if (!file || !(file instanceof TFile)) {
            this.logger.warn(`Could not find file: ${item.filePath}`);
            return `> [!warning] Could not find file: ${item.filePath}`;
        }

        try {
            if (item.section) {
                return await this.extractSectionContent(file, item.section);
            } else {
                const content = await app.vault.read(file);
                return content.trim();
            }
        } catch (error) {
            this.logger.error(`Error reading ${item.filePath}:`, error);
            return `> [!error] Error reading file: ${item.filePath}`;
        }
    }

    /**
     * Extract content from a specific section of a file
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
     * Clear the content cache
     */
    clearCache(): void {
        this.contentCache.clear();
    }
}

/**
 * Command handler for inserting flow content as embed links into editor
 */
export class FlowCommandHandler {
    private parser: FlowParser;
    private settings: FlowSettings;
    private logger: Logger;

    constructor(parser: FlowParser, settings: FlowSettings) {
        this.parser = parser;
        this.settings = settings;
        this.logger = Logger.getLogger("FlowCommandHandler");
    }

    /**
     * Generate flow content as embed links for insertion into editor
     */
    async generateEmbedLinks(file: TFile): Promise<string> {
        const flowDef = this.parser.parseFlowDefinition(file);

        if (!flowDef) {
            throw new Error("Selected file has no flow definition");
        }

        const lines = flowDef.items.map((item) => {
            if (item instanceof TextFlowItem) {
                return item.content;
            }

            if (item instanceof EmbedFlowItem) {
                // Convert local section refs to full file refs
                if (item.filePath === file.path && item.section) {
                    return `![[${file.path}#${item.section}]]`;
                }
                return item.content;
            }

            return item.content;
        });

        const separator = this.settings.extraLine ? "\n\n" : "\n";
        return lines.join(separator);
    }
}

/**
 * Callout renderer for generating complete resolved markdown content
 */
export class FlowCalloutRenderer {
    private app: App;
    private parser: FlowParser;
    private resolver: FlowContentResolver;
    private settings: FlowSettings;
    private logger: Logger;

    constructor(
        app: App,
        parser: FlowParser,
        resolver: FlowContentResolver,
        settings: FlowSettings
    ) {
        this.app = app;
        this.parser = parser;
        this.resolver = resolver;
        this.settings = settings;
        this.logger = Logger.getLogger("FlowCalloutRenderer");
    }

    /**
     * Generate complete resolved markdown content for callout rendering
     */
    async generateResolvedMarkdown(file: TFile): Promise<string> {
        const flowDef = this.parser.parseFlowDefinition(file);

        if (!flowDef) {
            // No flow definition, return the original file content
            return await this.getFileWithFrontmatter(file);
        }

        const resolvedItems = await Promise.all(
            flowDef.items.map((item) => this.resolver.resolveFlowItem(item))
        );

        // Combine frontmatter + resolved content
        const frontmatter = await this.getFrontmatter(file);
        const separator = this.settings.extraLine ? "\n\n" : "\n";
        const content = resolvedItems.join(separator);

        return frontmatter ? `${frontmatter}\n\n${content}` : content;
    }

    /**
     * Get the frontmatter section of a file
     */
    private async getFrontmatter(file: TFile): Promise<string | null> {
        const content = await this.app.vault.read(file);
        const frontmatterMatch = content.match(/^---\n([\s\S]*?\n)---\n/);
        return frontmatterMatch ? frontmatterMatch[0] : null;
    }

    /**
     * Get the complete file content including frontmatter
     */
    private async getFileWithFrontmatter(file: TFile): Promise<string> {
        return await this.app.vault.read(file);
    }
}

/**
 * Main flow manager - coordinates all flow operations
 */
export class FlowManager {
    private parser: FlowParser;
    private resolver: FlowContentResolver;
    private commandHandler: FlowCommandHandler;
    private calloutRenderer: FlowCalloutRenderer;

    constructor(plugin: Plugin, settings: FlowSettings) {
        this.parser = new FlowParser(plugin.app);
        this.resolver = new FlowContentResolver(plugin.app);
        this.commandHandler = new FlowCommandHandler(this.parser, settings);
        this.calloutRenderer = new FlowCalloutRenderer(
            plugin.app,
            this.parser,
            this.resolver,
            settings
        );
    }

    /**
     * Check if a file has flow definition
     */
    hasFlowDefinition(file: TFile): boolean {
        return this.parser.parseFlowDefinition(file) !== null;
    }

    /**
     * Get embed links for command usage (insert into editor)
     */
    async getEmbedLinks(file: TFile): Promise<string> {
        return this.commandHandler.generateEmbedLinks(file);
    }

    /**
     * Get resolved content for callout rendering
     */
    async getResolvedContent(file: TFile): Promise<string> {
        return this.calloutRenderer.generateResolvedMarkdown(file);
    }

    /**
     * Clear any cached content
     */
    clearCache(): void {
        this.resolver.clearCache();
    }
}

// Legacy compatibility - keep the old FlowGenerator class for gradual migration
export class FlowGenerator {
    private flowManager: FlowManager;
    private logger: Logger;

    constructor(plugin: Plugin, settings: FlowSettings) {
        this.flowManager = new FlowManager(plugin, settings);
        this.logger = Logger.getLogger("FlowGenerator");
    }

    /**
     * @deprecated Use FlowManager.getEmbedLinks() instead
     */
    async insertFlowFromFile(file: TFile, editor: any): Promise<void> {
        try {
            const insertText = await this.flowManager.getEmbedLinks(file);
            editor.replaceSelection(insertText.trim());
            // Note: Removed Notice dependency to keep this file focused
        } catch (error) {
            console.error("Error processing flow file:", error);
            throw error;
        }
    }

    /**
     * @deprecated Use FlowManager.getEmbedLinks() or FlowManager.getResolvedContent() instead
     */
    async generateFlowMarkdown(file: TFile, resolveEmbeds: boolean = false): Promise<string> {
        if (resolveEmbeds) {
            return this.flowManager.getResolvedContent(file);
        } else {
            return this.flowManager.getEmbedLinks(file);
        }
    }
}
