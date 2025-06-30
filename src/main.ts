// main - ChoPro Obsidian Plugin

import { Plugin, PluginSettingTab, Setting, App, Notice, MarkdownView, Modal, ButtonComponent, Editor } from 'obsidian';
import { ChordType } from './parser';
import { ChoproRenderer } from './render';
import { ChoproBlock } from './parser';
import { ChoproStyleManager } from './styles';
import { FileTransposer, TransposeOptions } from './transpose';

export interface ChoproPluginSettings {
    chordColor: string;
    chordSize: number;
    showDirectives: boolean;
    superscriptChordMods: boolean;
    chordDecorations: string;
    italicAnnotations: boolean;
}

const DEFAULT_SETTINGS: ChoproPluginSettings = {
    chordColor: '#2563eb',  // blue
    chordSize: 1.0,
    showDirectives: true,
    superscriptChordMods: false,
    chordDecorations: 'none',
    italicAnnotations: true
};

export default class ChoproPlugin extends Plugin {
    settings: ChoproPluginSettings;
    transposer: FileTransposer;
    renderer: ChoproRenderer;

    async onload() {
        await this.loadSettings();

        this.transposer = new FileTransposer(this.app);
        this.renderer = new ChoproRenderer(this.settings);

        this.registerMarkdownCodeBlockProcessor('chopro', (source, el, ctx) => {
            this.processChoproBlock(source, el);
        });

        this.addCommand({
            id: 'chopro-transpose',
            name: 'Transpose chords in current file',
			editorCallback: (editor: Editor, view: MarkdownView) => {
                this.openTransposeModal(view);
            }
        });

        this.addSettingTab(new ChoproSettingTab(this.app, this));

        ChoproStyleManager.applyStyles(this.settings);
    }

    private async openTransposeModal(activeView: MarkdownView) {
        const file = activeView.file;
        if (!file) {
            new Notice('No file is currently open');
            return;
        }

        const content = await this.app.vault.read(file);
        const key = this.transposer.extractKeyFromFrontmatter(content);

        const modal = new TransposeModal(this.app, key, async (options) => {
            try {
                await this.transposer.transposeFile(file, options);
                new Notice('File transposed successfully');
            } catch (error) {
                console.error('Transpose error:', error);
                new Notice('Error transposing file');
            }
        });

        modal.open();
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
            .setName('Chord Decoration')
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
            .setName('Italic Annotations')
            .setDesc('Display annotations (text starting with asterisk) in italics')
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
            [C]Amazing [C7]grace, how [F]sweet the [C]sound, that [Am]saved a [C]wretch like [G]me
            I [C]once was [C7]lost but [F]now I'm [C]found, was [Am]blind but [G]now I [C]see [*Rit.]
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

class TransposeModal extends Modal {
    private fromKey: string | null = null;
    private toKey: string = 'C';
    private chordType: ChordType = ChordType.ALPHA;
    private onConfirm: (options: TransposeOptions) => void;

    constructor(app: App, currentKey: string | null, onConfirm: (options: TransposeOptions) => void) {
        super(app);
        this.fromKey = currentKey;
        this.toKey = currentKey || 'C';
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Transpose ChoPro' });

        new Setting(contentEl)
            .setName('Current Key')
            .setDesc('Select the current key of the song')
            .addDropdown(dropdown => {
                FileTransposer.KEYS.forEach(key => dropdown.addOption(key, key));
                if (this.fromKey) {
                    dropdown.setValue(this.fromKey);
                }
                dropdown.onChange(value => {
                    this.fromKey = value;
                });
            });

        new Setting(contentEl)
            .setName('Chord Type')
            .setDesc('Choose output format for chords')
            .addDropdown(dropdown => dropdown
                .addOption(ChordType.ALPHA, 'Alpha (C, G, Am, etc.)')
                .addOption(ChordType.NASHVILLE, 'Nashville Numbers (1, 5, 6m, etc.)')
                .setValue(this.chordType)
                .onChange(value => {
                    this.chordType = value as ChordType;
                    if (value === ChordType.NASHVILLE) {
                        this.toKey = '##';
                        targetKeyDropdown.setDisabled(true);
                        targetKeySetting.setDesc('Not applicable for the selected chord type');
                    } else {
                        this.toKey = this.fromKey || 'C';
                        targetKeyDropdown.setDisabled(false);
                        targetKeySetting.setDesc('Choose the key to transpose to');
                    }
                }));

        let targetKeyDropdown: any;
        const targetKeySetting = new Setting(contentEl)
            .setName('Target Key')
            .setDesc('Choose the key to transpose to')
            .addDropdown(dropdown => {
                targetKeyDropdown = dropdown;
                FileTransposer.KEYS.forEach(key => dropdown.addOption(key, key));
                dropdown.setValue(this.toKey);
                dropdown.onChange(value => {
                    this.toKey = value;
                });
            });

        if (this.chordType !== ChordType.ALPHA) {
            targetKeyDropdown.setDisabled(true);
            targetKeySetting.setDesc('Not applicable for the selected chord type');
        }

        const buttonContainer = contentEl.createDiv({ cls: 'chopro-modal-button-container' });

        new ButtonComponent(buttonContainer)
            .setButtonText('Cancel')
            .onClick(() => this.close());

        new ButtonComponent(buttonContainer)
            .setButtonText('Transpose')
            .setCta()
            .onClick(() => {
                if (this.chordType === ChordType.ALPHA && !this.fromKey) {
                    new Notice('Cannot transpose without the current key.');
                    return;
                }
                
                this.onConfirm({
                    fromKey: this.fromKey || undefined,
                    toKey: this.toKey,
                    chordType: this.chordType
                });
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
