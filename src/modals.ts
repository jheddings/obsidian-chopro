// modals - Modal classes for the ChoPro Obsidian Plugin

import { App, Modal, Setting, ButtonComponent, Notice } from "obsidian";

import { TransposeOptions, TransposeUtils } from "./transpose";
import { Logger } from "./logger";

export class TransposeModal extends Modal {
    private fromKey: string | null = null;
    private toKey: string = "C";
    private chordType: string = "alpha";
    private logger: Logger = Logger.getLogger("TransposeModal");
    private onConfirm: (options: TransposeOptions) => void;

    constructor(
        app: App,
        currentKey: string | null,
        onConfirm: (options: TransposeOptions) => void
    ) {
        super(app);
        this.fromKey = currentKey;
        this.toKey = currentKey || "C";
        this.onConfirm = onConfirm;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "Transpose ChoPro" });

        new Setting(contentEl)
            .setName("Current Key")
            .setDesc("Select the current key of the song")
            .addDropdown((dropdown) => {
                TransposeUtils.getAllKeys().forEach((key) => dropdown.addOption(key, key));
                if (this.fromKey && TransposeUtils.isValidKey(this.fromKey)) {
                    dropdown.setValue(this.fromKey);
                }
                dropdown.onChange((value) => {
                    this.fromKey = value;
                });
            });

        new Setting(contentEl)
            .setName("Chord Type")
            .setDesc("Choose output format for chords")
            .addDropdown((dropdown) =>
                dropdown
                    .addOption("alpha", "Alpha (C, G, Am, etc.)")
                    .addOption("nashville", "Nashville Numbers (1, 5, 6m, etc.)")
                    .setValue(this.chordType)
                    .onChange((value) => {
                        this.chordType = value;
                        if (value === "nashville") {
                            this.toKey = "##";
                            targetKeyDropdown.setDisabled(true);
                            targetKeySetting.setDesc("Not applicable for the selected chord type");
                        } else {
                            this.toKey = this.fromKey || "C";
                            targetKeyDropdown.setDisabled(false);
                            targetKeySetting.setDesc("Choose the key to transpose to");
                        }
                    })
            );

        let targetKeyDropdown: any;
        const targetKeySetting = new Setting(contentEl)
            .setName("Target Key")
            .setDesc("Choose the key to transpose to")
            .addDropdown((dropdown) => {
                targetKeyDropdown = dropdown;
                TransposeUtils.getAllKeys().forEach((key) => dropdown.addOption(key, key));
                dropdown.setValue(this.toKey);
                dropdown.onChange((value) => {
                    this.toKey = value;
                });
            });

        if (this.chordType !== "alpha") {
            targetKeyDropdown.setDisabled(true);
            targetKeySetting.setDesc("Not applicable for the selected chord type");
        }

        const buttonContainer = contentEl.createDiv({
            cls: "chopro-modal-button-container",
        });

        new ButtonComponent(buttonContainer).setButtonText("Cancel").onClick(() => this.close());

        new ButtonComponent(buttonContainer)
            .setButtonText("Transpose")
            .setCta()
            .onClick(() => {
                try {
                    if (this.chordType === "alpha" && !this.fromKey) {
                        new Notice("Cannot transpose without the current key.");
                        return;
                    }

                    const options: TransposeOptions = {
                        fromKey: this.fromKey ? TransposeUtils.parseKey(this.fromKey) : undefined,
                        toKey: TransposeUtils.parseKey(this.toKey),
                    };

                    this.onConfirm(options);
                    this.close();
                } catch (error) {
                    this.logger.error("Transpose validation error:", error);
                    new Notice("Invalid transposition parameters");
                }
            });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
