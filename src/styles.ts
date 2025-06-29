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

        const style = document.createElement('style');
        style.id = this.STYLE_ID;
        
        let userStylePrefs = `
            .chopro-chord,
            .chopro-annotation {
                color: ${settings.chordColor};
                font-size: ${settings.chordSize};
            }
        `;

        if (settings.italicAnnotations) {
            userStylePrefs += `
            .chopro-annotation {
                font-style: italic;
            }
            `;
        }

        if (settings.superscriptChordMods) {
            userStylePrefs += `
            .chopro-chord-modifier {
                vertical-align: top;
                font-size: 0.75em;
            }
            `;
        }

        style.textContent = userStylePrefs;
        document.head.appendChild(style);
    }
}
