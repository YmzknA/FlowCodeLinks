import { analyzeTypeScriptWithESTree } from '@/utils/typescript-estree-analyzer';
import { ParsedFile } from '@/types/codebase';

describe('Import Jump Direction Test', () => {
  const createTestFile = (content: string): ParsedFile => ({
    path: 'test.tsx',
    language: 'tsx' as const,
    content,
    directory: 'src',
    fileName: 'test.tsx',
    methods: [],
    totalLines: content.split('\n').length
  });

  it('should demonstrate current jump behavior for GoogleAnalytics example', () => {
    const content = `
import { GoogleAnalytics } from "@next/third-parties/google";

function App() {
  return (
    <div>
      <h1>My App</h1>
      <GoogleAnalytics gaId="GA_MEASUREMENT_ID" />
    </div>
  );
}`;

    const file = createTestFile(content);
    const methods = analyzeTypeScriptWithESTree(file);
    
    const imports = methods.filter(m => m.type === 'import');
    const usages = methods.filter(m => m.type === 'import_usage');
    
    console.log('\n=== IMPORT STATEMENT ===');
    const googleAnalyticsImport = imports[0];
    console.log('Import name:', googleAnalyticsImport.name);
    console.log('Import line:', googleAnalyticsImport.startLine);
    console.log('Import calls (should point to usage locations):');
    googleAnalyticsImport.calls.forEach(call => {
      console.log(`  - ${call.methodName} at line ${call.line}: ${call.context}`);
    });
    
    console.log('\n=== USAGE LOCATIONS ===');
    const googleAnalyticsUsages = usages.filter(u => u.name.includes('GoogleAnalytics'));
    googleAnalyticsUsages.forEach((usage, index) => {
      console.log(`Usage ${index + 1}:`);
      console.log('  Name:', usage.name);
      console.log('  Line:', usage.startLine);
      console.log('  Code:', usage.code);
      console.log('  Calls (should point back to import):');
      usage.calls.forEach(call => {
        console.log(`    - ${call.methodName} at line ${call.line}`);
      });
      console.log('  Import source:', usage.importSource);
    });
    
    // 検証: インポート文は使用箇所を指している
    expect(googleAnalyticsImport.calls.length).toBeGreaterThan(0);
    expect(googleAnalyticsImport.calls[0].methodName).toBe('GoogleAnalytics');
    expect(googleAnalyticsImport.calls[0].line).toBeGreaterThan(googleAnalyticsImport.startLine);
    
    // 検証: 使用箇所はインポート文を指している
    expect(googleAnalyticsUsages).toHaveLength(1);
    const usage = googleAnalyticsUsages[0];
    expect(usage.calls).toHaveLength(1);
    expect(usage.calls[0].line).toBe(googleAnalyticsImport.startLine);
    expect(usage.importSource).toBe(googleAnalyticsImport.startLine.toString());
  });

  it('should show the relationship clearly for multiple usages', () => {
    const content = `
import { useState, useEffect } from 'react';
import Button from '@/components/Button';

function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);
  
  return (
    <div>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
      <Button onClick={() => setCount(0)}>Reset</Button>
    </div>
  );
}`;

    const file = createTestFile(content);
    const methods = analyzeTypeScriptWithESTree(file);
    
    const imports = methods.filter(m => m.type === 'import');
    const usages = methods.filter(m => m.type === 'import_usage');
    
    console.log('\n=== ALL IMPORTS ===');
    imports.forEach((imp, index) => {
      console.log(`Import ${index + 1}: ${imp.name} (line ${imp.startLine})`);
      console.log(`  Points to ${imp.calls.length} usage(s):`);
      imp.calls.forEach(call => {
        console.log(`    - ${call.methodName} at line ${call.line}`);
      });
    });
    
    console.log('\n=== ALL USAGES ===');
    usages.forEach((usage, index) => {
      console.log(`Usage ${index + 1}: ${usage.name} (line ${usage.startLine})`);
      console.log(`  Points back to import at line ${usage.importSource}`);
    });
    
    // Reactインポートの検証
    const reactImport = imports.find(i => i.name.includes('react'));
    expect(reactImport).toBeDefined();
    expect(reactImport!.calls.length).toBeGreaterThanOrEqual(2); // useState, useEffect
    
    // Buttonインポートの検証
    const buttonImport = imports.find(i => i.name.includes('Button'));
    expect(buttonImport).toBeDefined();
    expect(buttonImport!.calls.length).toBeGreaterThanOrEqual(1); // Button usage
    
    // 使用箇所がすべて正しいインポートを指していることを確認
    usages.forEach(usage => {
      const importSource = parseInt(usage.importSource!);
      const correspondingImport = imports.find(imp => imp.startLine === importSource);
      expect(correspondingImport).toBeDefined();
    });
  });
});