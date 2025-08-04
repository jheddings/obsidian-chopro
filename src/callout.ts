// callout - ChoPro callout processor for Obsidian

import { App, TFile, MarkdownPostProcessorContext } from "obsidian";

import { ChoproFile, ChoproBlock } from "./parser";
import { ChoproRenderer } from "./render";
import { ChoproTransposer, TransposeUtils } from "./transpose";
import { Logger } from "./logger";
import { RenderSettings, FlowSettings } from "./config";

export interface CalloutFeatures {
    flow?: boolean | string[];
    key?: string;
}

export class ChoproCalloutProcessor {
    private logger = Logger.getLogger("ChoproCalloutProcessor");

    constructor(
        private app: App,
        private renderSettings: RenderSettings,
        private flowSettings: FlowSettings
    ) {}

    /**
     * Process ChoPro callouts in markdown content
     */
    async processCallouts(el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
        const callouts = el.querySelectorAll('.callout[data-callout="chopro"]');

        this.logger.debug(`Found ${callouts.length} chopro callouts`);

        for (let i = 0; i < callouts.length; i++) {
            this.logger.debug(
                `Processing callout ${i + 1}: ${callouts[i].outerHTML.substring(0, 200)}...`
            );
            await this.processChoproCallout(callouts[i] as HTMLElement, ctx);
        }
    }

    /**
     * Process a single ChoPro callout
     */
    private async processChoproCallout(
        callout: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): Promise<void> {
        try {
            // Extract the file link from the callout title
            const titleEl = callout.querySelector(".callout-title");
            if (!titleEl) {
                this.logger.warn("ChoPro callout missing title");
                return;
            }

            // Look for the link in the title text or in any child link elements
            let fileName: string | null = null;

            // First, try to find a link element within the title
            const linkEl = titleEl.querySelector("a.internal-link");
            if (linkEl) {
                const href = linkEl.getAttribute("href");
                if (href) {
                    fileName = href;
                }
            }

            // If no link element found, try to parse [[link]] syntax from text
            if (!fileName) {
                const linkMatch = titleEl.textContent?.match(/\[\[([^\]]+)\]\]/);
                if (linkMatch) {
                    fileName = linkMatch[1];
                }
            }

            if (!fileName) {
                this.logger.warn("ChoPro callout title must contain a file link");
                this.showError(
                    callout,
                    "ChoPro callout title must contain a file link like [[filename]]"
                );
                return;
            }
            const targetFile = this.app.metadataCache.getFirstLinkpathDest(
                fileName,
                ctx.sourcePath
            );

            if (!targetFile) {
                this.logger.warn(`ChoPro callout: file not found: ${fileName}`);
                this.showError(callout, `File not found: ${fileName}`);
                return;
            }

            // Extract features from callout content
            const features = this.extractFeatures(callout);

            // Read and process the target file
            const fileContent = await this.app.vault.read(targetFile);
            await this.renderChoproFile(callout, targetFile, fileContent, features);
        } catch (error) {
            this.logger.error("Error processing ChoPro callout", error);
            this.showError(callout, "Error processing ChoPro callout");
        }
    }

    /**
     * Extract features from the callout content
     */
    private extractFeatures(callout: HTMLElement): CalloutFeatures {
        const contentEl = callout.querySelector(".callout-content");
        if (!contentEl) return {};

        const content = contentEl.textContent?.trim() || "";
        const features: CalloutFeatures = {};

        const lines = content.split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const [key, ...valueParts] = trimmed.split(":");
            const value = valueParts.join(":").trim();

            if (key.trim() === "flow") {
                if (["on", "true", "yes"].includes(value)) {
                    features.flow = true;
                }
            } else if (key.trim() === "key") {
                features.key = value;
            }
        }

        return features;
    }

    /**
     * Render the ChoPro file with the specified features
     */
    private async renderChoproFile(
        callout: HTMLElement,
        file: TFile,
        content: string,
        features: CalloutFeatures
    ): Promise<void> {
        const choproFile = ChoproFile.parse(content);

        // Apply transposition if key is specified
        if (features.key) {
            await this.applyTransposition(choproFile, features.key);
        }

        // Clear the callout and prepare for rendering
        callout.empty();
        const container = callout.createDiv({ cls: "chopro-callout-container" });

        // Apply flow if specified
        if (features.flow === true) {
            await this.renderWithFlow(container, file, choproFile);
        } else if (Array.isArray(features.flow)) {
            await this.renderWithCustomFlow(container, file, choproFile, features.flow);
        } else {
            // Render the entire file normally
            this.renderChoproFileBlocks(container, choproFile);
        }
    }

    /**
     * Apply transposition to the ChoPro file
     */
    private async applyTransposition(choproFile: ChoproFile, targetKey: string): Promise<void> {
        try {
            const detectedKey = TransposeUtils.detectKey(choproFile);
            const fromKey = detectedKey || TransposeUtils.parseKey("C");
            const toKey = TransposeUtils.parseKey(targetKey);

            const transposer = new ChoproTransposer({
                fromKey,
                toKey,
            });

            transposer.transpose(choproFile);
            this.logger.debug(`Transposed from ${fromKey} to ${toKey}`);
        } catch (error) {
            this.logger.error("Error applying transposition", error);
        }
    }

    /**
     * Render ChoPro file blocks directly
     */
    private renderChoproFileBlocks(container: HTMLElement, choproFile: ChoproFile): void {
        const renderer = new ChoproRenderer(this.renderSettings);

        for (const block of choproFile.blocks) {
            if (block instanceof ChoproBlock) {
                renderer.renderBlock(block, container);
            }
        }
    }

    /**
     * Render with flow from frontmatter
     */
    private async renderWithFlow(
        container: HTMLElement,
        file: TFile,
        choproFile: ChoproFile
    ): Promise<void> {
        const fileCache = this.app.metadataCache.getFileCache(file);
        const flow = fileCache?.frontmatter?.flow;

        if (!flow) {
            // No flow in frontmatter, render normally
            this.renderChoproFileBlocks(container, choproFile);
            return;
        }

        if (Array.isArray(flow)) {
            await this.renderWithCustomFlow(container, file, choproFile, flow);
        } else if (typeof flow === "string") {
            // Simple string flow - just render that section
            await this.renderSection(container, file, choproFile, flow);
        }
    }

    /**
     * Render with custom flow array
     */
    private async renderWithCustomFlow(
        container: HTMLElement,
        file: TFile,
        choproFile: ChoproFile,
        flow: string[]
    ): Promise<void> {
        for (const item of flow) {
            const itemContainer = container.createDiv({ cls: "chopro-flow-item" });

            // Check for local wiki links (format: [[#Section]])
            const localWikiLinkMatch = item.match(/^\[\[#([^\]]+)\]\]$/);
            if (localWikiLinkMatch) {
                const sectionName = localWikiLinkMatch[1];
                await this.renderSection(itemContainer, file, choproFile, sectionName);
            } else if (item.startsWith(">")) {
                // Handle callout-style items (e.g., ">[!note] Key Change")
                itemContainer.innerHTML = item.substring(1); // Remove the leading '>'
                itemContainer.addClass("chopro-flow-callout");
            } else {
                // Handle other flow items
                itemContainer.createDiv({ text: item, cls: "chopro-flow-text" });
            }

            if (this.flowSettings.extraLine) {
                container.createEl("br");
            }
        }
    }

    /**
     * Render a specific section from the file
     */
    private async renderSection(
        container: HTMLElement,
        file: TFile,
        choproFile: ChoproFile,
        sectionName: string
    ): Promise<void> {
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

        // Look for ChoPro code blocks in the section
        const choproBlockMatch = sectionContent.match(/```chopro\n([\s\S]*?)\n```/);
        if (choproBlockMatch) {
            const choproContent = choproBlockMatch[1];
            const sectionFile = ChoproFile.parse(choproContent);

            const renderer = new ChoproRenderer(this.renderSettings);
            for (const block of sectionFile.blocks) {
                if (block instanceof ChoproBlock) {
                    renderer.renderBlock(block, container);
                }
            }
        } else {
            // No ChoPro block, render as plain text
            container.createDiv({ text: sectionContent, cls: "chopro-text" });
        }
    }

    /**
     * Show an error message in the callout
     */
    private showError(callout: HTMLElement, message: string): void {
        callout.empty();
        callout.createDiv({
            cls: "chopro-callout-error",
            text: `ChoPro Error: ${message}`,
        });
    }
}
