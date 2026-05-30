export interface FileTypeBadge {
  label: string;
  type: string;
  title: string;
}

const CODE_EXTENSIONS = new Set([
  'js',
  'ts',
  'jsx',
  'tsx',
  'css',
  'scss',
  'html',
  'xml',
  'yaml',
  'yml',
  'sh',
  'bash',
  'zsh',
  'go',
  'rs',
  'java',
  'kt',
  'swift',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'php',
  'rb',
]);

export function getFileTypeBadge(extension: string): FileTypeBadge {
  const normalizedExtension = extension.toLowerCase();

  if (['md', 'markdown'].includes(normalizedExtension)) {
    return { label: 'md', type: 'markdown', title: 'Markdown file' };
  }
  if (normalizedExtension === 'base') {
    return { label: 'base', type: 'base', title: 'Obsidian Base file' };
  }
  if (normalizedExtension === 'canvas') {
    return { label: 'map', type: 'canvas', title: 'Obsidian Canvas file' };
  }
  if (['py', 'pyw'].includes(normalizedExtension)) {
    return { label: 'py', type: 'python', title: 'Python file' };
  }
  if (normalizedExtension === 'ipynb') {
    return { label: 'ipynb', type: 'python', title: 'Jupyter notebook' };
  }
  if (['txt', 'rtf'].includes(normalizedExtension)) {
    return { label: 'txt', type: 'text', title: 'Text file' };
  }
  if (['doc', 'docx'].includes(normalizedExtension)) {
    return { label: 'doc', type: 'document', title: 'Word document' };
  }
  if (normalizedExtension === 'pages') {
    return { label: 'pgs', type: 'document', title: 'Pages document' };
  }
  if (['odt', 'gdoc'].includes(normalizedExtension)) {
    return { label: 'doc', type: 'document', title: 'Document file' };
  }
  if (['ppt', 'pptx', 'pptm', 'pps', 'ppsx'].includes(normalizedExtension)) {
    return { label: 'ppt', type: 'presentation', title: 'PowerPoint presentation' };
  }
  if (['key', 'keynote'].includes(normalizedExtension)) {
    return { label: 'key', type: 'presentation', title: 'Keynote presentation' };
  }
  if (['odp', 'gslides'].includes(normalizedExtension)) {
    return { label: 'ppt', type: 'presentation', title: 'Presentation file' };
  }
  if (['xls', 'xlsx', 'xlsm', 'xlsb'].includes(normalizedExtension)) {
    return { label: 'xls', type: 'spreadsheet', title: 'Excel spreadsheet' };
  }
  if (normalizedExtension === 'numbers') {
    return { label: 'num', type: 'spreadsheet', title: 'Numbers spreadsheet' };
  }
  if (['ods', 'gsheet'].includes(normalizedExtension)) {
    return { label: 'xls', type: 'spreadsheet', title: 'Spreadsheet file' };
  }
  if (normalizedExtension === 'csv') {
    return { label: 'csv', type: 'spreadsheet', title: 'CSV file' };
  }
  if (normalizedExtension === 'tsv') {
    return { label: 'tsv', type: 'spreadsheet', title: 'TSV file' };
  }
  if (normalizedExtension === 'pdf') {
    return { label: 'pdf', type: 'pdf', title: 'PDF file' };
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'heic'].includes(normalizedExtension)) {
    return { label: 'img', type: 'image', title: 'Image file' };
  }
  if (['fig', 'sketch'].includes(normalizedExtension)) {
    return { label: 'fig', type: 'design', title: 'Figma design file' };
  }
  if (['psd', 'psb'].includes(normalizedExtension)) {
    return { label: 'psd', type: 'design', title: 'Photoshop file' };
  }
  if (['ai', 'eps', 'xd', 'afdesign'].includes(normalizedExtension)) {
    return { label: 'art', type: 'design', title: 'Design file' };
  }
  if (['drawio', 'diagram', 'mmd', 'mermaid'].includes(normalizedExtension)) {
    return { label: 'draw', type: 'diagram', title: 'Diagram file' };
  }
  if (normalizedExtension === 'excalidraw') {
    return { label: 'draw', type: 'diagram', title: 'Excalidraw file' };
  }
  if (['epub', 'mobi', 'azw', 'azw3'].includes(normalizedExtension)) {
    return { label: 'book', type: 'ebook', title: 'Ebook file' };
  }
  if (['db', 'sqlite', 'sqlite3'].includes(normalizedExtension)) {
    return { label: 'db', type: 'database', title: 'SQLite database' };
  }
  if (['ttf', 'otf', 'woff', 'woff2'].includes(normalizedExtension)) {
    return { label: 'font', type: 'font', title: 'Font file' };
  }
  if (normalizedExtension === 'json') {
    return { label: 'json', type: 'json', title: 'JSON file' };
  }
  if (['toml', 'ini', 'env'].includes(normalizedExtension)) {
    return { label: 'cfg', type: 'config', title: 'Config file' };
  }
  if (CODE_EXTENSIONS.has(normalizedExtension)) {
    return { label: normalizedExtension, type: 'code', title: `${normalizedExtension.toUpperCase()} file` };
  }
  if (['zip', '7z', 'rar', 'tar', 'gz'].includes(normalizedExtension)) {
    return { label: 'zip', type: 'archive', title: 'Archive file' };
  }
  if (['mp3', 'wav', 'm4a', 'flac', 'ogg'].includes(normalizedExtension)) {
    return { label: 'aud', type: 'audio', title: 'Audio file' };
  }
  if (['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(normalizedExtension)) {
    return { label: 'vid', type: 'video', title: 'Video file' };
  }

  return { label: 'file', type: 'generic', title: 'File' };
}
