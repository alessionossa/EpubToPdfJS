const puppeteer = require('puppeteer')
const fs = require('fs');
import { Command } from 'commander'
import * as FileMan from "./filemanager"
const program = new Command();

let inputFile

program.version('0.1.0')
program
    .requiredOption("-f, --file <FILE>", "ePub file to convert", /^.*(\.epub)$/i)

program.parse(process.argv)

console.log(program.opts())
console.log('--- Epub to PDF conversion started')
let file = new FileMan.default(program.file)
file.extractZip()
console.log(file.epubFile)
console.log(file.directory)
file.clearAll()