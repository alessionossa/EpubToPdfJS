const puppeteer = require('puppeteer')
const fs = require('fs');
import { Command } from 'commander'
import { FileManager} from "./filemanager"
import { EpubAnalyzer }  from "./epubanalyzer"
import { PdfGenerator }  from "./pdfgenerator"
import * as util from "util"
const program = new Command();

program.version('0.1.0')
program
    .requiredOption("-f, --file <FILE>", "ePub file to convert", /^.*(\.epub)$/i)

program.parse(process.argv)

//console.log(program.opts())
console.log('--- Epub to PDF conversion started')
let file = new FileManager(program.file)
file.extractZip()
let analyzer = new EpubAnalyzer(file.directory)
analyzer.getPages().then(async (pages) => {
    const pdfGenerator = new PdfGenerator(pages, file.directory)
    const viewPort = await analyzer.getViewPort(pages[0])
    console.log(viewPort)
    await pdfGenerator.convertToPdf(viewPort)
    await pdfGenerator.mergePdfs()
    const outlines = await analyzer.extarctOutlines()
    console.log('---Extracted outlines')
    //console.log(util.inspect(outlines, false, null))
    await pdfGenerator.addOutline(outlines)

}).finally(() => {
    console.log('---All done, cleanup...')
    file.clearAll()
});
