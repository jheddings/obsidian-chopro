// callout - ChoPro callout processor for Obsidian

import { App, TFile, MarkdownPostProcessorContext } from "obsidian";

import { ChoproFile, ChoproBlock } from "./parser";
import { ChoproRenderer } from "./render";
import { ChoproTransposer, TransposeUtils } from "./transpose";
import { Logger } from "./logger";
import { FlowGenerator } from "./flow";

export interface CalloutFeatures {
    flow?: boolean | string[];
    key?: string;
}

export class ChoproCalloutProcessor {
    private logger = Logger.getLogger("ChoproCalloutProcessor");

    constructor(
        private app: App,
        private renderer: ChoproRenderer,
        private flowGenerator: FlowGenerator
    ) {}

    /**
     * Process ChoPro callouts in markdown content
     */
    async processCallouts(el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
        const callouts = el.querySelectorAll('.callout[data-callout="chopro"]');

        this.logger.debug(`Processing ${callouts.length} chopro callouts`);

        for (let i = 0; i < callouts.length; i++) {
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
        const titleEl = callout.querySelector(".callout-title");
        if (!titleEl) {
            this.logger.warn("Missing callout title");
            return;
        }

        let fileName: string | null = null;

        const linkEl = titleEl.querySelector("a.internal-link");
        if (linkEl) {
            const href = linkEl.getAttribute("href");
            if (href) {
                fileName = href;
            }
        }

        const linkMatch = titleEl.textContent?.match(/\[\[([^\]]+)\]\]/);
        if (linkMatch) {
            fileName = linkMatch[1];
        }

        if (!fileName) {
            this.logger.warn("ChoPro callout title must contain a file link");
            return;
        }
        const targetFile = this.app.metadataCache.getFirstLinkpathDest(fileName, ctx.sourcePath);

        if (!targetFile) {
            this.logger.warn(`ChoPro callout: file not found: ${fileName}`);
            return;
        }

        const features = this.extractFeatures(callout);

        const fileContent = await this.app.vault.read(targetFile);
        await this.renderChoproFile(callout, targetFile, fileContent, features);
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

        if (features.key) {
            await this.applyTransposition(choproFile, features.key);
        }

        // clear the current callout contents
        callout.empty();

        const container = callout.createDiv({ cls: "chopro-callout-container" });

        if (features.flow === true) {
            await this.renderWithFlow(container, file);
        } else {
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
        for (const block of choproFile.blocks) {
            if (block instanceof ChoproBlock) {
                this.renderer.renderBlock(block, container);
            }
        }
    }

    /**
     * Render with flow from frontmatter
     */
    private async renderWithFlow(container: HTMLElement, file: TFile): Promise<void> {
        await this.flowGenerator.renderFlowToDOM(container, file, this.renderer);
    }
}
