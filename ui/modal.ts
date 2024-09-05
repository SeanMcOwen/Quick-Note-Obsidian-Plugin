import { App, Editor, Modal, Setting, FuzzySuggestModal, TFile, TextComponent } from 'obsidian';
import MyPlugin from "../main"

export class SolidifyLinkModal extends Modal {
	activeFile: TFile
	linkedFiles: string[]

	constructor(app: App, activeFile: TFile, linkedFiles: string[]) {
		super(app);
		this.activeFile = activeFile
		this.linkedFiles = linkedFiles
	}

	onOpen() {
		const {contentEl} = this;
		const name = this.activeFile.name.replace(".md","")
		contentEl.createEl("p", { text: `Are you sure you want to solidify links for ${name}? This will change all links to be of the form [[${name}|DisplayName]] so that changing this file name won't change their display name.` });
		new Setting(contentEl)
		.addButton((btn) =>
			btn
			.setButtonText("Confirm")
			.setCta()
			.onClick(() => {
				this.linkedFiles.map( async (file) => {
				const cache = this.app.metadataCache.getCache(file)
				const currentFile = this.app.vault.getFileByPath(file)
				if (!cache || !currentFile){
					return
				}
				let cacheLinks = cache.links
				if (!cacheLinks){
					return
				}
				cacheLinks = cacheLinks.filter((l) => l.link.toLowerCase() == this.activeFile.basename.toLowerCase())
				cacheLinks = cacheLinks.filter((l)=> !(l.original.contains("|")))
				let cacheLinks2: string[][] = cacheLinks.map((l) => [l.original, l.link, l.displayText ?l.displayText: l.link])
				cacheLinks2 = [... new Set(cacheLinks2)]
				
				let fileContent = await this.app.vault.read(currentFile);

				cacheLinks2.forEach((l) => fileContent = fileContent.replace(l[0], "[["+l[1]+"|"+l[2]+"]]"))

				await this.app.vault.modify(currentFile, fileContent);
				
			});

				this.close();
			}));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

export class UnusedAliasModal extends Modal {
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

  export class SilentNoteModal extends Modal{
	plugin: MyPlugin
	selectedText: string
	noteText: string
	allFiles: string[]
	addAliasBool: boolean
	editor: Editor

	constructor(plugin: MyPlugin, selectedText: string, allFiles: string[], editor: Editor) {
		super(plugin.app);
		this.selectedText = selectedText
		this.allFiles = allFiles
		this.noteText = selectedText
		this.addAliasBool = true
		this.editor = editor
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl("h1", { text: "Create new silent note"});

		new Setting(contentEl).setName("New File Name:").addText((text) =>
			{
				text.setValue(this.selectedText)
				text.onChange((value) => {this.noteText=value})
			}
	
			);

		new Setting(contentEl)
            .setName('Add "'+this.selectedText+'" as an Alias')
            .addToggle(toggle => {
				this.addAliasBool = toggle.getValue()

                toggle.onChange(value => {
                    this.addAliasBool = value
                });
            });

		new Setting(contentEl)
			.addButton((btn) =>
				btn
				.setButtonText("Submit")
				.setCta()
				.onClick(async () => {
						const fileName = this.noteText+".md";
						if (this.allFiles.map((x) => x.toLowerCase()).contains(this.noteText.toLowerCase())){
							alert("Name already used!")
						}
						else{await this.app.vault.create(fileName, '');}
						this.editor.replaceSelection("[[" + this.noteText+"|"+ this.selectedText + "]]")
						if (this.addAliasBool){this.addAlias(this.selectedText, this.noteText)}
						this.close();

				}));
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}

	async addAlias(alias: string, sourceFile: string){
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const sourceFile2 = this.app.vault.getFileByPath(sourceFile+".md")!

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		await this.app.fileManager.processFrontMatter(sourceFile2, (frontMatter) => { const aliases = frontMatter.aliases
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

  export class AliasLinkModal extends Modal{
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
		await this.app.fileManager.processFrontMatter(this.aliasItem!, (frontMatter) => { 
			

			let aliases = frontMatter.aliases
			if (frontMatter.alias){
				aliases = [...aliases, ...frontMatter.alias]
				aliases = [... new Set(aliases)]
			}
			frontMatter.alias = undefined
			frontMatter.aliases = aliases

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