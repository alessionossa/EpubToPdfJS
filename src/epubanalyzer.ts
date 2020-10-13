import * as path from "path"
import * as xmlParser from "xml2js";
import * as fs from "fs";
import cheerio from "cheerio"
import * as util from "util"
import { OutlineNode, ViewPort } from "./interfaces"

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

    async getPages(): Promise<string[]> {
        let pages: string[] = []
        
        const opfContent = await this.getOpfContent();

        const opfFilePath = path.join(this.directory, this.opfRelFile!)
        const opfDir = path.dirname(opfFilePath);

        const itemReferences = opfContent.package.spine[0].itemref;
        itemReferences.forEach((itemRef: any) => {
            const foundElement = opfContent.package.manifest[0].item.find((element: any) => {
                if (element.$.id == itemRef.$.idref) {
                    return true
                }
            })
            const src = path.join(opfDir, foundElement.$.href)
            pages.push(src)
        });

        console.log("Found " + pages.length + " pages.")
        console.log(pages)
        return pages
    }

    private async getOpfContent(): Promise<any> {
        const opfRelPath = await this.getOpfFile();

        const opfFilePath = path.join(this.directory, opfRelPath)
        const opfString = fs.readFileSync(opfFilePath)
        const opfContent = await xmlParser.parseStringPromise(opfString);

        return opfContent
    }

    async getViewPort(page: string): Promise<ViewPort> {
        const pageString = fs.readFileSync(page)
        const pageContent = await xmlParser.parseStringPromise(pageString);
        const viewportElem = pageContent.html.head[0].meta.find((node: any) => {
            return node.$.name == 'viewport'
        })

        const content: string[] = viewportElem.$.content.split(',')
        let viewport: any = {}
        content.forEach(viewportComponent => {
            const [name,  val] = viewportComponent.split('=')
            viewport[name.trim()] = val.trim()
        })
        return viewport
    }


    async extarctOutlines(): Promise<OutlineNode[]> {
        let pages: string[] = []
        
        const opfContent = await this.getOpfContent();

        const opfFilePath = path.join(this.directory, this.opfRelFile!)
        const opfDir = path.dirname(opfFilePath);

        
        const navElem = opfContent.package.manifest[0].item.find((element: any) => {
            if (element.$.properties !== undefined && element.$.properties == "nav") {
                return true
            }
        });
        const navSrc = path.join(opfDir, navElem.$.href)

        const navString = fs.readFileSync(navSrc!)
        const navContent = await cheerio.load(navString);
        const navList = navContent("#toc").find("nav[epub\\:type='toc'] > ol").children("li")

        const nodes = this.parseEpubNav(navContent, navList)
        return nodes
    }

    private parseEpubNav(root: cheerio.Root,list: cheerio.Cheerio): OutlineNode[] {
        let outlineNodes: OutlineNode[] = []
        list.each((index, element) => {
            console.log(`Index ${index}`)
            const node = root(element).find("a")
            const title = node.text()

            const pageHref = node.attr("href")!
            const pageNumStr = /[a-zA-Z]([0-9]+)\.xhtml/g.exec(pageHref)
            const pageNumber = Number(pageNumStr![1])

            const children = node.find("ol").children("li")
            let childNodes: OutlineNode[] | undefined = undefined
            if (children.length > 0) {
                childNodes = this.parseEpubNav(root, children)
            }

            outlineNodes.push({
                title: title,
                page: pageNumber,
                children: childNodes
            })

        })

        return outlineNodes
    }
}