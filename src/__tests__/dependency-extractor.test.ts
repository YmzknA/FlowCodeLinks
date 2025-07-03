import { extractDependencies } from '@/utils/dependency-extractor';
import { ParsedFile, Method, MethodCall } from '@/types/codebase';

describe('依存関係抽出機能のテスト', () => {
  const createMethod = (name: string, filePath: string, calls: MethodCall[] = []): Method => ({
    name,
    type: 'method',
    startLine: 1,
    endLine: 10,
    filePath,
    code: `def ${name}\nend`,
    calls,
    isPrivate: false,
    parameters: []
  });

  const createMethodCall = (methodName: string, line: number = 1): MethodCall => ({
    methodName,
    line,
    context: `${methodName}()`
  });

  test('同一ファイル内のメソッド間依存関係を抽出できる', () => {
    const methods: Method[] = [
      createMethod('method_a', 'file1.rb', [createMethodCall('method_b')]),
      createMethod('method_b', 'file1.rb', [createMethodCall('method_c')]),
      createMethod('method_c', 'file1.rb', [])
    ];

    const dependencies = extractDependencies(methods);

    expect(dependencies).toHaveLength(2);
    
    const depAtoB = dependencies.find(d => 
      d.from.methodName === 'method_a' && d.to.methodName === 'method_b'
    );
    expect(depAtoB).toBeDefined();
    expect(depAtoB?.type).toBe('internal');
    expect(depAtoB?.count).toBe(1);
    
    const depBtoC = dependencies.find(d => 
      d.from.methodName === 'method_b' && d.to.methodName === 'method_c'
    );
    expect(depBtoC).toBeDefined();
    expect(depBtoC?.type).toBe('internal');
  });

  test('異なるファイル間のメソッド間依存関係を抽出できる', () => {
    const methods: Method[] = [
      createMethod('user_service', 'services/user.rb', [createMethodCall('validate_email')]),
      createMethod('validate_email', 'validators/email.rb', []),
      createMethod('send_notification', 'services/notification.rb', [createMethodCall('user_service')])
    ];

    const dependencies = extractDependencies(methods);

    expect(dependencies).toHaveLength(2);
    
    const userToValidator = dependencies.find(d => 
      d.from.methodName === 'user_service' && d.to.methodName === 'validate_email'
    );
    expect(userToValidator).toBeDefined();
    expect(userToValidator?.type).toBe('external');
    expect(userToValidator?.from.filePath).toBe('services/user.rb');
    expect(userToValidator?.to.filePath).toBe('validators/email.rb');
  });

  test('同じメソッドが複数回呼び出される場合の回数カウント', () => {
    const methods: Method[] = [
      createMethod('process_data', 'processor.rb', [
        createMethodCall('validate', 1),
        createMethodCall('validate', 5),
        createMethodCall('save_data', 10)
      ]),
      createMethod('validate', 'processor.rb', []),
      createMethod('save_data', 'processor.rb', [])
    ];

    const dependencies = extractDependencies(methods);

    const validateDep = dependencies.find(d => 
      d.from.methodName === 'process_data' && d.to.methodName === 'validate'
    );
    expect(validateDep?.count).toBe(2); // 2回呼び出し
    
    const saveDep = dependencies.find(d => 
      d.from.methodName === 'process_data' && d.to.methodName === 'save_data'
    );
    expect(saveDep?.count).toBe(1); // 1回呼び出し
  });

  test('存在しないメソッドへの呼び出しは依存関係に含まれない', () => {
    const methods: Method[] = [
      createMethod('method_a', 'file1.rb', [
        createMethodCall('existing_method'),
        createMethodCall('non_existing_method')
      ]),
      createMethod('existing_method', 'file1.rb', [])
    ];

    const dependencies = extractDependencies(methods);

    expect(dependencies).toHaveLength(1);
    expect(dependencies[0].to.methodName).toBe('existing_method');
  });

  test('複雑な依存関係のネットワークを正しく抽出', () => {
    const methods: Method[] = [
      createMethod('controller_action', 'controllers/users.rb', [
        createMethodCall('service_method'),
        createMethodCall('render_json')
      ]),
      createMethod('service_method', 'services/user.rb', [
        createMethodCall('model_method'),
        createMethodCall('validate_data')
      ]),
      createMethod('model_method', 'models/user.rb', []),
      createMethod('validate_data', 'validators/user.rb', []),
      createMethod('render_json', 'controllers/application.rb', [])
    ];

    const dependencies = extractDependencies(methods);

    expect(dependencies).toHaveLength(4);
    
    // コントローラーからサービスへ
    const controllerToService = dependencies.find(d => 
      d.from.methodName === 'controller_action' && d.to.methodName === 'service_method'
    );
    expect(controllerToService?.type).toBe('external');
    
    // サービスからモデルへ
    const serviceToModel = dependencies.find(d => 
      d.from.methodName === 'service_method' && d.to.methodName === 'model_method'
    );
    expect(serviceToModel?.type).toBe('external');
  });

  test('自己再帰呼び出しも依存関係として検出', () => {
    const methods: Method[] = [
      createMethod('recursive_method', 'utils.rb', [
        createMethodCall('recursive_method')
      ])
    ];

    const dependencies = extractDependencies(methods);

    expect(dependencies).toHaveLength(1);
    expect(dependencies[0].from.methodName).toBe('recursive_method');
    expect(dependencies[0].to.methodName).toBe('recursive_method');
    expect(dependencies[0].type).toBe('internal');
  });

  test('空のメソッド配列では空の依存関係配列を返す', () => {
    const dependencies = extractDependencies([]);
    expect(dependencies).toHaveLength(0);
  });

  test('メソッド呼び出しがないメソッドは依存関係に含まれない', () => {
    const methods: Method[] = [
      createMethod('isolated_method_1', 'file1.rb', []),
      createMethod('isolated_method_2', 'file2.rb', [])
    ];

    const dependencies = extractDependencies(methods);
    expect(dependencies).toHaveLength(0);
  });
});