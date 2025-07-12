// styles - Style Manager for the ChoPro plugin in Obsidian

import { ChoproPluginSettings } from './main';

export class ChoproStyleManager {
    private static readonly STYLE_ID = 'chopro-plugin-user-overrides';

    static removeStyles(): void {
        try {
            const existingStyle = document.getElementById(this.STYLE_ID);
            if (existingStyle) {
                existingStyle.remove();
            }
        } catch (error) {
            console.warn('Failed to remove ChoPro styles:', error);
        }
    }

    static applyStyles(settings: ChoproPluginSettings): void {
        try {
            this.removeStyles();

            // Only apply user setting overrides
            const style = document.createElement('style');
            style.id = this.STYLE_ID;
            
            let overrides = '';

            // Validate and sanitize color value
            const colorValue = this.sanitizeColorValue(settings.chordColor);
            const sizeValue = this.sanitizeSizeValue(settings.chordSize);

            // Chord and annotation color and size overrides
            overrides += `
                .chopro-chord,
                .chopro-annotation {
                    color: ${colorValue};
                    font-size: ${sizeValue}em;
                }
                .chopro-line:has(.chopro-pair) {
                    min-height: ${1.5 + sizeValue}em;
                }
            `;

            // Italic annotations override
            if (settings.italicAnnotations) {
                overrides += `
                .chopro-annotation {
                    font-style: italic;
                }
                `;
            }

            // Superscript chord modifiers override
            if (settings.superscriptChordMods) {
                overrides += `
                .chopro-chord-modifier {
                    vertical-align: top;
                    font-size: 0.75em;
                }
                `;
            }

            style.textContent = overrides;
            document.head.appendChild(style);
        } catch (error) {
            console.error('Failed to apply ChoPro styles:', error);
        }
    }

    private static sanitizeColorValue(color: string): string {
        // Basic CSS color validation
        if (!color || typeof color !== 'string') {
            return '#2563eb'; // Default blue
        }
        
        // Allow hex colors, CSS named colors, rgb(), hsl(), etc.
        const colorPattern = /^(#([0-9a-fA-F]{3}){1,2}|rgb\(.*\)|hsl\(.*\)|[a-zA-Z]+)$/;
        return colorPattern.test(color.trim()) ? color.trim() : '#2563eb';
    }

    private static sanitizeSizeValue(size: number): number {
        // Ensure size is within reasonable bounds
        if (typeof size !== 'number' || isNaN(size)) {
            return 1.0;
        }
        return Math.max(0.5, Math.min(3.0, size));
    }
}
