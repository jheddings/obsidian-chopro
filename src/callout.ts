// callout - ChoPro callout processor for Obsidian

import { TFile, MarkdownPostProcessorContext, Plugin, MarkdownRenderer } from "obsidian";

import { ChoproRenderer } from "./render";
import { Logger } from "./logger";
import { FlowGenerator } from "./flow";

export interface CalloutFeatures {
    flow: boolean;
}

export class CalloutProcessor {
    private logger = Logger.getLogger("CalloutProcessor");

    constructor(
        private plugin: Plugin,
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
            this.logger.warn("Title must contain a file link");
            return;
        }

        const targetFile = this.plugin.app.metadataCache.getFirstLinkpathDest(
            fileName,
            ctx.sourcePath
        );

        if (!targetFile) {
            this.logger.warn(`File not found: ${fileName}`);
            return;
        }

        const features = this.extractFeatures(callout);
        await this.render(callout, targetFile, features);
    }

    /**
     * Extract features from the source callout content.
     */
    private extractFeatures(callout: HTMLElement): CalloutFeatures {
        const contentEl = callout.querySelector(".callout-content");
        const content = contentEl?.textContent?.trim() || "";

        const features: CalloutFeatures = {
            flow: false,
        };

        const lines = content.split("\n");

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const [key, ...valueParts] = trimmed.split(":");
            const value = valueParts.join(":").trim();

            if (key.trim() === "flow") {
                if (["on", "true", "yes", "1"].includes(value)) {
                    features.flow = true;
                }
            }
        }

        return features;
    }

    /**
     * Render the callout content file with the specified features.
     */
    private async render(
        callout: HTMLElement,
        file: TFile,
        features: CalloutFeatures
    ): Promise<void> {
        callout.empty();

        let content: string;

        if (features.flow) {
            content = this.flowGenerator.generateFlowMarkdown(file);
        } else {
            content = await this.plugin.app.vault.read(file);
        }

        const container = callout.createDiv({ cls: "chopro-callout-container" });

        MarkdownRenderer.render(this.plugin.app, content, container, file.path, this.plugin);
    }
}
