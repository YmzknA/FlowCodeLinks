'use client';

import React, { useState } from 'react';
import { parseRepomixFile } from '@/utils/parser';
import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { extractDependencies } from '@/utils/dependency-extractor';

const DebugPage: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      // サンプルファイルを読み込み
      const response = await fetch('/repomix-output-YmzknA-hoshi_ni_task_wo.md');
      const content = await response.text();
      
      console.log('1. パーサー実行開始');
      const parseResult = parseRepomixFile(content);
      console.log(`解析されたファイル数: ${parseResult.files.length}`);
      
      // Ruby ファイルのみを抽出
      const rubyFiles = parseResult.files.filter(file => file.language === 'ruby');
      console.log(`Ruby ファイル数: ${rubyFiles.length}`);
      
      console.log('2. メソッド解析実行開始');
      let allMethods: any[] = [];
      
      // 最初の5つのRubyファイルでメソッド解析を実行
      const testFiles = rubyFiles.slice(0, 5);
      
      for (const file of testFiles) {
        const methods = analyzeMethodsInFile(file);
        allMethods.push(...methods);
        console.log(`${file.path}: ${methods.length}個のメソッドを検出`);
        
        if (methods.length > 0) {
          console.log(`  - 最初のメソッド: ${methods[0].name} (${methods[0].type})`);
          console.log(`  - メソッド呼び出し数: ${methods[0].calls.length}`);
          if (methods[0].calls.length > 0) {
            console.log(`    最初の呼び出し: ${methods[0].calls[0].methodName}`);
          }
        }
      }
      
      console.log(`合計メソッド数: ${allMethods.length}`);
      
      console.log('3. 依存関係抽出実行開始');
      const dependencies = extractDependencies(allMethods);
      console.log(`依存関係の数: ${dependencies.length}`);
      
      // 問題の診断
      const methodsWithCalls = allMethods.filter(m => m.calls.length > 0);
      const methodNames = new Set(allMethods.map(m => m.name));
      const allCalls = allMethods.flatMap(m => m.calls);
      const orphanCalls = allCalls.filter(call => !methodNames.has(call.methodName));
      
      const debugInfo = {
        totalFiles: parseResult.files.length,
        rubyFiles: rubyFiles.length,
        totalMethods: allMethods.length,
        methodsWithCalls: methodsWithCalls.length,
        uniqueMethodNames: methodNames.size,
        totalDependencies: dependencies.length,
        orphanCalls: orphanCalls.length,
        orphanCallSamples: orphanCalls.slice(0, 10).map(c => c.methodName),
        sampleMethods: allMethods.slice(0, 3).map(m => ({
          name: m.name,
          filePath: m.filePath,
          callsCount: m.calls.length,
          calls: m.calls.slice(0, 3).map((c: any) => c.methodName)
        })),
        sampleDependencies: dependencies.slice(0, 5).map(d => ({
          from: `${d.from.methodName} (${d.from.filePath})`,
          to: `${d.to.methodName} (${d.to.filePath})`,
          type: d.type,
          count: d.count
        }))
      };
      
      setResults(debugInfo);
      
    } catch (error) {
      console.error('エラー:', error);
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>解析中...</p>
        </div>
      </div>
    );
  }
  
  if (!results) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-6">依存関係抽出機能デバッグ</h1>
        <div className="max-w-2xl">
          <p className="mb-4 text-gray-600">
            このページでは、実際のサンプルファイル（repomix-output-YmzknA-hoshi_ni_task_wo.md）を使って
            依存関係抽出機能の動作を確認できます。
          </p>
          <button 
            onClick={handleAnalyze}
            className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 text-lg"
          >
            サンプルファイルを解析
          </button>
        </div>
      </div>
    );
  }
  
  if (results.error) {
    return (
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-bold mb-6 text-red-600">エラー</h1>
        <div className="bg-red-50 border border-red-200 p-4 rounded mb-4">
          <p className="text-red-700">{results.error}</p>
        </div>
        <button 
          onClick={() => setResults(null)}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          リセット
        </button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">解析結果</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">基本統計</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>総ファイル数:</span>
              <span className="font-mono">{results.totalFiles}</span>
            </div>
            <div className="flex justify-between">
              <span>Ruby ファイル数:</span>
              <span className="font-mono">{results.rubyFiles}</span>
            </div>
            <div className="flex justify-between">
              <span>総メソッド数:</span>
              <span className="font-mono">{results.totalMethods}</span>
            </div>
            <div className="flex justify-between">
              <span>呼び出しを持つメソッド数:</span>
              <span className="font-mono">{results.methodsWithCalls}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">依存関係統計</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>ユニークメソッド名数:</span>
              <span className="font-mono">{results.uniqueMethodNames}</span>
            </div>
            <div className="flex justify-between">
              <span>依存関係数:</span>
              <span className="font-mono text-green-600 font-bold">{results.totalDependencies}</span>
            </div>
            <div className="flex justify-between">
              <span>未定義メソッド呼び出し数:</span>
              <span className="font-mono text-orange-600">{results.orphanCalls}</span>
            </div>
          </div>
        </div>
      </div>
      
      {results.orphanCallSamples && results.orphanCallSamples.length > 0 && (
        <div className="bg-orange-50 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-4">未定義メソッド呼び出しサンプル</h2>
          <div className="flex flex-wrap gap-2">
            {results.orphanCallSamples.map((call: string, index: number) => (
              <span key={index} className="bg-orange-200 px-2 py-1 rounded text-sm font-mono">
                {call}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">サンプルメソッド</h2>
          <div className="space-y-3">
            {results.sampleMethods.map((method: any, index: number) => (
              <div key={index} className="bg-white border rounded-lg p-4">
                <div className="font-medium text-lg">{method.name}</div>
                <div className="text-sm text-gray-600 mt-1">{method.filePath}</div>
                <div className="text-sm mt-2">
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    呼び出し数: {method.callsCount}
                  </span>
                </div>
                {method.calls.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-700 mb-1">呼び出しメソッド:</div>
                    <div className="flex flex-wrap gap-1">
                      {method.calls.map((call: string, callIndex: number) => (
                        <span key={callIndex} className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                          {call}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">サンプル依存関係</h2>
          <div className="space-y-3">
            {results.sampleDependencies.map((dep: any, index: number) => (
              <div key={index} className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-600">{dep.from}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-green-600">{dep.to}</span>
                </div>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className={`px-2 py-1 rounded ${
                    dep.type === 'internal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {dep.type}
                  </span>
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    回数: {dep.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t">
        <button 
          onClick={() => setResults(null)}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mr-4"
        >
          リセット
        </button>
        <button 
          onClick={handleAnalyze}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          再実行
        </button>
      </div>
    </div>
  );
};

export default DebugPage;