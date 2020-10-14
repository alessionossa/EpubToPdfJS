//import * as ppt from "puppeteer"
import puppeteer from 'puppeteer'
import *  as path from "path"
import *  as fs from "fs"
import PdfMerger from "pdf-merger-js"
import { ViewPort, OutlineNode } from './interfaces';
import { PDFOutliner } from './pdfoutline';
import { PDFRef } from 'pdf-lib';

export class PdfGenerator {

    pages: string[];
    pdfPages: string[];
    directory: string;

    finalPdf: string | null;

    constructor(markup_files: string[], directory: string) {
        this.pages = markup_files;
        this.directory = directory;
        this.pdfPages = [];
        this.finalPdf = null
    }

    async convertToPdf(viewPort: ViewPort) {

        const browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null, 
            args: [
                '--no-first-run',
                '--no-sandbox',
                '--allow-file-access-from-files'
            ]
        });

        const pptPage = await browser.newPage();

        if(!fs.existsSync('pdfs/')) {
            fs.mkdirSync('pdfs');
        }

        if(!fs.existsSync('screens/')) {
            fs.mkdirSync('screens');
        }

        let modViewPort: ViewPort = {
            width: Number(viewPort.width),
            height: Number(viewPort.height)
        }
        


        for (const page of this.pages) {
            console.log("Converting " + page)

            
            let absPagePath = path.resolve(page);
            absPagePath = absPagePath.replace(/^\//g, 'file:///');
            //console.log(absPagePath)
            await pptPage.goto(absPagePath)

            const pdfPath = path.join('pdfs', path.basename(page).replace('.xhtml', '.pdf'))
            //pptPage.emulateMediaType("screen");
            const options: puppeteer.PDFOptions = {
                path: pdfPath,
                height: modViewPort.height.toString() + 'px',
                width: modViewPort.width.toString() + 'px',
                margin: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0
                },
                printBackground: true
            }

            const screenPath = path.join('screens', path.basename(page).replace('.xhtml', '.png'))
            await pptPage.screenshot({path: screenPath})
            //console.log(options)
            await pptPage.pdf(options)
            this.pdfPages.push(pdfPath)
        }
        await pptPage.close()

        console.log('---Alle pages converted')
        await browser.close()
    }

    async mergePdfs() {
        const merger = new PdfMerger();

        this.pdfPages.forEach((page) => {
            merger.add(page, ['1']);
        })

        this.finalPdf = './merged.pdf'
        await merger.save(this.finalPdf)
        
        console.log('---Merged PDFs')
    }

    async addOutline(nodes: OutlineNode[]) {
        const outliner = new PDFOutliner(this.finalPdf!)
        await outliner.loadDocument();

        this.addOutlinesNodes(outliner, nodes)

        await outliner.saveTo('./outline.pdf');
    }

    private addOutlinesNodes(outliner: PDFOutliner, nodes: OutlineNode[], parent: PDFRef | null = null) {
        //console.log("\nOutlines Level:")
        //console.log(nodes)
        for (const node of nodes) {
            const bookmark = outliner.addBookmark(node.title, node.page, parent);

            if (node.children) {
                this.addOutlinesNodes(outliner, node.children, bookmark);
            }
        }
    }
}