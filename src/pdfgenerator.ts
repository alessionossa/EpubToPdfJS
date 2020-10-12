//import * as ppt from "puppeteer"
import puppeteer from 'puppeteer'
import *  as path from "path"
import *  as fs from "fs"
import { ViewPort } from './epubanalyzer';

export class PdfGenerator {

    pages: string[];
    pdfPages: string[];
    directory: string;

    constructor(markup_files: string[], directory: string) {
        this.pages = markup_files;
        this.directory = directory;
        this.pdfPages = [];
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

        const modViewPort: ViewPort = {
            width: Number(viewPort.width) + 2,
            height: Number(viewPort.height) + 2
        }

        for (const page of this.pages) {
            console.log("Converting " + page)

            
            let absPagePath = path.resolve(page);
            absPagePath = absPagePath.replace(/^\//g, 'file:///');
            console.log(absPagePath)
            await pptPage.goto(absPagePath)

            const pdfPath = path.join('pdfs', path.basename(page).replace('.xhtml', '.pdf'))
            pptPage.emulateMediaType("print");
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

            console.log(options)
            await pptPage.pdf(options)

            await pptPage.screenshot({path: path.basename(page).replace('.xhtml', '.png')})
            
        }
        await pptPage.close()

        console.log('---Alle pages converted')
        await browser.close()
    }
}