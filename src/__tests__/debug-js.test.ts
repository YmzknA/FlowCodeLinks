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
    
    console.log('Detected methods:', methods.map(m => ({ name: m.name, type: m.type, calls: m.calls.map(c => c.methodName) })));
    
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
    console.log('Main method calls:', mainMethod?.calls.map(c => c.methodName));
    
    expect(mainMethod).toBeDefined();
  });
});