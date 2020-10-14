# EpubToPdfJS

A tool to convert pre-paginated ePub3 files to PDF (with outlines).

It is an adaptation to Node.JS from the original project [HAKSOAT/EpubToPdf](https://github.com/alessionossa/EpubToPdf), 
then modified into [alessionossa/EpubToPdf](https://github.com/alessionossa/EpubToPdf), so that I can work with [Puppeteer](https://github.com/puppeteer/puppeteer)
because [wkhtmltopdf](https://wkhtmltopdf.org/) in the old project had some reindering issues.

EpubToPdfJS has only been tested with a single large file (400+ pages) and was purpose built around this file, 
so it probably needs some rework to get it working with other files.
