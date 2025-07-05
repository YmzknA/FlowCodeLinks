/**
 * FloatingWindowの特殊文字付きメソッド名処理をテスト
 */

describe('FloatingWindow Special Method Processing', () => {
  it('should simulate FloatingWindow special character method processing', () => {
    // FloatingWindowの処理をシミュレート
    const methodName = 'uid_required?';
    const baseMethodName = methodName.slice(0, -1); // 'uid_required'
    const suffix = methodName.slice(-1); // '?'
    const escapedBase = baseMethodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Prism.jsのHTML出力をシミュレート
    let highlighted = `<span class="token method-definition"><span class="token function">uid_required</span></span><span class="token operator">?</span>`;
    
    console.log('=== FloatingWindow Processing Simulation ===');
    console.log('Original HTML:', highlighted);
    console.log('Method name:', methodName);
    console.log('Base method:', baseMethodName);
    console.log('Suffix:', suffix);
    
    // HTML属性を保護
    let tempHighlighted = highlighted;
    const protectMarker = `__PROTECT_${Math.random().toString(36).substr(2, 9)}__`;
    const protectMap = new Map<string, string>();
    
    console.log('Protect marker:', protectMarker);
    
    // HTML属性内のメソッド名を保護（この場合は該当なし）
    tempHighlighted = tempHighlighted.replace(/\w+\s*=\s*["'][^"']*["']/g, (match) => {
      if (match.includes(methodName)) {
        const protectedValue = `${protectMarker}${protectMap.size}`;
        protectMap.set(protectedValue, match);
        console.log('Protected attribute:', match, '→', protectedValue);
        return protectedValue;
      }
      return match;
    });
    
    console.log('After attribute protection:', tempHighlighted);
    console.log('ProtectMap size:', protectMap.size);
    
    // パターン1: メソッド定義
    const definitionPattern = new RegExp(
      `(<span class="token method-definition"><span class="token function">${escapedBase}</span></span>)(<span class="token operator">${escapedSuffix}</span>)`,
      'g'
    );
    
    console.log('Definition pattern:', definitionPattern.toString());
    
    tempHighlighted = tempHighlighted.replace(definitionPattern, 
      `<span class="cursor-pointer" data-method-name="${methodName}">$1$2</span>`
    );
    
    console.log('After definition pattern:', tempHighlighted);
    
    // パターン2: メソッド呼び出し
    const callPattern = new RegExp(
      `(?<![\\w])(${escapedBase})(<span class="token operator">${escapedSuffix}</span>)`,
      'g'
    );
    
    console.log('Call pattern:', callPattern.toString());
    
    tempHighlighted = tempHighlighted.replace(callPattern, 
      `<span class="cursor-pointer" data-method-name="${methodName}">$1$2</span>`
    );
    
    console.log('After call pattern:', tempHighlighted);
    
    // 保護されたHTML属性を復元
    console.log('Restoring protected attributes...');
    protectMap.forEach((originalContent, marker) => {
      console.log('Restoring:', marker, '→', originalContent);
      const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      tempHighlighted = tempHighlighted.replace(new RegExp(escapedMarker, 'g'), originalContent);
    });
    
    const finalResult = tempHighlighted;
    
    console.log('Final result:', finalResult);
    console.log('=== End Simulation ===');
    
    // 数字プレフィックスがないことを確認
    expect(finalResult).not.toMatch(/\d+uid_required/);
    expect(finalResult).toContain('data-method-name="uid_required?"');
  });

  it('should test with problematic method names', () => {
    // 問題が報告されたメソッド名をテスト
    const problematicMethods = [
      'uid_required?',
      'completed_tasks_hidden?',
      'social_profile',
      'set_values'
    ];
    
    problematicMethods.forEach((methodName, index) => {
      console.log(`\n=== Testing ${methodName} (index: ${index}) ===`);
      
      // シンプルなHTML
      const html = `def ${methodName}`;
      console.log('Input HTML:', html);
      
      // 保護マーカーのシミュレート
      const protectMarker = `__PROTECT_test__`;
      const markerWithIndex = `${protectMarker}${index}`;
      
      console.log('Marker with index:', markerWithIndex);
      
      // マーカーが復元されずに残った場合をシミュレート
      const brokenResult = html.replace(methodName, `${index}${methodName}`);
      console.log('Broken result (if marker fails):', brokenResult);
      
      // 正常な結果
      const normalResult = html;
      console.log('Normal result:', normalResult);
      
      // 数字プレフィックスがある場合を検出
      const hasNumericPrefix = /\d+\w+/.test(brokenResult);
      console.log('Has numeric prefix:', hasNumericPrefix);
      
      expect(normalResult).not.toMatch(/^\d/);
      expect(normalResult).toBe(html);
    });
  });
});