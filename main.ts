import { App, Editor, MarkdownView, Modal, Plugin, PluginSettingTab, Setting, TAbstractFile, FuzzySuggestModal, TFile, TextComponent } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	notes: TFile[]

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon('merge', 'Find Possible Aliases', (evt: MouseEvent) => {
			const activeFile = this.app.workspace.getActiveFile()
			if (!activeFile) {
				console.log('No active file found.');
				return;
			}


			const linkedFiles = Object.entries(this.app.metadataCache.resolvedLinks).filter(([_, value]) => Object.keys(value).contains(activeFile.name)).map(([key, _]) => key)
			
			
			let aliases = linkedFiles.map( (file) => {
				const cache = this.app.metadataCache.getCache(file)
				if (!cache){
					return
				}
				let cacheLinks = cache.links
				if (!cacheLinks){
					return
				}
				cacheLinks = cacheLinks.filter((l) => l.link.toLowerCase() == activeFile.basename.toLowerCase())
				const aliasNames = cacheLinks.map((x) => x.displayText)
				return aliasNames
			}).flat();
			aliases = [... new Set(aliases)]


			const cache = this.app.metadataCache.getFileCache(activeFile)

			if (!cache){
				console.log('No cache');
				return;
			}
			let oldAliases: string[] = []
			if (!cache.frontmatter || !cache.frontmatter.aliases){
				console.log('No aliases for the cache');
			}
			else {
				oldAliases = cache.frontmatter.aliases
			}
			oldAliases = oldAliases.map((x)=> x.toLowerCase())
			const newAliases = aliases.filter((item): item is string => item !== undefined).filter((x) => !(oldAliases.contains(x.toLowerCase())))
			console.log(newAliases)

			new UnusedAliasModal(this.app, activeFile, newAliases).open();
		});

		this.addRibbonIcon('dice', 'Solidify Links', (evt: MouseEvent) => {
			const activeFile = this.app.workspace.getActiveFile()
			if (activeFile){new SolidifyLinkModal(this.app, activeFile).open()}
			
		})

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});
		setTimeout(() => this.notes = this.getAllNotes(), 200)

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, view) => {
            menu.addItem(item => {
                item.setTitle('Silently Create Note');
                item.setIcon('pencil'); 
                item.onClick(() => this.createNoteSilent(editor));
            });
        }));

		this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, view) => {
            menu.addItem(item => {
                item.setTitle('Link to Note as Alias');
                item.setIcon('pencil');
                item.onClick(() => this.aliasLink(editor));
            });
        }));
	}

	getAllNotes() {
        const files = this.app.vault.getFiles();
        const notes = files.filter(file => file.extension === "md");
        return notes;
    }

	createNoteSilent(editor: Editor){
		const selectedText = editor.getSelection()
		const allFiles = this.app.vault.getAllLoadedFiles().map((x: TAbstractFile) => {return x.name.toLowerCase().replace(".md", "")})
		if (!allFiles.contains(selectedText.toLowerCase())){this.createNote(selectedText)}
		editor.replaceSelection("[[" + selectedText + "]]")
	}

	aliasLink(editor: Editor){
		new AliasLinkModal(this.app, editor, this).open();
	}

	async createNote(filename: string) {
		const fileName = filename+".md";
		await this.app.vault.create(fileName, '');
		//const file = await this.app.vault.create(fileName, '');
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class AliasLinkModal extends Modal{
	editor: Editor
	plugin: MyPlugin
	aliasItem: TFile | undefined
	addAliasBool: boolean
	displayName: string
	constructor(app: App, editor: Editor, plugin: MyPlugin) {
		super(app);
		this.editor = editor
		this.plugin = plugin
		this.addAliasBool = true
	}
	onOpen() {
		const {contentEl} = this;
		this.plugin.notes = this.plugin.getAllNotes()
		//setTimeout(() => this.plugin.notes = this.plugin.getAllNotes(), 100)
		
		contentEl.createEl("h1", { text: "Link as Alias" });

		this.displayName = this.editor.getSelection()

		new Setting(contentEl).setName("Display Text:").addText((text) =>
			{
				text.setValue(this.displayName)
				text.onChange((value) => {this.displayName=value})
			}
	
			);

		const handler = (item: TFile, evt: MouseEvent | KeyboardEvent) => {this.aliasItem=item}

		new Setting(contentEl).setName("Alias").addText((text) =>
		{
			text.inputEl.onClickEvent(() => new AliasSuggestModel(this.app, this.plugin, handler, text).open())
			text.onChange((value) => {
				const opt = this.plugin.notes.filter((v) => v.path.toLowerCase().replace(".md","") === value.toLowerCase())
				if (opt.length == 0){
					this.aliasItem = undefined
				}
				else {
					this.aliasItem = opt[0]
				}
				})
		}

		);

		new Setting(contentEl)
		.addButton((btn) =>
			btn
			.setButtonText("Submit")
			.setCta()
			.onClick(() => {
				if(this.aliasItem){
					const selectedText = this.displayName
					this.editor.replaceSelection("[[" + this.aliasItem.path.replace(".md","")+"|"+ selectedText + "]]")
					if (this.addAliasBool && this.aliasItem !== undefined){this.addAlias(selectedText)}
					this.close();
				}
				else{
					alert("Invalid alias!")
				}
				
			}));

			new Setting(contentEl)
            .setName('Add Display Name as Alias')
            .addToggle(toggle => {
				this.addAliasBool = toggle.getValue()

                toggle.onChange(value => {
                    this.addAliasBool = value
                });
            });

	}
	async addAlias(displayName: string){
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		await this.app.fileManager.processFrontMatter(this.aliasItem!, (frontMatter) => { const aliases = frontMatter.aliases
			if(aliases === undefined){
				frontMatter.aliases = [displayName]
			}
			else{
				if (!aliases.map((x: string) => x.toLowerCase()).contains(displayName.toLowerCase())){
					frontMatter.aliases = [...aliases, displayName]
				}
			}})
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}


export class AliasSuggestModel extends FuzzySuggestModal<TFile> {
	plugin: MyPlugin
	textComponent: TextComponent
	handler: (item: TFile, evt: MouseEvent | KeyboardEvent) => void
	constructor(app: App, plugin: MyPlugin, handler: (item: TFile, evt: MouseEvent | KeyboardEvent) => void, text: TextComponent) {
		super(app);
		this.plugin = plugin
		this.handler = handler
		this.textComponent = text
	}
	getItems(): TFile[] {
		return this.plugin.notes;
	}
  
	getItemText(item: TFile): string {
		return item.path.replace(".md","");
	}
  
	onChooseItem(item: TFile, evt: MouseEvent | KeyboardEvent) {
		this.handler(item, evt)
		this.textComponent.setValue(item.path.replace(".md",""))
	}
  }

class UnusedAliasModal extends Modal {
	activeFile: TFile
	newAliases: string[]

	constructor(app: App, activeFile: TFile, newAliases: string[]) {
		super(app);
		this.activeFile = activeFile
		this.newAliases = newAliases
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl("h1", { text: "Potential Aliases ("+this.newAliases.length.toString()+")" });
		this.newAliases.map((alias) => new Setting(contentEl).setName(alias)
		.addButton((btn) =>
			btn
			.setButtonText("Add Alias")
			.setCta()
			.onClick(() => {
				btn.setDisabled(true)
				this.addAlias(alias)
			})))
		

	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}

	async addAlias(alias: string){
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		await this.app.fileManager.processFrontMatter(this.activeFile, (frontMatter) => { const aliases = frontMatter.aliases
			if(aliases === undefined){
				frontMatter.aliases = [alias]
			}
			else{
				if (!aliases.map((x: string) => x.toLowerCase()).contains(alias.toLowerCase())){
					frontMatter.aliases = [...aliases, alias]
				}
			}})
	}
}

class SolidifyLinkModal extends Modal {
	activeFile: TFile
	constructor(app: App, activeFile: TFile) {
		super(app);
		this.activeFile = activeFile
	}

	onOpen() {
		const {contentEl} = this;
		const name = this.activeFile.name.replace(".md","")
		contentEl.createEl("p", { text: `Are you sure you want to solidify links for ${name}? This will change all links to be of the form [[${name}|DisplayName]] so that changing this file name won't change their display name.` });
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}



class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
