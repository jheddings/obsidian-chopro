// styles - Style Manager for the ChoPro plugin in Obsidian

import { ChoproPluginSettings } from './main';

export class ChoproStyleManager {
    private static readonly STYLE_ID = 'chopro-plugin-styles';

    static removeStyles(): void {
        const existingStyle = document.getElementById(this.STYLE_ID);
        if (existingStyle) {
            existingStyle.remove();
        }
    }

    static applyStyles(settings: ChoproPluginSettings): void {
        this.removeStyles();

        var modPlacementStyle = {};
        if (settings.superscriptChordMods) {
            modPlacementStyle = {
                'vertical-align': 'top',
                'font-size': '0.75em'
            };
        }

        const style = document.createElement('style');
        style.id = this.STYLE_ID;
        style.textContent = `
            .chopro-container {
                line-height: 1.8;
                white-space: pre;
                tab-size: 4;
                padding: 1rem;
                background: var(--background-primary);
                border-radius: 6px;
                overflow-x: auto;
            }
            
            .chopro-preview {
                line-height: 1.8;
                padding: 1rem;
                background: var(--background-secondary);
                border-radius: 6px;
            }
            
            .chopro-directive {
                margin-bottom: 0.75rem;
                padding: 0.5rem;
                background: var(--background-secondary);
                border-radius: 4px;
            }
            
            .chopro-directive-name {
                font-weight: bold;
                font-size: 0.9em;
                text-transform: uppercase;
            }
            
            .chopro-directive-value {
                color: var(--text-muted);
                font-size: 0.9em;
            }
            
            .chopro-instruction {
                margin-bottom: 0.75rem;
                padding: 0.5rem;
                background: var(--background-modifier-border);
                border-radius: 4px;
                font-style: italic;
                color: var(--text-muted);
                font-size: 0.95em;
                text-align: center;
                border: 1px solid var(--background-modifier-border);
            }
           
            .chopro-line {
                margin-bottom: 0.5rem;
                position: relative;
                min-height: 2.5em;
                padding-top: 1.5em;
                display: flex;
                flex-wrap: nowrap;
                align-items: baseline;
                white-space: nowrap;
            }
            
            .chopro-pair {
                position: relative;
                display: inline-block;
                vertical-align: baseline;
                flex-shrink: 0;
            }
            
            .chopro-chord {
                position: absolute;
                top: -1.5em;
                left: 0;
                color: ${settings.chordColor};
                font-weight: bold;
                font-size: ${settings.chordSize};
                white-space: nowrap;
                z-index: 1;
                font-family: var(--font-monospace);
                overflow: visible;
            }
            
            .chopro-chord-modifier {
                padding-left: 0.1em;
                ${Object.entries(modPlacementStyle).map(([key, value]) => `${key}: ${value};`).join('\n')}
            }
            
            .chopro-lyrics {
                white-space: pre;
                display: inline-block;
            }
            
            /* Ensure proper spacing for chord-only sections */
            .chopro-pair .chopro-lyrics:empty::after {
                content: '\\00A0';
                min-width: 1ch;
            }
        `;
        
        document.head.appendChild(style);
    }
}
