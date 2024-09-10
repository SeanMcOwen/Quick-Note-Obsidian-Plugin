# Quick Note Plugin

The following plugin is a very early stage Obsidian plugin meant to accelerate the speed of note taking and linking with additional features. The core features are:

- **Find Possible Aliases**: By clicking the merge icon on the left side, a list of all display names used for the current page but not added as an alias are shown with options to add them to the aliases metadata of that note.
- **Solidify Links**: By clicking the icon on the left side, one can take all the links to a current page and change them so that if the link is [[XYZ]] it is converted to [[XYZ|XYZ]] ensuring that even if this note's name is changed that the display names of its links will not be automatically changed but the actual link to the page will.
- **Silently Create Note**: To avoid needing to pan to another page, highlight a selection, right click and select this option which will create the note but not pan over to the page.
- **Silently Create Note with Different Name**: Same as silently create note but with the ability to change the name of the note
- **Link to Note as Alias**: To link a display name to some alias and possibly add it into the aliases attribute, highlight a selection, right click and select this option.


## Find Possible Aliases

- Called by clicking the merge icon on the life side
- Will find every instance of the current file, e.g. MyFile, and see all times it is used as the root note such as [[MyFile|MyFileOtherName]]
- Any display names which are not currently represented as an alias are shown in a modal with the option to add these aliases for easier future linking of files

## Solidify Links

- Called by clicking the shield on the left side
- Will change all links from [[MyFile]] to [[MyFile|MyFile]]

## Silenty Create Note

- Called by highlighting a section, right clicking then calling "Silently Create Note"
- Creates a new note with the given name in the background instead of panning over to it

## Silently Create Note with Different Name

- Called by highlighting a section, right clicking then calling "Silently Create Note with Different Name"
- Brings up a modal that asks one to:
    - Specify the name of the silent note to create
    - Specify whether the highlighted text should be added as an alias
- In the case that the note is already present, an alert will come up that the note already exists but the link will still be added

## Link to Note as Alias

- Called by highlighting a section, right clicking then calling "Link to Note as Alias"
- Brings up a modal that asks one to:
    - Change the display name
    - Specify the file name, you can either write it in or when you click on the text it will also bring up a suggestion menu of current names
    - The option of whether to add the display name as an alias