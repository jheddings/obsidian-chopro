// main - ChoPro Obsidian Plugin

import { Plugin, PluginSettingTab, Setting, App } from 'obsidian';
import { ChoproProcessor } from './chopro';
import { ChoproStyleManager } from './styles';

export interface ChoproPluginSettings {
    chordColor: string;
    chordSize: string;
    showDirectives: boolean;
    superscriptChordMods: boolean;
    chordDecorations: string;
}

const DEFAULT_SETTINGS: ChoproPluginSettings = {
    chordColor: '#2563eb',  // blue
    chordSize: '1em',
    showDirectives: true,
    superscriptChordMods: false,
    chordDecorations: 'none'
};

export default class ChoproPlugin extends Plugin {
    settings: ChoproPluginSettings;
    processor: ChoproProcessor;

    async onload() {
        await this.loadSettings();

        // Initialize the processor with current settings
        this.processor = new ChoproProcessor(this.settings);

        this.registerMarkdownCodeBlockProcessor('chopro', (source, el, ctx) => {
            this.processChoproBlock(source, el);
        });

        this.addSettingTab(new ChoproSettingTab(this.app, this));

        ChoproStyleManager.applyStyles(this.settings);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);

        // Update the processor with new settings
        this.processor = new ChoproProcessor(this.settings);

        // reapply the current styles
        ChoproStyleManager.applyStyles(this.settings);
    }

    processChoproBlock(source: string, el: HTMLElement) {
        el.empty();
        
        // Create container
        const container = el.createDiv({ cls: 'chopro-container' });
        this.processor.processBlock(source, container);
    }
    onunload() {
        ChoproStyleManager.removeStyles();
    }
}

class ChoproSettingTab extends PluginSettingTab {
    plugin: ChoproPlugin;

    constructor(app: App, plugin: ChoproPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'ChoPro Settings' });

        new Setting(containerEl)
            .setName('Show Directives')
            .setDesc('Display ChoPro directives like {title}, {artist}, etc.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showDirectives)
                .onChange(async (value) => {
                    this.plugin.settings.showDirectives = value;
                    await this.plugin.saveSettings();
                    updatePreview();
                }));

        new Setting(containerEl)
            .setName('Chord Color')
            .setDesc('Color for chord text (CSS color value)')
            .addText(text => text
                .setPlaceholder('#2563eb')
                .setValue(this.plugin.settings.chordColor)
                .onChange(async (value) => {
                    this.plugin.settings.chordColor = value || DEFAULT_SETTINGS.chordColor;
                    await this.plugin.saveSettings();
                    updatePreview();
                }));

        new Setting(containerEl)
            .setName('Chord Size')
            .setDesc('Font size for chord text (CSS size value)')
            .addText(text => text
                .setPlaceholder('1em')
                .setValue(this.plugin.settings.chordSize)
                .onChange(async (value) => {
                    this.plugin.settings.chordSize = value || DEFAULT_SETTINGS.chordSize;
                    await this.plugin.saveSettings();
                    updatePreview();
                }));

        new Setting(containerEl)
            .setName('Superscript Chord Modifiers')
            .setDesc('Display chord modifiers (7, maj7, sus4, etc.) as superscript')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.superscriptChordMods)
                .onChange(async (value) => {
                    this.plugin.settings.superscriptChordMods = value;
                    await this.plugin.saveSettings();
                    updatePreview();
                }));

        new Setting(containerEl)
            .setName('Chord Decorations')
            .setDesc('Wrap chords with bracket pairs for emphasis')
            .addDropdown(dropdown => dropdown
                .addOption('none', 'None')
                .addOption('square', '[ ]')
                .addOption('round', '( )')
                .addOption('curly', '{ }')
                .addOption('angle', '< >')
                .setValue(this.plugin.settings.chordDecorations)
                .onChange(async (value) => {
                    this.plugin.settings.chordDecorations = value;
                    await this.plugin.saveSettings();
                    updatePreview();
                }));

        const previewDiv = containerEl.createDiv({ cls: 'setting-item' });
        previewDiv.createDiv({ cls: 'setting-item-info' })
            .createDiv({ cls: 'setting-item-name', text: 'Preview' });
        
        const previewContent = previewDiv.createDiv({ cls: 'setting-item-control' });
        const preview = previewContent.createDiv();
        
        // Update preview content based on current settings
        const updatePreview = () => {
            // Get decoration brackets based on current setting
            let decorationOpen = '';
            let decorationClose = '';
            switch (this.plugin.settings.chordDecorations) {
                case 'square':
                    decorationOpen = '[';
                    decorationClose = ']';
                    break;
                case 'round':
                    decorationOpen = '(';
                    decorationClose = ')';
                    break;
                case 'curly':
                    decorationOpen = '{';
                    decorationClose = '}';
                    break;
                case 'angle':
                    decorationOpen = '&lt;';
                    decorationClose = '&gt;';
                    break;
                case 'none':
                default:
                    decorationOpen = '';
                    decorationClose = '';
                    break;
            }

            preview.innerHTML = `
                <div class="chopro-preview">
                    ${this.plugin.settings.showDirectives ? `
                    <div class="chopro-directive">
                        <span class="chopro-directive-name">title</span>
                        <span class="chopro-directive-value">: Amazing Grace</span>
                    </div>
                    ` : ''}
                    <div class="chopro-line">
                        <span class="chopro-pair">
                            <span class="chopro-chord">${decorationOpen}C${decorationClose}</span>
                            <span class="chopro-lyrics">Amazing </span>
                        </span>
                        <span class="chopro-pair">
                            <span class="chopro-chord">${decorationOpen}F${decorationClose}</span>
                            <span class="chopro-lyrics">grace how </span>
                        </span>
                        <span class="chopro-pair">
                            <span class="chopro-chord">${decorationOpen}G<span class="chopro-chord-modifier">7</span>${decorationClose}</span>
                            <span class="chopro-lyrics">sweet the sound</span>
                        </span>
                    </div>
                    <div class="chopro-line">
                        <span class="chopro-pair">
                            <span class="chopro-chord">${decorationOpen}A<span class="chopro-chord-modifier">m</span>${decorationClose}</span>
                            <span class="chopro-lyrics">That saved a </span>
                        </span>
                        <span class="chopro-pair">
                            <span class="chopro-chord">${decorationOpen}G${decorationClose}</span>
                            <span class="chopro-lyrics">wretch like </span>
                        </span>
                        <span class="chopro-pair">
                            <span class="chopro-chord">${decorationOpen}C${decorationClose}</span>
                            <span class="chopro-lyrics">me</span>
                        </span>
                    </div>
                </div>
            `;
        };
        
        // Initial preview render
        updatePreview();
    }
}
