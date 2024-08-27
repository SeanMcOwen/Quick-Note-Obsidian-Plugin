import { App, PluginSettingTab } from 'obsidian';
import QuickNotePlugin from "../main"

export class SettingTab extends PluginSettingTab {
	plugin: QuickNotePlugin;

	constructor(app: App, plugin: QuickNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

	}
}