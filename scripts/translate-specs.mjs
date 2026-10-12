import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VN_CHAR_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const DICT_REPLACEMENTS = [
  // Headings
  [/^# Tasks:\s*/i, '# Tác vụ (Tasks): '],
  [/^# Implementation Tasks:\s*/i, '# Tác vụ Triển khai (Tasks): '],
  [/^# Feature Specification:\s*/i, '# Đặc tả Tính năng (Feature Specification): '],
  [/^# Implementation Plan:\s*/i, '# Kế hoạch Triển khai (Implementation Plan): '],
  [/^# Research Notes:\s*/i, '# Ghi chú Nghiên cứu (Research): '],
  [/^# Data Model:\s*/i, '# Mô hình Dữ liệu (Data Model): '],
  [/^# Quickstart:\s*/i, '# Kịch bản Kiểm thử Nhanh (Quickstart): '],
  [/^## User Scenarios & Testing\s*(\*\(mandatory\)\*)?/i, '## Kịch bản Người dùng & Kiểm thử *(bắt buộc)*'],
  [/^## Requirements\s*(\*\(mandatory\)\*)?/i, '## Yêu cầu *(bắt buộc)*'],
  [/^## Functional Requirements/i, '## Yêu cầu Chức năng'],
  [/^### Functional Requirements/i, '### Yêu cầu Chức năng'],
  [/^## Success Criteria\s*(\*\(mandatory\)\*)?/i, '## Tiêu chí Thành công *(bắt buộc)*'],
  [/^### Measurable Outcomes/i, '### Kết quả Đo lường được'],
  [/^## Edge Cases/i, '## Các Trường hợp Ngoại lệ'],
  [/^### Edge Cases/i, '### Các Trường hợp Ngoại lệ'],
  [/^## Assumptions/i, '## Các Giả định'],
  [/^## Clarifications/i, '## Làm rõ Yêu cầu (Clarifications)'],
  [/^## Technical Context/i, '## Bối cảnh Kỹ thuật'],
  [/^## Constitution Check/i, '## Kiểm tra Hiến pháp'],
  [/^## Project Structure/i, '## Cấu trúc Dự án'],
  [/^## Complexity Tracking/i, '## Theo dõi Độ phức tạp'],
  [/^## Key Entities/i, '## Các Thực thể Chính'],
  [/^### Key Entities/i, '### Các Thực thể Chính'],
  [/^## Dependencies & Execution Order/i, '## Phụ thuộc & Thứ tự Thực thi'],
  [/^### Phase Dependencies/i, '### Phụ thuộc giữa các Phase'],
  [/^### User Story Dependencies/i, '### Phụ thuộc giữa các User Story'],
  [/^### Within Each User Story/i, '### Bên trong Mỗi User Story'],
  [/^### Parallel Opportunities/i, '### Cơ hội Song song'],
  [/^## Implementation Strategy/i, '## Chiến lược Triển khai'],
  [/^### MVP First/i, '### MVP Trước tiên'],
  [/^### Incremental Delivery/i, '### Phân phối Tăng dần'],
  [/^### Parallel Team Strategy/i, '### Chiến lược Nhóm Song song'],

  // Technical / domain fixes
  [/## Phase\s*(\d+|N):\s*Polish\s*&\s*Cross-Cutting Concerns/gi, '## Phase $1: Hoàn thiện (Polish) & Các vấn đề Xuyên suốt'],
  [/## Phase\s*(\d+):\s*Setup\s*\(([^)]+)\)/gi, '## Phase $1: Thiết lập ($2)'],
  [/## Phase\s*(\d+):\s*Foundational\s*\(([^)]+)\)/gi, '## Phase $1: Nền tảng ($2)'],
  [/## Phase\s*(\d+):\s*User Story\s*(\d+)\s*-\s*/gi, '## Phase $1: User Story $2 - '],
  [/\bPolish\s*&\s*Cross-Cutting Concerns\b/gi, 'Hoàn thiện & Các vấn đề Xuyên suốt'],
  [/\bCross-Cutting Concerns\b/gi, 'Các vấn đề Xuyên suốt'],
  [/\bPolish \(Final Phase\)\b/gi, 'Hoàn thiện (Phase cuối)'],
  [/\bPolish\b/gi, 'Hoàn thiện'],
  [/\bAngular template\b/gi, 'Template Angular'],
  [/\bAngular templates\b/gi, 'Template Angular'],
  [/\bUser Story\b/gi, 'User Story'],
  [/\bUser Stories\b/gi, 'User Stories'],

  // Domain post-fixes
  [/\bkhoảng không quảng cáo\b/gi, 'tồn kho'],
  [/\bphương thức\/trang nhập khẩu\b/gi, 'modal/trang Nhập hàng'],
  [/\bnhập khẩu\b/gi, 'nhập kho'],
  [/\bxuất khẩu\b/gi, 'xuất kho'],
  [/\bngữ cảnh DbContext của EF\b/gi, 'EF Core DbContext'],
  [/\btính năng di chuyển cốt lõi của EF\b/gi, 'EF Core Migration'],

  // Labels & phrases
  [/\*\*Purpose\*\*:/gi, '**Mục đích**:'],
  [/\*\*Goal\*\*:/gi, '**Mục tiêu**:'],
  [/\*\*Independent Test\*\*:/gi, '**Kiểm thử Độc lập**:'],
  [/\*\*Why this priority\*\*:/gi, '**Lý do cho độ ưu tiên này**:'],
  [/\*\*Acceptance Scenarios\*\*:/gi, '**Kịch bản Chấp nhận**:'],
  [/\*\*Checkpoint\*\*:/gi, '**Trạm kiểm tra (Checkpoint)**:'],
  [/\*\*Implementation for User Story/gi, '**Triển khai cho User Story'],
  [/\*\*Tests for User Story/gi, '**Kiểm thử cho User Story'],
  [/\*\*Tests\*\*:/gi, '**Kiểm thử**:']
];

async function callTranslateApi(text) {
  if (!text || !text.trim()) return text;
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + encodeURIComponent(text);
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0].map(item => item[0]).join('');
      }
      return text;
    } catch (err) {
      if (attempt === 3) {
        console.warn(`[Translate Warning] Failed on: "${text.slice(0, 30)}...":`, err.message);
        return text;
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return text;
}

async function translateLine(rawLine) {
  let line = rawLine;

  // Check dictionary replacements first
  for (const [regex, replacement] of DICT_REPLACEMENTS) {
    line = line.replace(regex, replacement);
  }

  // If line is empty or purely markdown formatting
  const trimmed = line.trim();
  if (!trimmed || trimmed === '---' || trimmed === '***' || trimmed.startsWith('|---')) {
    return line;
  }

  // If line is directory tree or ASCII art
  if (/^[│├└─\s]+[a-zA-Z0-9_\-\.\/]+/.test(line)) {
    return line;
  }

  // If line already contains Vietnamese characters and no longer has obvious English phrases
  if (VN_CHAR_REGEX.test(line)) {
    return line;
  }

  // Extract common prefix (checkboxes, tasks, bullets, numbers, quotes)
  let prefix = '';
  const prefixMatch = line.match(/^(\s*(?:-\s*\[[ xX]\]\s*(?:T\d+\s*)?(?:\[[A-Za-z0-9_]+\]\s*)*|\d+\.\s+|-\s+|\*\s+|>\s*))/);
  if (prefixMatch) {
    prefix = prefixMatch[1];
    line = line.slice(prefix.length);
  }

  // If nothing left to translate after prefix
  if (!line.trim()) {
    return rawLine;
  }

  // Protect inline code blocks `code`
  const codeBlocks = [];
  line = line.replace(/`([^`]+)`/g, (match, code) => {
    codeBlocks.push(code);
    return `CODEPH_${codeBlocks.length - 1}`;
  });

  // Protect markdown links url [text](url) -> keep url, translate text
  const linkUrls = [];
  line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, linkUrl) => {
    linkUrls.push(linkUrl);
    return `[${linkText}](LINKPH_${linkUrls.length - 1})`;
  });

  // Translate remaining text
  let translated = await callTranslateApi(line);

  // Restore markdown links
  translated = translated.replace(/LINKPH_(\d+)/g, (match, idx) => {
    const i = parseInt(idx, 10);
    return linkUrls[i] !== undefined ? linkUrls[i] : match;
  });

  // Restore inline code blocks
  translated = translated.replace(/CODEPH_(\d+)/g, (match, idx) => {
    const i = parseInt(idx, 10);
    return codeBlocks[i] !== undefined ? `\`${codeBlocks[i]}\`` : match;
  });

  // Small delay to be polite with the endpoint
  await new Promise(r => setTimeout(r, 60));

  return prefix + translated;
}

export async function translateMarkdownFile(filePath, dryRun = false) {
  console.log(`\n📄 Processing: ${path.relative(process.cwd(), filePath)}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const newLines = [];

  let inCodeBlock = false;
  let inHtmlComment = false;
  let inFrontmatter = false;
  let lineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check frontmatter (starts on line 0)
    if (i === 0 && trimmed === '---') {
      inFrontmatter = true;
      newLines.push(rawLine);
      continue;
    }
    if (inFrontmatter) {
      newLines.push(rawLine);
      if (trimmed === '---') {
        inFrontmatter = false;
      }
      continue;
    }

    // Check code blocks
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      newLines.push(rawLine);
      continue;
    }
    if (inCodeBlock) {
      newLines.push(rawLine);
      continue;
    }

    // Check HTML comments
    if (trimmed.startsWith('<!--')) {
      inHtmlComment = true;
    }
    if (inHtmlComment) {
      newLines.push(rawLine);
      if (trimmed.endsWith('-->')) {
        inHtmlComment = false;
      }
      continue;
    }

    // Translate line
    const translated = await translateLine(rawLine);
    newLines.push(translated);
    lineIndex++;
    if (lineIndex % 20 === 0) {
      process.stdout.write(`.`);
    }
  }

  const result = newLines.join('\n');
  if (!dryRun) {
    fs.writeFileSync(filePath, result, 'utf8');
    console.log(`\n✅ Translated and updated.`);
  } else {
    console.log(`\n🔍 [Dry-Run] Completed verification.`);
  }
}

async function getAllMarkdownFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getAllMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0] || path.join(__dirname, '../specs');
  const isDryRun = args.includes('--dry-run');

  const resolvedPath = path.resolve(targetDir);
  console.log(`🚀 Starting Markdown Translation to Vietnamese`);
  console.log(`📁 Target: ${resolvedPath}`);

  if (fs.existsSync(resolvedPath)) {
    const stat = fs.statSync(resolvedPath);
    if (stat.isFile()) {
      await translateMarkdownFile(resolvedPath, isDryRun);
    } else {
      const files = await getAllMarkdownFiles(resolvedPath);
      console.log(`Found ${files.length} markdown file(s) to process.`);
      for (let i = 0; i < files.length; i++) {
        console.log(`[${i + 1}/${files.length}] Translating...`);
        await translateMarkdownFile(files[i], isDryRun);
      }
    }
  } else {
    console.error(`Target path not found: ${resolvedPath}`);
  }

  console.log(`\n🎉 All done!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
