// main - ChoPro Obsidian Plugin

import { Plugin, PluginSettingTab, Setting, App, Notice, MarkdownView, Modal, ButtonComponent } from 'obsidian';
import { ChoproProcessor } from './chopro';
import { ChoproStyleManager } from './styles';
import { FileTransposer, TransposeOptions } from './transpose';

export interface ChoproPluginSettings {
    chordColor: string;
    chordSize: string;
    showDirectives: boolean;
    superscriptChordMods: boolean;
    chordDecorations: string;
    italicAnnotations: boolean;
}

const DEFAULT_SETTINGS: ChoproPluginSettings = {
    chordColor: '#2563eb',  // blue
    chordSize: '1em',
    showDirectives: true,
    superscriptChordMods: false,
    chordDecorations: 'none',
    italicAnnotations: true
};

export default class ChoproPlugin extends Plugin {
    settings: ChoproPluginSettings;
    processor: ChoproProcessor;
    fileTransposer: FileTransposer;

    async onload() {
        await this.loadSettings();

        // Initialize the processor with current settings
        this.processor = new ChoproProcessor(this.settings);
        this.fileTransposer = new FileTransposer(this.app);

        this.registerMarkdownCodeBlockProcessor('chopro', (source, el, ctx) => {
            this.processChoproBlock(source, el);
        });

        // Add transpose command
        this.addCommand({
            id: 'transpose-chopro',
            name: 'Transpose ChoPro in current file',
            checkCallback: (checking: boolean) => {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView) {
                    if (!checking) {
                        this.openTransposeModal();
                    }
                    return true;
                }
                return false;
            }
        });

        this.addSettingTab(new ChoproSettingTab(this.app, this));

        ChoproStyleManager.applyStyles(this.settings);
    }

    private async openTransposeModal() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active markdown file');
            return;
        }

        const file = activeView.file;
        if (!file) {
            new Notice('No file is currently open');
            return;
        }

        const content = await this.app.vault.read(file);
        const key = this.fileTransposer.extractKeyFromFrontmatter(content);

        const modal = new TransposeModal(this.app, key, async (options) => {
            try {
                await this.fileTransposer.transposeFile(file, options);
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

class TransposeModal extends Modal {
    private fromKey: string | null = null;
    private toKey: string = 'C';
    private toNashville: boolean = false;
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

        // Current key selection
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

        // Target key selection
        new Setting(contentEl)
            .setName('Target Key')
            .setDesc('Choose the key to transpose to')
            .addDropdown(dropdown => {
                FileTransposer.KEYS.forEach(key => dropdown.addOption(key, key));
                dropdown.setValue(this.toKey);
                dropdown.onChange(value => {
                    this.toKey = value;
                    this.toNashville = false;
                });
            });

        // Nashville option
        new Setting(contentEl)
            .setName('Nashville Numbers')
            .setDesc('Convert to Nashville number system instead of transposing')
            .addToggle(toggle => toggle
                .setValue(this.toNashville)
                .onChange(value => {
                    this.toNashville = value;
                    if (value) {
                        this.toKey = this.fromKey || 'C';
                    }
                }));

        // Buttons
        const buttonContainer = contentEl.createDiv({ cls: 'chopro-modal-button-container' });
        
        new ButtonComponent(buttonContainer)
            .setButtonText('Cancel')
            .onClick(() => this.close());

        new ButtonComponent(buttonContainer)
            .setButtonText('Transpose')
            .setCta()
            .onClick(() => {
                if (!this.fromKey && !this.toNashville) {
                    new Notice('Cannot transpose without knowing the current key. Please add a "key" property to the frontmatter.');
                    return;
                }
                
                this.onConfirm({
                    fromKey: this.fromKey || undefined,
                    toKey: this.toNashville ? this.fromKey || 'C' : this.toKey,
                    toNashville: this.toNashville
                });
                this.close();
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
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
            .setDesc('Font size for chord text (CSS size value)')
            .addText(text => text
                .setPlaceholder('1em')
                .setValue(this.plugin.settings.chordSize)
                .onChange(async (value) => {
                    this.plugin.settings.chordSize = value || DEFAULT_SETTINGS.chordSize;
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

            const trimmedChopro = choproPreview.replace(/^[ \t]+|[ \t]+$/gm, '');
            this.plugin.processor.processBlock(trimmedChopro, preview);
        };
        
        // Initial preview render
        updatePreview();
    }
}
