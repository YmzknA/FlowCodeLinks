import { RepomixFile, RepomixFileEntry, Language, ParsedFile } from '@/types/codebase';

export interface ParserResult {
  files: ParsedFile[];
  directoryStructure: string;
}

export function parseRepomixFile(content: string): ParserResult {
  if (!content.trim()) {
    return {
      files: [],
      directoryStructure: ''
    };
  }

  const directoryStructure = extractDirectoryStructure(content);
  const fileEntries = extractFileEntries(content);
  const parsedFiles = fileEntries.map(entry => parseFileEntry(entry));

  return {
    files: parsedFiles,
    directoryStructure
  };
}

function extractDirectoryStructure(content: string): string {
  const structureMatch = content.match(/# Directory Structure\s*```([\s\S]*?)```/);
  return structureMatch ? structureMatch[1].trim() : '';
}

function extractFileEntries(content: string): RepomixFileEntry[] {
  const fileRegex = /## File: (.+?)\s*```(?:\w+)?\s*([\s\S]*?)```/g;
  const entries: RepomixFileEntry[] = [];
  let match;

  while ((match = fileRegex.exec(content)) !== null) {
    const [, path, fileContent] = match;
    const cleanContent = cleanFileContent(fileContent.trim());
    entries.push({
      path: path.trim(),
      content: cleanContent
    });
  }

  return entries;
}

function cleanFileContent(content: string): string {
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    // 行番号とコロンを除去するが、インデントは保持
    const lineNumberMatch = line.match(/^\s*\d+:(.*)$/);
    if (lineNumberMatch) {
      // 行番号とコロンを除去し、その後の内容（インデント含む）を保持
      const afterColon = lineNumberMatch[1];
      cleanedLines.push(afterColon);
    } else {
      cleanedLines.push(line);
    }
  }
  
  return cleanedLines.join('\n');
}

function parseFileEntry(entry: RepomixFileEntry): ParsedFile {
  const language = detectLanguage(entry.path);
  const pathParts = entry.path.split('/');
  const fileName = pathParts[pathParts.length - 1];
  const directory = pathParts.slice(0, -1).join('/');
  const totalLines = entry.content.split('\n').length;

  return {
    path: entry.path,
    language,
    content: entry.content,
    directory,
    fileName,
    methods: [], // メソッド解析は後で実装
    totalLines
  };
}

function detectLanguage(filePath: string): Language {
  // ファイル名から拡張子を正しく抽出（最後の.以降のみ）
  const lastDotIndex = filePath.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? filePath.substring(lastDotIndex + 1).toLowerCase() : '';
  
  switch (extension) {
    case 'rb':
      return 'ruby';
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'tsx';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'erb':
      return 'erb';
    default:
      return 'unknown';
  }
}