// callout - ChoPro callout processor for Obsidian

import { Logger } from "obskit";
import { TFile, MarkdownPostProcessorContext, Plugin, MarkdownRenderer, parseYaml } from "obsidian";

import { FlowManager } from "./flow";

const TRUTHY_VALUES = ["on", "true", "yes", "y"];

/**
 * Returns true if the value is a common boolean.
 */
function isTruthy(value: any): boolean {
    if (typeof value === "boolean") {
        return value as boolean;
    }

    if (typeof value === "string") {
        const lowerValue = value.toLowerCase();
        return TRUTHY_VALUES.includes(lowerValue);
    }

    if (typeof value === "number") {
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
    private flowManager: FlowManager;

    constructor(plugin: Plugin, flowManager: FlowManager) {
        this.plugin = plugin;
        this.flowManager = flowManager;
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
            throw new Error("Callout title is required");
        }

        const linkEl = titleEl.querySelector("a.internal-link");
        const href = linkEl?.getAttribute("href");

        if (href) {
            return href;
        }

        const linkMatch = titleEl.textContent?.match(/\[\[([^\]]+)\]\]/);

        if (linkMatch) {
            return linkMatch[1];
        }

        throw new Error("Title must contain a file link");
    }

    /**
     * Extract features from the source callout content.
     */
    private extractFeatures(callout: HTMLElement): CalloutFeatures {
        const contentEl = callout.querySelector(".callout-content");
        const content = contentEl?.textContent?.trim() || "";

        // initialize feature defaults
        const features: CalloutFeatures = { flow: true };

        if (!content) {
            return features;
        }

        try {
            const yamlData = parseYaml(content);

            if (yamlData && typeof yamlData === "object") {
                this.logger.debug("Parsed YAML data:", yamlData);
                this.mergeFeatures(features, yamlData);
            } else {
                this.logger.warn("Unable to parse features");
            }
        } catch (error) {
            this.logger.warn(`Failed to parse features: ${error.message}`);
        }

        return features;
    }

    /**
     * Merge features from YAML into the features object.
     */
    private mergeFeatures(features: CalloutFeatures, yaml: any): void {
        if ("flow" in yaml) {
            this.logger.debug(`flow :: ${yaml.flow}`);
            features.flow = isTruthy(yaml.flow);
        }
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

        if (features.flow && this.flowManager.hasFlowDefinition(file)) {
            this.logger.debug("Rendering flow content");
            content = await this.flowManager.getResolvedFlowContent(file);
        } else {
            this.logger.debug("Rendering markdown content");
            content = await this.plugin.app.vault.read(file);
        }

        const container = callout.createEl("blockquote");

        await MarkdownRenderer.render(this.plugin.app, content, container, file.path, this.plugin);

        // TODO render to DOM elements using the renderer
        //const choproFile = ChoproFile.parse(content);
        //this.plugin.renderer.render(choproFile, container);
    }
}
