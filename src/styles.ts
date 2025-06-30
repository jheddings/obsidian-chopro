// styles - Style Manager for the ChoPro plugin in Obsidian

import { ChoproPluginSettings } from './main';

export class ChoproStyleManager {
    private static readonly STYLE_ID = 'chopro-plugin-user-overrides';

    static removeStyles(): void {
        const existingStyle = document.getElementById(this.STYLE_ID);
        if (existingStyle) {
            existingStyle.remove();
        }
    }

    static applyStyles(settings: ChoproPluginSettings): void {
        this.removeStyles();

        // Only apply user setting overrides
        const style = document.createElement('style');
        style.id = this.STYLE_ID;
        
        let overrides = '';

        // Chord and annotation color and size overrides
        overrides += `
            .chopro-chord,
            .chopro-annotation {
                color: ${settings.chordColor};
                font-size: ${settings.chordSize}em;
            }
            .chopro-line:has(.chopro-pair) {
                min-height: ${1.5 + settings.chordSize}em;
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
    }
}
