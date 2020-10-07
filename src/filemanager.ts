import *  as zipManager from "adm-zip"
import *  as fs from "fs"
import *  as path from "path"

class FileManager {

    epubFile: string
    directory: string

    constructor(epubFile: string) {
        this.epubFile = epubFile
        this.directory = epubFile.split('.epub')[0]
    }

    extractZip() {
        var zip = new zipManager.default(this.epubFile)
        zip.extractAllTo(this.directory)
    }

    clearAll() {
        fs.rmdirSync(this.directory, { recursive: true })
    }
}

export default FileManager