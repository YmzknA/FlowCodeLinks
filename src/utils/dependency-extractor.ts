import { Method, Dependency } from '@/types/codebase';
import { MethodExclusionService } from '@/services/MethodExclusionService';

export function extractDependencies(methods: Method[]): Dependency[] {
  if (methods.length === 0) {
    return [];
  }

  const dependencies: Dependency[] = [];
  const methodMap = createMethodMap(methods);
  

  for (const method of methods) {
    const methodDeps = extractMethodDependencies(method, methodMap);
    dependencies.push(...methodDeps);
    
  }

  const mergedDependencies = mergeDuplicateDependencies(dependencies);
  

  return mergedDependencies;
}

function createMethodMap(methods: Method[]): Map<string, Method[]> {
  const map = new Map<string, Method[]>();
  
  for (const method of methods) {
    // ERBファイル内のメソッド呼び出しは定義として扱わない
    if (method.type === 'erb_call') {
      continue;
    }
    
    if (!map.has(method.name)) {
      map.set(method.name, []);
    }
    map.get(method.name)!.push(method);
  }
  
  return map;
}

function extractMethodDependencies(method: Method, methodMap: Map<string, Method[]>): Dependency[] {
  const dependencies: Dependency[] = [];

  if (method.calls.length === 0) {
    return dependencies;
  }

  for (const call of method.calls) {
    const targetMethods = methodMap.get(call.methodName);
    
    if (targetMethods && targetMethods.length > 0) {
      // 同じファイル内のメソッドを優先して選択
      const sameFileMethod = targetMethods.find(m => m.filePath === method.filePath);
      const targetMethod = sameFileMethod || targetMethods[0]; // 見つからない場合は最初のメソッドを選択
      
      // 🎯 Rails標準アクション等の矢印ターゲット除外チェック（問題修正）
      if (!MethodExclusionService.isValidArrowTarget(targetMethod.name, targetMethod.filePath)) {
        continue; // Rails標準アクション（new, show等）は矢印の終点にしない
      }
      
      const dependencyType = method.filePath === targetMethod.filePath ? 'internal' : 'external';
      
      // import関連の場合は、使用箇所ではなくimport文の行番号を使用
      let actualFromLine = call.line;
      if (method.type === 'import_usage' && method.importSource) {
        actualFromLine = parseInt(method.importSource);
      }

      dependencies.push({
        from: {
          methodName: method.name,
          filePath: method.filePath
        },
        to: {
          methodName: targetMethod.name,
          filePath: targetMethod.filePath
        },
        count: 1, // 後でマージ時に集約
        type: dependencyType,
        fromLine: actualFromLine, // import関連の場合はimport文の行番号を使用
        toLine: targetMethod.startLine // 呼び出し先の開始行番号を追加
      });
    }
  }

  return dependencies;
}

function mergeDuplicateDependencies(dependencies: Dependency[]): Dependency[] {
  const merged = new Map<string, Dependency>();

  for (const dep of dependencies) {
    const key = `${dep.from.methodName}@${dep.from.filePath}->${dep.to.methodName}@${dep.to.filePath}`;
    
    if (merged.has(key)) {
      const existing = merged.get(key)!;
      existing.count += 1;
    } else {
      merged.set(key, { ...dep });
    }
  }

  return Array.from(merged.values());
}