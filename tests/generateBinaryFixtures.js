const fs = require('fs');
const path = require('path');
const JSZip = require('../JUI_TAWDE/node_modules/jszip');

const fixturesDir = path.join(__dirname, 'fixtures');

async function createDocx() {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  const docText = `Question 1: What is the main purpose of an Operating System?
A. Resource management
B. Running web browsers only
C. Compiling source code
D. Hardware manufacturing
Answer: A
Explanation: An OS manages computer hardware and software resources.

Question 2: Which scheduling algorithm is non-preemptive?
A. Round Robin
B. First-Come First-Served
C. Shortest Remaining Time First
D. Multilevel Queue
Answer: B
Explanation: First-Come First-Served runs tasks to completion without preemption.`;

  const paragraphs = docText.split('\n').map(p =>
    `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`
  ).join('');

  zip.folder('word').file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
  </w:body>
</w:document>`);

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(fixturesDir, 'sample_quiz.docx'), buffer);
  console.log('sample_quiz.docx created successfully.');
}

function createMinimalPdf() {
  // Minimal valid PDF text document
  const content = `BT
/F1 12 Tf
50 750 Td
(Question 1: Which protocol translates URLs into IP addresses?) Tj
0 -20 Td
(A. DHCP) Tj
0 -15 Td
(B. DNS) Tj
0 -15 Td
(C. FTP) Tj
0 -15 Td
(D. ARP) Tj
0 -20 Td
(Answer: B) Tj
0 -20 Td
(Explanation: DNS resolves human-readable domain names to numeric IP addresses.) Tj
ET`;

  const streamLen = Buffer.byteLength(content);
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000247 00000 n 
0000000${(300 + streamLen).toString().padStart(3, '0')} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${400 + streamLen}
%%EOF`;

  fs.writeFileSync(path.join(fixturesDir, 'sample_quiz.pdf'), pdfString, 'binary');
  console.log('sample_quiz.pdf created successfully.');
}

async function run() {
  await createDocx();
  createMinimalPdf();
}

run();
