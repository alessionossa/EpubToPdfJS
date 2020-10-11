//import * as ppt from "puppeteer"
import puppeteer from 'puppeteer'
import *  as path from "path"
import *  as fs from "fs"

export class PdfGenerator {

    pages: string[];
    pdfPages: string[];
    directory: string;

    constructor(markup_files: string[], directory: string) {
        this.pages = markup_files;
        this.directory = directory;
        this.pdfPages = [];
    }

    async convertToPdf(w: number, h: number) {

        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-first-run',
                '--no-sandbox',
                '--allow-file-access-from-files'
            ]
        });

        const pptPage = await browser.newPage();

        //fs.mkdirSync('pdfs');

        for (const page of this.pages) {
            console.log("Converting " + page)

            
            let absPagePath = path.resolve(page);
            absPagePath = absPagePath.replace(/^\//g, 'file:///');
            console.log(absPagePath)
            await pptPage.goto(absPagePath)

            const pdfPath = path.join('pdfs', path.basename(page).replace('.xhtml', '.pdf'))
            await pptPage.pdf({
                path: pdfPath,
                height: 980,
                width: 641,
                margin: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0
                }
            })
            
        }
        await pptPage.close()

        console.log('---Alle pages converted')
        await browser.close()
    }
}