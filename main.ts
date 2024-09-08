import { Editor, Plugin, TAbstractFile, TFile } from 'obsidian';
import { UnusedAliasModal, SolidifyLinkModal, AliasLinkModal, SilentNoteModal } from "./ui/modal";
import {SettingTab} from "./ui/setting"

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface QuickNoteSettings {}

const DEFAULT_SETTINGS: QuickNoteSettings = {}



export default class QuickNotePlugin extends Plugin {
	settings: QuickNoteSettings;
	notes: TFile[]

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon('merge', 'Find Possible Aliases', (evt: MouseEvent) => {
			const activeFile = this.app.workspace.getActiveFile()
			if (!activeFile) {
				alert("No active file!")
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
				alert('No cache');
				return;
			}
			let oldAliases: string[] = []
			if (!(!cache.frontmatter || !cache.frontmatter.aliases)){
				oldAliases = cache.frontmatter.aliases
			}
			oldAliases = [...oldAliases, activeFile.basename.replace(".md","")]
			oldAliases = oldAliases.map((x)=> x.toLowerCase())
			const newAliases = aliases.filter((item): item is string => item !== undefined).filter((x) => !(oldAliases.contains(x.toLowerCase())))

			new UnusedAliasModal(this.app, activeFile, newAliases).open();
		});

		this.addRibbonIcon('shield', 'Solidify Links', (evt: MouseEvent) => {
			const activeFile = this.app.workspace.getActiveFile()

			if (!activeFile) {
				alert("No active file!")
				return;
			}


			const linkedFiles = Object.entries(this.app.metadataCache.resolvedLinks).filter(([_, value]) => Object.keys(value).contains(activeFile.name)).map(([key, _]) => key)



			if (activeFile){new SolidifyLinkModal(this.app, activeFile, linkedFiles).open()}
			
		})

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		setTimeout(() => this.notes = this.getAllNotes(), 200)

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, view) => {
            menu.addItem(item => {
                item.setTitle('Silently Create Note');
                item.setIcon('pencil'); 
                item.onClick(() => this.createNoteSilent(editor));
            });
        }));

		this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, view) => {
            menu.addItem(item => {
                item.setTitle('Silently Create Note with Different Name');
                item.setIcon('pencil'); 
                item.onClick(() => this.createNoteSilent2(editor));
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

	createNoteSilent2(editor: Editor){
		const selectedText = editor.getSelection()
		const allFiles = this.app.vault.getAllLoadedFiles().map((x: TAbstractFile) => {return x.name.toLowerCase().replace(".md", "")})
		new SilentNoteModal(this, selectedText, allFiles, editor).open()
		
		
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


