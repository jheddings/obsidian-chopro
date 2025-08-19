// flow.ts - flow content processing for the ChordPro Plugin

import { App, TFile, Plugin, stringifyYaml } from "obsidian";
import { FlowSettings } from "./config";
import { Logger } from "./logger";

/**
 * Represents a flow item that will be resolved when rendered.
 */
abstract class FlowItem {
    content: string;

    constructor(content: string) {
        this.content = content;
    }

    static parse(item: string, sourceFile: TFile, app: App): FlowItem {
        if (EmbedFlowItem.test(item)) {
            return EmbedFlowItem.parse(item, sourceFile, app);
        }

        return TextFlowItem.parse(item);
    }

    abstract resolve(): Promise<string>;
}

/**
 * A simple text item that returns its content as-is.
 */
class TextFlowItem extends FlowItem {
    constructor(content: string) {
        super(content);
    }

    static test(item: string): boolean {
        return !EmbedFlowItem.test(item);
    }

    static parse(item: string): TextFlowItem {
        return new TextFlowItem(item);
    }

    async resolve(): Promise<string> {
        return this.content;
    }
}

/**
 * Abstract base class for embed items that resolve to file or section content.
 */
abstract class EmbedFlowItem extends FlowItem {
    static EMBED_ITEM_PATTERN = /^!\[\[([^#\]]*)(#([^\]]+))?\]\]$/;

    protected targetFile: TFile;
    protected sectionName?: string;

    private app: App;
    private logger: Logger;

    constructor(content: string, app: App, targetFile: TFile, section?: string) {
        super(content);

        this.app = app;
        this.targetFile = targetFile;
        this.sectionName = section;

        this.logger = Logger.getLogger("EmbedFlowItem");
    }

    get link(): string {
        let link = this.targetFile.path;

        if (this.sectionName) {
            link += `#${this.sectionName}`;
        }

        return `![[${link}]]`;
    }

    get file(): TFile {
        return this.targetFile;
    }

    get section(): string | undefined {
        return this.sectionName;
    }

    static test(item: string): boolean {
        return EmbedFlowItem.EMBED_ITEM_PATTERN.test(item);
    }

    static parse(item: string, sourceFile: TFile, app: App): EmbedFlowItem {
        if (EmbedLocalSectionFlowItem.test(item)) {
            return EmbedLocalSectionFlowItem.parse(item, sourceFile, app);
        }

        if (EmbedFileSectionFlowItem.test(item)) {
            return EmbedFileSectionFlowItem.parse(item, sourceFile, app);
        }

        if (EmbedFileFlowItem.test(item)) {
            return EmbedFileFlowItem.parse(item, sourceFile, app);
        }

        throw new Error("Invalid embed format");
    }

    /**
     * Resolve an embed item to its content (implementation for EmbedFlowItem)
     */
    async resolve(): Promise<string> {
        if (!this.targetFile) {
            return `> [!error] Invalid embed\n> ${this.content}`;
        }

        let content: string;

        try {
            if (this.sectionName) {
                content = await this.extractSectionContent(this.targetFile, this.sectionName);
            } else {
                content = await this.app.vault.read(this.targetFile);
            }
        } catch (error) {
            this.logger.error(`Error reading ${this.targetFile.path}:`, error);
            return `> [!error] Error reading file\n> ${this.targetFile.path}`;
        }

        return content.trim();
    }

    /**
     * Extract content from a specific section of a file
     */
    private async extractSectionContent(file: TFile, sectionName: string): Promise<string> {
        const fileContent = await this.app.vault.read(file);
        const fileCache = this.app.metadataCache.getFileCache(file);

        if (!fileCache?.headings) {
            this.logger.warn(`No headings found in file: ${file.name}`);
            return `> [!warning] No headings found\n> ${file.name}`;
        }

        const targetHeading = fileCache.headings.find(
            (heading) => heading.heading.toLowerCase() === sectionName.toLowerCase()
        );

        if (!targetHeading) {
            this.logger.warn(`Section "${sectionName}" not found in ${file.name}`);
            return `> [!warning] Section "${sectionName}" not found\n> ${file.name}`;
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
}

/**
 * Embed item for local section references: ![[#Section]]
 */
class EmbedLocalSectionFlowItem extends EmbedFlowItem {
    static test(item: string): boolean {
        const embedMatch = item.match(EmbedFlowItem.EMBED_ITEM_PATTERN);

        if (!embedMatch) {
            return false;
        }

        const filePart = embedMatch[1];
        const sectionPart = embedMatch[3];

        // file part should be empty and section should exist
        return !filePart && !!sectionPart;
    }

    static parse(item: string, sourceFile: TFile, app: App): EmbedLocalSectionFlowItem {
        const embedMatch = item.match(EmbedFlowItem.EMBED_ITEM_PATTERN);

        if (!embedMatch) {
            throw new Error("Invalid embed format");
        }

        const sectionName = embedMatch[3];

        if (!sectionName) {
            throw new Error("Not a local section reference");
        }

        return new EmbedLocalSectionFlowItem(item, app, sourceFile, sectionName);
    }
}

/**
 * Embed item for simple file references: ![[filename]]
 */
class EmbedFileFlowItem extends EmbedFlowItem {
    static test(item: string): boolean {
        const embedMatch = item.match(EmbedFlowItem.EMBED_ITEM_PATTERN);

        if (!embedMatch) {
            return false;
        }

        const filePart = embedMatch[1];
        const sectionPart = embedMatch[3];

        // file part should exist but section part should not
        return !!filePart && !sectionPart;
    }

    static parse(item: string, sourceFile: TFile, app: App): EmbedFileFlowItem {
        const embedMatch = item.match(EmbedFlowItem.EMBED_ITEM_PATTERN);

        if (!embedMatch) {
            throw new Error("Invalid embed format");
        }

        const fileName = embedMatch[1];

        if (!fileName || embedMatch[3]) {
            throw new Error("Not a simple file reference");
        }

        const targetFile = app.metadataCache.getFirstLinkpathDest(fileName, sourceFile.path);

        if (!targetFile) {
            throw new Error(`File not found: ${fileName}`);
        }

        return new EmbedFileFlowItem(item, app, targetFile);
    }
}

/**
 * Embed item for file with section references: ![[filename#section]]
 */
class EmbedFileSectionFlowItem extends EmbedFlowItem {
    static test(item: string): boolean {
        const embedMatch = item.match(EmbedFlowItem.EMBED_ITEM_PATTERN);

        if (!embedMatch) {
            return false;
        }

        const filePart = embedMatch[1];
        const sectionPart = embedMatch[3];

        // both file part and section part should exist
        return !!filePart && !!sectionPart;
    }

    static parse(item: string, sourceFile: TFile, app: App): EmbedFileSectionFlowItem {
        const embedMatch = item.match(EmbedFlowItem.EMBED_ITEM_PATTERN);

        if (!embedMatch) {
            throw new Error("Invalid embed format");
        }

        const fileName = embedMatch[1];
        const sectionName = embedMatch[3];

        if (!fileName || !sectionName) {
            throw new Error("Not a file section reference");
        }

        const targetFile = app.metadataCache.getFirstLinkpathDest(fileName, sourceFile.path);

        if (!targetFile) {
            throw new Error(`File not found: ${fileName}`);
        }

        return new EmbedFileSectionFlowItem(item, app, targetFile, sectionName);
    }
}

/**
 * Represents the complete flow configuration from frontmatter
 */
interface FlowDefinition {
    items: FlowItem[];
    sourceFile: TFile;
}

/**
 * Core flow parser - responsible for parsing frontmatter flow data into structured items
 */
class FlowParser {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Parse flow definition from a file's frontmatter
     */
    parseFlow(file: TFile): FlowDefinition | null {
        const fileCache = this.app.metadataCache.getFileCache(file);
        const flowData = fileCache?.frontmatter?.flow;

        if (!flowData || !Array.isArray(flowData)) {
            return null;
        }

        const items: FlowItem[] = flowData.map((item) => {
            return FlowItem.parse(item, file, this.app);
        });

        return { items, sourceFile: file };
    }
}

/**
 * Command handler for inserting flow content as embed links into editor
 */
class FlowCommandHandler {
    private parser: FlowParser;
    private settings: FlowSettings;

    constructor(parser: FlowParser, settings: FlowSettings) {
        this.parser = parser;
        this.settings = settings;
    }

    /**
     * Generate flow content as embed links for insertion into editor
     */
    async generateFlowArray(file: TFile): Promise<string> {
        const flowDef = this.parser.parseFlow(file);

        if (!flowDef) {
            throw new Error("Selected file has no flow definition");
        }

        const lines = flowDef.items.map((item) => {
            if (item instanceof EmbedLocalSectionFlowItem) {
                return item.link;
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
class FlowCalloutHandler {
    private app: App;
    private parser: FlowParser;
    private settings: FlowSettings;

    constructor(app: App, parser: FlowParser, settings: FlowSettings) {
        this.app = app;
        this.parser = parser;
        this.settings = settings;
    }

    /**
     * Generate complete resolved markdown content for callout rendering
     */
    async generateMarkdown(file: TFile): Promise<string> {
        const flowDef = this.parser.parseFlow(file);

        if (!flowDef) {
            return await this.app.vault.read(file);
        }

        const items = await Promise.all(flowDef.items.map((item) => item.resolve()));

        const frontmatter = this.getFrontmatter(file);
        const separator = this.settings.extraLine ? "\n\n" : "\n";
        const content = items.join(separator);

        return frontmatter ? `${frontmatter}\n\n${content}` : content;
    }

    /**
     * Get the frontmatter section of a file
     */
    private getFrontmatter(file: TFile): string | null {
        const meta = this.app.metadataCache.getFileCache(file);
        const yaml = stringifyYaml(meta?.frontmatter);
        return yaml ? `---\n${yaml}\n---\n` : null;
    }
}

/**
 * Main flow manager - coordinates all flow operations
 */
export class FlowManager {
    private parser: FlowParser;
    private commandHandler: FlowCommandHandler;
    private calloutRenderer: FlowCalloutHandler;

    constructor(plugin: Plugin, settings: FlowSettings) {
        this.parser = new FlowParser(plugin.app);
        this.commandHandler = new FlowCommandHandler(this.parser, settings);
        this.calloutRenderer = new FlowCalloutHandler(plugin.app, this.parser, settings);
    }

    /**
     * Check if a file has flow definition
     */
    hasFlowDefinition(file: TFile): boolean {
        return this.parser.parseFlow(file) !== null;
    }

    /**
     * Get embed links for command usage (insert into editor)
     */
    async getSimpleFlowContent(file: TFile): Promise<string> {
        return this.commandHandler.generateFlowArray(file);
    }

    /**
     * Get resolved content for callout rendering
     */
    async getResolvedFlowContent(file: TFile): Promise<string> {
        return this.calloutRenderer.generateMarkdown(file);
    }
}
