import { PDFName, PDFDict, PDFString, PDFArray, PDFNull, PDFDocument, PDFPage, PDFRef, PDFNumber, PDFPageLeaf } from "pdf-lib";
import * as fs from "fs";


// Inspired by https://github.com/Hopding/pdf-lib/issues/127 (https://github.com/Hopding/pdf-lib/issues/127#issuecomment-641710694)
export class PDFOutliner {

  pdfPath: string;
  document: PDFDocument | null;

  constructor(pdfPath: string) {
    this.pdfPath = pdfPath;
    this.document = null;
  }

  async loadDocument() {
    if (this.document === null) {
      this.document = await PDFDocument.load(
        fs.readFileSync(this.pdfPath)
      );
    }

  }

  getPageRefs(): PDFRef[] {
    const refs: PDFRef[] = [];
    this.document!.catalog.Pages().traverse((kid, ref) => {
      if (kid instanceof PDFPageLeaf) refs.push(ref);
    });
    return refs;
  }

  private createOutlineItem(title: string, parent: PDFRef, page: PDFRef, relations: { next: PDFRef | null, prev: PDFRef | null}): PDFDict {
  
    let destArray = PDFArray.withContext(this.document!.context);
    destArray.push(page);
    destArray.push(PDFName.of("XYZ"));
    destArray.push(PDFNull);
    destArray.push(PDFNull);
    destArray.push(PDFNull);
  
    const map = new Map()
    map.set(PDFName.Title, PDFString.of(title));
    map.set(PDFName.Parent, parent);
    if (relations.next) {
      map.set(PDFName.of("Next"), relations.next);
    }
    if (relations.prev) {
      map.set(PDFName.of("Prev"), relations.prev);
    }
    map.set(PDFName.of("Dest"), destArray);
  
    return PDFDict.fromMapWithContext(map, this.document!.context);
  }

  private createOutlinesDict(): PDFRef {
    // No outlines yet
    // First: create outlines dict
    const outlinesDictRef = this.document!.context.nextRef();

    const outlinesDictMap = new Map();
    outlinesDictMap.set(PDFName.Type, PDFName.of("Outlines"));
    outlinesDictMap.set(PDFName.of("First"), PDFNull);
    outlinesDictMap.set(PDFName.of("Last"), PDFNull);
    outlinesDictMap.set(PDFName.of("Count"), PDFNumber.of(0));

    const outlinesDict = PDFDict.fromMapWithContext(outlinesDictMap, this.document!.context);

    // First 'Outline' object. Refer to table H.3 in Annex H.6 of PDF Specification doc.
    this.document!.context.assign(outlinesDictRef, outlinesDict);

    // Pointing the "Outlines" property of the PDF's "Catalog" to the first object of your outlines
    this.document!.catalog.set(PDFName.of("Outlines"), outlinesDictRef)

    return outlinesDictRef
  }

  private appendChildBookmark(parentDict: PDFDict, childRef: PDFRef): PDFDict {
    let oldCountObj = parentDict.get(PDFName.of("Count"))

    if (!oldCountObj) {
      oldCountObj = PDFNumber.of(0)
    }

    const oldCount = oldCountObj as PDFNumber
    
    if (oldCount.asNumber() == 0) {
      parentDict.set(PDFName.of("First"), childRef)
    }

    const newCountNumber = oldCount.asNumber() + 1

    parentDict.set(PDFName.of("Count"), PDFNumber.of(newCountNumber))
    parentDict.set(PDFName.of("Last"), childRef)

    return parentDict
  }

  private updatePrevBookmark(prevRef: PDFRef, newRef: PDFRef) {
    const parentObj = this.document!.context.lookupMaybe(prevRef, PDFDict)
    //const nextRef = parentObj!.get(PDFName.of("Next")) as PDFRef

    parentObj!.set(PDFName.of("Next"), newRef)
    this.document!.context.assign(prevRef, parentObj!);
  }

  private insertBookmark(parent: PDFDict, parentRef: PDFRef, childRef: PDFRef, bookData: ANPDFBookmark): PDFDict {
    const lastRefObj = parent.get(PDFName.of("Last"))
        
    const newParent = this.appendChildBookmark(parent, childRef)

    let lastRef: PDFRef | null
    if (lastRefObj) {
      lastRef = lastRefObj as PDFRef

      this.updatePrevBookmark(lastRef, childRef)
    } else { lastRef = null }

    const outlineItem = this.createOutlineItem(bookData.title, parentRef, bookData.destPage,
                                          { next: null, prev: lastRef });
    
    this.document!.context.assign(parentRef, newParent);

    return outlineItem
  }

  addBookmark(title: string, destPage: number, parent: PDFRef | null = null): PDFRef | undefined {
    console.log('Adding bookmark: ' + title)
    const outlinesObj = this.document!.catalog.get(PDFName.of("Outlines"));

    let outlinesDictRef: PDFRef
    if (!(outlinesObj instanceof PDFRef)) {
      outlinesDictRef = this.createOutlinesDict();
    } else {
      console.log("Outline already present");
      outlinesDictRef = outlinesObj as PDFRef
    }

    const outlinesDictGet = this.document!.context.lookupMaybe(outlinesDictRef, PDFDict)
    if (outlinesDictGet) {
      const destPageRef = this.document!.getPage(destPage).ref
      const outlineItemRef = this.document!.context.nextRef();

      let outlineItem: PDFDict
      if (parent) {
        const parentObj = this.document!.context.lookupMaybe(parent, PDFDict)

        if (parentObj) {
          outlineItem = this.insertBookmark(parentObj, parent, outlineItemRef, { title: title, destPage: destPageRef })
        }
      } else {
        outlineItem = this.insertBookmark(outlinesDictGet, outlinesDictRef, outlineItemRef, { title: title, destPage: destPageRef})
      }

      this.document!.context.assign(outlineItemRef, outlineItem!);

      return outlineItemRef;
    } else {
      console.error("Cannot find bookmarks object")      
    }
  }

  /*
  async sample() {
    const pageRefs = this.getPageRefs();

    const outlinesDictRef = this.document!.context.nextRef();
    const outlineItem1Ref = this.document!.context.nextRef();
    const outlineItem2Ref = this.document!.context.nextRef();
    const outlineItem3Ref = this.document!.context.nextRef();

    const outlineItem1 = this.createOutlineItem(
      'Page 1',
      outlinesDictRef,
      pageRefs[0],
      {
        next: outlineItem2Ref,
        prev: null
      }
    );

    const outlineItem2 = this.createOutlineItem(
      'Page 2',
      outlinesDictRef,
      pageRefs[1],
      {
        next: outlineItem3Ref,
        prev: outlineItem1Ref
      }
    );

    const outlineItem3 = this.createOutlineItem(
      'Page 3',
      outlinesDictRef,
      pageRefs[2],
      {
        next: outlineItem3Ref,
        prev: outlineItem1Ref
      }
    );

    const outlinesDictMap = new Map();
    outlinesDictMap.set(PDFName.Type, PDFName.of("Outlines"));
    outlinesDictMap.set(PDFName.of("First"), outlineItem1Ref);
    outlinesDictMap.set(PDFName.of("Last"), outlineItem3Ref);
    outlinesDictMap.set(PDFName.of("Count"), PDFNumber.of(3));

    const outlinesDict = PDFDict.fromMapWithContext(outlinesDictMap, this.document!.context);

    // First 'Outline' object. Refer to table H.3 in Annex H.6 of PDF Specification doc.
    this.document!.context.assign(outlinesDictRef, outlinesDict);

    // Actual outline items that will be displayed
    this.document!.context.assign(outlineItem1Ref, outlineItem1);
    this.document!.context.assign(outlineItem2Ref, outlineItem2);
    this.document!.context.assign(outlineItem3Ref, outlineItem3);

    // Pointing the "Outlines" property of the PDF's "Catalog" to the first object of your outlines
    this.document!.catalog.set(PDFName.of("Outlines"), outlinesDictRef)

    await this.saveTo('./with_outline.pdf');
  }
  */

  async saveTo(path: string) {
    const pdfBytes = await this.document!.save();

    fs.writeFileSync(path, pdfBytes);
  }
}

interface ANPDFBookmark {
    title: string;
    destPage: PDFRef
}

/*
(async () => {
  
  //const outliner = new PDFOutliner("sample.pdf");
  //await outliner.loadDocument();
  //outliner.sample();
  
  
  const modifier = new PDFOutliner("sample_no.pdf");
  await modifier.loadDocument();
  const parent = modifier.addBookmark("Test add", 2, null);
  const pchild = modifier.addBookmark("Test child", 3, parent);
  const pchild2 = modifier.addBookmark("Test child 2", 4, parent);
  modifier.addBookmark("Test nipote", 4, pchild);

  await modifier.saveTo('./with_outline2.pdf');
})() */