import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('JavaScript Debug Test', () => {
  const createJsFile = (content: string): ParsedFile => ({
    path: 'test.js',
    language: 'javascript' as Language,
    content,
    directory: '',
    fileName: 'test.js',
    totalLines: content.split('\n').length,
    methods: []
  });

  test('Simple function detection debug', () => {
    const content = `function processData() {
  validateInput();
  return result;
}

function validateInput() {
  return true;
}`;
    
    const file = createJsFile(content);
    const methods = analyzeMethodsInFile(file);
    
    // Check that methods are detected
    
    expect(methods.length).toBeGreaterThan(0);
  });

  test('Method call detection debug', () => {
    const content = `function main() {
  hello();
  world();
}

function hello() {
  console.log('hello');
}

function world() {
  console.log('world');
}`;
    
    const file = createJsFile(content);
    const methods = analyzeMethodsInFile(file);
    
    const mainMethod = methods.find(m => m.name === 'main');
    // Check that main method calls are detected
    
    expect(mainMethod).toBeDefined();
  });
});