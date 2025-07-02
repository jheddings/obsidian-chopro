// main - ChoPro Obsidian Plugin

import { Plugin, PluginSettingTab, Setting, App } from 'obsidian';
import { ChoproRenderer } from './render';
import { ChoproBlock } from './parser';
import { ChoproStyleManager } from './styles';

export interface ChoproPluginSettings {
    chordColor: string;
    chordSize: number;
    superscriptChordMods: boolean;
    chordDecorations: string;
    normalizedChordDisplay: boolean;
    italicAnnotations: boolean;
}

const DEFAULT_SETTINGS: ChoproPluginSettings = {
    chordColor: '#2563eb',  // blue
    chordSize: 1.0,
    superscriptChordMods: false,
    chordDecorations: 'none',
    normalizedChordDisplay: false,
    italicAnnotations: true
};

export default class ChoproPlugin extends Plugin {
    settings: ChoproPluginSettings;
    renderer: ChoproRenderer;

    async onload() {
        await this.loadSettings();

        this.renderer = new ChoproRenderer(this.settings);

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

        // Update the renderer with new settings
        this.renderer = new ChoproRenderer(this.settings);

        // reapply the current styles
        ChoproStyleManager.applyStyles(this.settings);
    }

    processChoproBlock(source: string, el: HTMLElement) {
        el.empty();
        
        const container = el.createDiv({ cls: 'chopro-container' });
        const block = ChoproBlock.parse(source);
        this.renderer.renderBlock(block, container);
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
            .setName('Chord Color')
            .setDesc('Color for chord text (CSS color value)')
            .addText(text => text
                .setPlaceholder('#2563eb')
                .setValue(this.plugin.settings.chordColor)
                .onChange(async (value) => {
                    this.plugin.settings.chordColor = value || DEFAULT_SETTINGS.chordColor;
                    updatePreview();
                }));

        new Setting(containerEl)
            .setName('Chord Size')
            .setDesc('Font size for chord text (relative to base font)')
            .addSlider(slider => slider
                .setLimits(0.5, 2.0, 0.05)
                .setValue(this.plugin.settings.chordSize)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.chordSize = value;
                    updatePreview();
                }));

        new Setting(containerEl)
            .setName('Superscript Chord Modifiers')
            .setDesc('Display chord modifiers (7, maj7, sus4, etc.) as superscript')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.superscriptChordMods)
                .onChange(async (value) => {
                    this.plugin.settings.superscriptChordMods = value;
                    updatePreview();
                }));

        new Setting(containerEl)
            .setName('Chord Decorators')
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
                    updatePreview();
                }));

        new Setting(containerEl)
            .setName('Normalized Chord Display')
            .setDesc('Use normalized chord representations (F# → F♯, Bb → B♭)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.normalizedChordDisplay)
                .onChange(async (value) => {
                    this.plugin.settings.normalizedChordDisplay = value;
                    updatePreview();
                }));

        new Setting(containerEl)
            .setName('Italic Annotations')
            .setDesc('Display inline annotations in italics')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.italicAnnotations)
                .onChange(async (value) => {
                    this.plugin.settings.italicAnnotations = value;
                    updatePreview();
                }));

        const previewDiv = containerEl.createDiv({ cls: 'setting-item' });
        previewDiv.createDiv({ cls: 'setting-item-info' })
            .createDiv({ cls: 'setting-item-name', text: 'Preview' });
        
        const previewContent = previewDiv.createDiv({ cls: 'setting-item-control' });
        const preview = previewContent.createDiv();
        
        const choproPreview = `
            [F]Amazing [F7]grace, how [Bb]sweet the [F]sound, that [Dm]saved a [FMAJ7]wretch like [C]me
            I [F]once was [F7]lost but [Bb]now I'm [F]found, was [Dm]blind but [C]now I [F]see [*Rit.]
        `;
        
        // Update preview content based on current settings
        const updatePreview = () => {
            preview.empty();
            this.plugin.saveSettings();

            const sample = choproPreview.replace(/^\s+/m, '');
            const block = ChoproBlock.parse(sample);
            this.plugin.renderer.renderBlock(block, preview);
        };
        
        // initial preview
        updatePreview();
    }
}
