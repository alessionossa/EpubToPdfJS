import * as path from "path"
import * as xmlParser from "xml2js";
import * as fs from "fs";
import * as util from "util"

export class EpubAnalyzer {

    directory: string;
    opfRelFile: string | null;

    constructor(directory: string) {
        this.directory = directory;
        this.opfRelFile = null;
    }

    async getOpfFile(): Promise<string> {
        if (this.opfRelFile) {
            return this.opfRelFile
        }
        const containerFile = path.join(this.directory, "META-INF/container.xml")
        const containerString = fs.readFileSync(containerFile)
        const containerContent = await xmlParser.parseStringPromise(containerString);
        //console.log(util.inspect(containerContent, false, null))
        const opfRelPath = containerContent.container.rootfiles[0].rootfile[0].$["full-path"];
        this.opfRelFile = opfRelPath
        return opfRelPath
    }

    async getPages(): Promise<any[]> {
        let pages: any[] = []
        const opfRelPath = await this.getOpfFile();

        const opfFilePath = path.join(this.directory, opfRelPath)
        const opfDir = path.dirname(opfFilePath);
        const opfString = fs.readFileSync(opfFilePath)
        const opfContent = await xmlParser.parseStringPromise(opfString);

        const itemReferences = opfContent.package.spine[0].itemref;
        itemReferences.forEach((itemRef: any) => {
            opfContent.package.manifest[0].item.find((element: any) => {
                if (element.$.id == itemRef.$.idref) {
                    const src = path.join(opfDir, element.$.href)
                    pages.push(src)
                }
            })
        });

        console.log("Found " + pages.length + " pages.")
        console.log(pages)
        return pages
    }
}