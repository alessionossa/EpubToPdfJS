//import * as ppt from "puppeteer"
import puppeteer from 'puppeteer'
import *  as path from "path"

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
                '--no-first-run'
            ]
        });

        for (const page of this.pages) {
            console.log("Converting " + page)

            const pptPage = await browser.newPage();
            const absPagePath = path.resolve(page);
            console.log(absPagePath)
            pptPage.goto(absPagePath)

            await pptPage.close()
        }

        await browser.close()
    }
}