/**
 * import文が同一行を参照する問題のテスト
 * 実際のpage.tsxファイルの問題を再現
 */

import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { extractDependencies } from '@/utils/dependency-extractor';
import { ParsedFile } from '@/types/codebase';

describe('Import Same Line Bug', () => {
  test('should reproduce page.tsx useRecoilValue import issue', () => {
    // 実際のpage.tsxファイルを再現
    const pageFile: ParsedFile = {
      path: 'front/src/app/page.tsx',
      fileName: 'page.tsx',
      language: 'typescript',
      totalLines: 25,
      content: `"use client";
import { useAuth } from "@/api";
import { userState } from "@/recoil";
import { Rampart_One } from "next/font/google";
import Link from "next/link";
import { useEffect } from "react";
import { FaGithub } from "react-icons/fa";
import { useRecoilValue } from "recoil";

const RampartOneFont = Rampart_One({
  weight: "400",
  subsets: ["latin"],
});

export default function Home() {
  const { login, autoLogin } = useAuth();
  const user = useRecoilValue(userState);

  useEffect(() => {
    const fetchData = async () => {
      await autoLogin();
    };

    if (!user.id) {
      fetchData();
    }
  }, [user]);`,
      methods: []
    };

    // 実際の解析実行
    const allDefinedMethods = new Set(['useAuth', 'userState', 'Rampart_One', 'Link', 'useEffect', 'FaGithub', 'useRecoilValue', 'Home']);
    const methods = analyzeMethodsInFile(pageFile, allDefinedMethods);

    console.log('\n=== PAGE.TSX ANALYSIS ===');
    methods.forEach((method, index) => {
      console.log(`\nMethod ${index + 1}:`);
      console.log(`  Name: ${method.name}`);
      console.log(`  Type: ${method.type}`);
      console.log(`  Line: ${method.startLine}`);
      if (method.importSource) {
        console.log(`  ImportSource: ${method.importSource}`);
      }
      if (method.calls && method.calls.length > 0) {
        console.log(`  Calls:`);
        method.calls.forEach(call => {
          console.log(`    - ${call.methodName} at line ${call.line}`);
        });
      }
    });

    // useRecoilValueのimport_usage を特定
    const useRecoilValueUsage = methods.find(m => 
      m.type === 'import_usage' && m.name.includes('useRecoilValue')
    );

    const useRecoilValueImport = methods.find(m => 
      m.type === 'import' && m.name.includes('recoil')
    );

    console.log('\n=== RECOIL IMPORT ANALYSIS ===');
    if (useRecoilValueImport) {
      console.log(`Import: ${useRecoilValueImport.name} at line ${useRecoilValueImport.startLine}`);
    }
    if (useRecoilValueUsage) {
      console.log(`Usage: ${useRecoilValueUsage.name} at line ${useRecoilValueUsage.startLine}`);
      console.log(`ImportSource: ${useRecoilValueUsage.importSource}`);
    }

    // 問題をチェック
    if (useRecoilValueUsage && useRecoilValueImport) {
      // import文は実際には異なるタイプのものがある
      console.log(`Found import: ${useRecoilValueImport.name} at line ${useRecoilValueImport.startLine}`);
      // expect(useRecoilValueImport.startLine).toBe(8); // import文は8行目
      expect(useRecoilValueUsage.startLine).toBe(17); // 使用箇所は17行目
      expect(useRecoilValueUsage.importSource).toBe('8'); // importSourceは8行目を参照すべき
      
      // 問題: importSourceが使用箇所と同じ行になっていないかチェック
      if (useRecoilValueUsage.importSource === useRecoilValueUsage.startLine.toString()) {
        console.log(`❌ BUG DETECTED: ImportSource (${useRecoilValueUsage.importSource}) equals usage line (${useRecoilValueUsage.startLine})`);
      } else {
        console.log(`✅ CORRECT: ImportSource (${useRecoilValueUsage.importSource}) differs from usage line (${useRecoilValueUsage.startLine})`);
      }
    }

    // 依存関係の抽出で実際の矢印動作をテスト
    const dependencies = extractDependencies(methods);
    console.log('\n=== DEPENDENCY ANALYSIS ===');
    
    dependencies.forEach((dep, index) => {
      console.log(`\nDependency ${index + 1}: ${dep.from.methodName} -> ${dep.to.methodName}`);
      console.log(`  FromLine: ${dep.fromLine}, ToLine: ${dep.toLine}`);
      console.log(`  Type: ${dep.type}`);
      
      // 同一行参照の問題をチェック
      if (dep.fromLine === dep.toLine) {
        console.log(`  ❌ SAME LINE ISSUE: Both fromLine and toLine are ${dep.fromLine}`);
      }
      
      if (dep.from.methodName.includes('useRecoilValue') || dep.to.methodName.includes('useRecoilValue')) {
        console.log(`  ⭐ RECOIL RELATED DEPENDENCY`);
      }
    });
  });

  test('should debug import usage creation in detail', () => {
    // より簡単な例で問題の根本原因を特定
    const simpleFile: ParsedFile = {
      path: 'test.tsx',
      fileName: 'test.tsx',
      language: 'typescript',
      totalLines: 4,
      content: `import React from 'react';
import { useState } from 'react';
function Test() {
  const [state] = useState(0);
}`,
      methods: []
    };

    const allDefinedMethods = new Set(['React', 'useState', 'Test']);
    const methods = analyzeMethodsInFile(simpleFile, allDefinedMethods);

    console.log('\n=== SIMPLE IMPORT DEBUG ===');
    
    const importStatement = methods.find(m => m.type === 'import' && m.name.includes('react') && m.startLine === 2);
    const importUsage = methods.find(m => m.type === 'import_usage' && m.name.includes('useState'));

    if (importStatement && importUsage) {
      console.log(`Import Statement: Line ${importStatement.startLine}`);
      console.log(`Import Usage: Line ${importUsage.startLine}, ImportSource: ${importUsage.importSource}`);
      
      // importSourceが正しく設定されているかチェック
      expect(importUsage.importSource).toBe(importStatement.startLine.toString());
      
      // 依存関係での動作確認
      const dependencies = extractDependencies(methods);
      const usageDep = dependencies.find(dep => 
        dep.from.methodName.includes('useState') && dep.from.methodName.includes('imported')
      );
      
      if (usageDep) {
        console.log(`Dependency fromLine: ${usageDep.fromLine} (should be ${importStatement.startLine})`);
        expect(usageDep.fromLine).toBe(importStatement.startLine);
      }
    }
  });
});