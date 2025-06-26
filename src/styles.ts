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
            
            .chopro-section {
                margin-bottom: 1.5rem;
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
            
            .chopro-annotation {
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
                ${settings.italicAnnotations ? 'font-style: italic;' : ''}
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
            
            /* Section headers and structure */
            .chopro-section-header {
                margin: 1rem 0 0.5rem;
                padding: 0.25rem 0.5rem;
                background: var(--background-modifier-hover);
                border-radius: 4px;
                border-left: 3px solid ${settings.chordColor};
            }
            
            .chopro-section-name {
                font-weight: bold;
                color: var(--text-accent);
                font-size: 0.9em;
                text-transform: uppercase;
            }
            
            /* Comment lines */
            .chopro-comment {
                margin: 0.25rem 0;
                padding: 0.25rem 0.5rem;
                background: var(--background-modifier-hover);
                border-radius: 3px;
                border-left: 2px solid var(--text-muted);
            }
            
            .chopro-comment-text {
                color: var(--text-muted);
                font-style: italic;
                font-size: 0.9em;
            }
            
            /* Custom lines */
            .chopro-custom {
                margin: 0.25rem 0;
                color: var(--text-normal);
            }
            
            .chopro-custom-text {
                font-family: var(--font-monospace);
                background: var(--background-modifier-hover);
                padding: 0.1rem 0.3rem;
                border-radius: 2px;
            }
            
            /* Tab lines */
            .chopro-tab-line {
                margin: 0.15rem 0;
                font-family: var(--font-monospace);
                background: var(--background-secondary);
                padding: 0.25rem 0.5rem;
                border-radius: 3px;
                overflow-x: auto;
                white-space: pre;
            }
            
            .chopro-tab-content {
                color: var(--text-normal);
                line-height: 1.2;
            }
            
            /* Tabs section container */
            .chopro-tabs-section {
                margin: 0.5rem 0;
                padding: 0.5rem;
                background: var(--background-secondary);
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
            }
            
            /* Generic fallback styles */
            .chopro-generic-line {
                margin: 0.25rem 0;
                color: var(--text-normal);
            }
        `;
        
        document.head.appendChild(style);
    }
}
