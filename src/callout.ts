// callout - ChoPro callout processor for Obsidian

import { TFile, MarkdownPostProcessorContext, Plugin, MarkdownRenderer, parseYaml } from "obsidian";

import { Logger } from "./logger";
import { ChoproRenderer } from "./render";
import { FlowGenerator } from "./flow";

const TRUTHY_VALUES = ["on", "true", "yes", "y"];

/**
 * Returns true if the value is a common boolean.
 */
function isTruthy(value: any): boolean {
    if (typeof value === "boolean") {
        return value as boolean;
    } else if (typeof value === "string") {
        const lowerValue = value.toLowerCase();
        return TRUTHY_VALUES.includes(lowerValue);
    } else if (typeof value === "number") {
        return value > 0;
    }

    return false;
}

export interface CalloutFeatures {
    flow: boolean;
}

export class CalloutProcessor {
    private logger = Logger.getLogger("CalloutProcessor");

    private plugin: Plugin;
    private renderer: ChoproRenderer;
    private flowGenerator: FlowGenerator;

    constructor(plugin: Plugin, renderer: ChoproRenderer, flowGenerator: FlowGenerator) {
        this.plugin = plugin;
        this.renderer = renderer;
        this.flowGenerator = flowGenerator;
    }

    /**
     * Process ChoPro callouts in markdown content
     */
    async processCallouts(el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
        const callouts = el.querySelectorAll('.callout[data-callout="chopro"]');

        this.logger.debug(`Processing ${callouts.length} chopro callouts`);

        callouts.forEach(async (callout) => {
            await this.processCallout(callout as HTMLElement, ctx);
        });
    }

    /**
     * Process a single ChoPro callout
     */
    async processCallout(callout: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
        const wikilink = this.extractWikilink(callout);

        this.logger.debug(`Processing callout: ${wikilink}`);

        const targetFile = this.plugin.app.metadataCache.getFirstLinkpathDest(
            wikilink,
            ctx.sourcePath
        );

        if (!targetFile) {
            this.logger.warn(`File not found: ${wikilink}`);
            return;
        }

        const features = this.extractFeatures(callout);
        await this.render(callout, targetFile, features);
    }

    /**
     * Extract the wikilink from the callout title.
     */
    private extractWikilink(callout: HTMLElement): string {
        const titleEl = callout.querySelector(".callout-title-inner");
        if (!titleEl) {
            this.logger.warn("Missing callout title");
            throw new Error("Callout title is required");
        }

        const linkEl = titleEl.querySelector("a.internal-link");
        if (linkEl) {
            const href = linkEl.getAttribute("href");
            if (href) {
                return href;
            }
        }

        const linkMatch = titleEl.textContent?.match(/\[\[([^\]]+)\]\]/);
        if (linkMatch) {
            return linkMatch[1];
        }

        this.logger.warn("Title must contain a file link");
        throw new Error("Title must contain a file link");
    }

    /**
     * Extract features from the source callout content.
     */
    private extractFeatures(callout: HTMLElement): CalloutFeatures {
        const contentEl = callout.querySelector(".callout-content");
        const content = contentEl?.textContent?.trim() || "";

        const features: CalloutFeatures = {
            flow: true,
        };

        try {
            const yamlData = parseYaml(content);
            this.logger.debug("Parsed YAML data:", yamlData);

            if ("flow" in yamlData) {
                features.flow = isTruthy(yamlData.flow);
            }
        } catch (error) {
            this.logger.warn(`Failed to parse features: ${error.message}`);
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
            this.logger.debug("Rendering flow content");
            content = this.flowGenerator.generateFlowMarkdown(file);
        } else {
            this.logger.debug("Rendering markdown content");
            content = await this.plugin.app.vault.read(file);
        }

        const container = callout.createEl("blockquote");

        MarkdownRenderer.render(this.plugin.app, content, container, file.path, this.plugin);
    }
}
