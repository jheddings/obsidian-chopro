// styles - Style Manager for the ChoPro plugin in Obsidian

import { RenderSettings } from "./config";

export class ChoproStyleManager {
    /**
     * Apply style settings to a container element using CSS custom properties.
     * Sets CSS variables and toggles classes for boolean settings.
     */
    static applyToContainer(el: HTMLElement, settings: RenderSettings): void {
        const color = this.sanitizeColorValue(settings.chordColor);
        const size = this.sanitizeSizeValue(settings.chordSize);

        el.style.setProperty("--chopro-chord-color", color);
        el.style.setProperty("--chopro-chord-size", String(size));

        el.classList.toggle("chopro-italic-annotations", settings.italicAnnotations);
        el.classList.toggle("chopro-superscript-mods", settings.superscriptChordMods);
    }

    /**
     * Update all existing .chopro-container elements with current settings.
     * Called when settings change so existing rendered views update immediately.
     */
    static updateAllContainers(settings: RenderSettings): void {
        const containers = document.querySelectorAll<HTMLElement>(".chopro-container");
        containers.forEach((container) => {
            this.applyToContainer(container, settings);
        });
    }

    private static sanitizeColorValue(color: string): string {
        if (!color || typeof color !== "string") {
            return "#2563eb";
        }

        const colorPattern = /^(#([0-9a-fA-F]{3}){1,2}|rgb\(.*\)|hsl\(.*\)|[a-zA-Z]+)$/;
        return colorPattern.test(color.trim()) ? color.trim() : "#2563eb";
    }

    private static sanitizeSizeValue(size: number): number {
        if (typeof size !== "number" || isNaN(size)) {
            return 1.0;
        }
        return Math.max(0.5, Math.min(2.0, size));
    }
}
