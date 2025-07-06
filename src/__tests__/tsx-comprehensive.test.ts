import { analyzeMethodsInFile } from '@/utils/method-analyzer';
import { ParsedFile, Language } from '@/types/codebase';

describe('TSX解析 - 網羅的テスト', () => {
  const createTsxFile = (content: string): ParsedFile => ({
    path: 'test.tsx',
    language: 'tsx' as Language,
    content,
    directory: '',
    fileName: 'test.tsx',
    totalLines: content.split('\n').length,
    methods: []
  });

  describe('Reactコンポーネント', () => {
    test('関数コンポーネントを検出できる', () => {
      const content = `
import React, { useState, useEffect, useCallback } from 'react';

interface UserProps {
  userId: string;
  onUserLoad?: (user: User) => void;
}

const UserProfile: React.FC<UserProps> = ({ userId, onUserLoad }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userData = await fetchUser(userId);
      setUser(userData);
      onUserLoad?.(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, onUserLoad]);

  const handleEdit = useCallback(() => {
    if (user) {
      navigateToEdit(user.id);
    }
  }, [user]);

  const handleDelete = useCallback(async () => {
    if (user && window.confirm('Are you sure?')) {
      await deleteUser(user.id);
      onUserLoad?.(null);
    }
  }, [user, onUserLoad]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="user-profile">
      <UserAvatar user={user} />
      <UserInfo user={user} />
      <div className="actions">
        <button onClick={handleEdit}>Edit</button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
};

export default UserProfile;
`;

      const file = createTsxFile(content);
      const methods = analyzeMethodsInFile(file);

      const userProfileComponent = methods.find(m => m.name === 'UserProfile');
      const loadUserMethod = methods.find(m => m.name === 'loadUser');
      const handleEditMethod = methods.find(m => m.name === 'handleEdit');
      const handleDeleteMethod = methods.find(m => m.name === 'handleDelete');

      expect(userProfileComponent?.type).toBe('component');
      expect(loadUserMethod?.type).toBe('function');
      expect(handleEditMethod?.type).toBe('function');
      expect(handleDeleteMethod?.type).toBe('function');
    });

    test('クラスコンポーネントを検出できる', () => {
      const content = `
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });
    
    this.logError(error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private logError(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by boundary:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private renderError(): ReactNode {
    const { fallback } = this.props;
    const { error, errorInfo } = this.state;

    if (fallback) {
      return fallback;
    }

    return (
      <div className="error-boundary">
        <h2>Something went wrong</h2>
        <p>{error?.message}</p>
        <button onClick={this.handleRetry}>Try Again</button>
        {process.env.NODE_ENV === 'development' && (
          <details>
            <summary>Error Details</summary>
            <pre>{errorInfo?.componentStack}</pre>
          </details>
        )}
      </div>
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderError();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
`;

      const file = createTsxFile(content);
      const methods = analyzeMethodsInFile(file);

      const getDerivedStateMethod = methods.find(m => m.name === 'getDerivedStateFromError');
      const componentDidCatchMethod = methods.find(m => m.name === 'componentDidCatch');
      const logErrorMethod = methods.find(m => m.name === 'logError');
      const handleRetryMethod = methods.find(m => m.name === 'handleRetry');
      const renderErrorMethod = methods.find(m => m.name === 'renderError');
      const renderMethod = methods.find(m => m.name === 'render');

      expect(getDerivedStateMethod?.type).toBe('class_method'); // static
      expect(componentDidCatchMethod?.type).toBe('method');
      expect(logErrorMethod?.type).toBe('method');
      expect(logErrorMethod?.isPrivate).toBe(true);
      expect(handleRetryMethod?.type).toBe('method');
      expect(renderErrorMethod?.type).toBe('method');
      expect(renderMethod?.type).toBe('method');
    });
  });

  describe('カスタムフック', () => {
    test('カスタムフックを検出できる', () => {
      const content = `
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiOptions<T> {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

function useApi<T>(
  url: string, 
  options: UseApiOptions<T> = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(options.initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // 前のリクエストをキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      const response = await fetch(url, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const result = await response.json();
      setData(result);
      options.onSuccess?.(result);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        options.onError?.(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, options.onSuccess, options.onError]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { data, loading, error, refetch };
}

const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(\`Error reading localStorage key "\${key}":\`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(\`Error setting localStorage key "\${key}":\`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(\`Error removing localStorage key "\${key}":\`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
};

export { useApi, useLocalStorage };
`;

      const file = createTsxFile(content);
      const methods = analyzeMethodsInFile(file);

      const useApiHook = methods.find(m => m.name === 'useApi');
      const fetchDataMethod = methods.find(m => m.name === 'fetchData');
      const refetchMethod = methods.find(m => m.name === 'refetch');
      const useLocalStorageHook = methods.find(m => m.name === 'useLocalStorage');
      const setValueMethod = methods.find(m => m.name === 'setValue');
      const removeValueMethod = methods.find(m => m.name === 'removeValue');

      expect(useApiHook?.type).toBe('function');
      expect(fetchDataMethod?.type).toBe('function');
      expect(refetchMethod?.type).toBe('function');
      expect(useLocalStorageHook?.type).toBe('function');
      expect(setValueMethod?.type).toBe('function');
      expect(removeValueMethod?.type).toBe('function');
    });
  });

  describe('高次コンポーネント（HOC）', () => {
    test('HOCを検出できる', () => {
      const content = `
import React, { ComponentType, useEffect, useState } from 'react';

interface WithLoadingProps {
  loading?: boolean;
  LoadingComponent?: ComponentType;
}

function withLoading<P extends object>(
  WrappedComponent: ComponentType<P>
): ComponentType<P & WithLoadingProps> {
  const WithLoadingComponent = (props: P & WithLoadingProps) => {
    const { loading, LoadingComponent, ...rest } = props;

    if (loading) {
      return LoadingComponent ? (
        <LoadingComponent />
      ) : (
        <div>Loading...</div>
      );
    }

    return <WrappedComponent {...(rest as P)} />;
  };

  WithLoadingComponent.displayName = \`withLoading(\${WrappedComponent.displayName || WrappedComponent.name})\`;

  return WithLoadingComponent;
}

interface WithErrorBoundaryProps {
  fallback?: ComponentType<{ error: Error }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>
): ComponentType<P & WithErrorBoundaryProps> {
  return class WithErrorBoundaryComponent extends React.Component<
    P & WithErrorBoundaryProps,
    { hasError: boolean; error: Error | null }
  > {
    static displayName = \`withErrorBoundary(\${WrappedComponent.displayName || WrappedComponent.name})\`;

    constructor(props: P & WithErrorBoundaryProps) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      this.props.onError?.(error, errorInfo);
    }

    render() {
      if (this.state.hasError && this.state.error) {
        const { fallback: FallbackComponent } = this.props;
        return FallbackComponent ? (
          <FallbackComponent error={this.state.error} />
        ) : (
          <div>Something went wrong</div>
        );
      }

      const { fallback, onError, ...rest } = this.props;
      return <WrappedComponent {...(rest as P)} />;
    }
  };
}

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authUser = await getCurrentUser();
      setUser(authUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, isAuthenticated: !!user };
};

function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>
): ComponentType<P> {
  const WithAuthComponent = (props: P) => {
    const { user, loading, isAuthenticated } = useAuth();

    if (loading) {
      return <div>Checking authentication...</div>;
    }

    if (!isAuthenticated) {
      return <div>Please log in to access this content</div>;
    }

    return <WrappedComponent {...props} user={user} />;
  };

  WithAuthComponent.displayName = \`withAuth(\${WrappedComponent.displayName || WrappedComponent.name})\`;

  return WithAuthComponent;
}

export { withLoading, withErrorBoundary, withAuth };
`;

      const file = createTsxFile(content);
      const methods = analyzeMethodsInFile(file);

      const withLoadingHOC = methods.find(m => m.name === 'withLoading');
      const withErrorBoundaryHOC = methods.find(m => m.name === 'withErrorBoundary');
      const useAuthHook = methods.find(m => m.name === 'useAuth');
      const checkAuthStatusMethod = methods.find(m => m.name === 'checkAuthStatus');
      const withAuthHOC = methods.find(m => m.name === 'withAuth');

      expect(withLoadingHOC?.type).toBe('function');
      expect(withErrorBoundaryHOC?.type).toBe('function');
      expect(useAuthHook?.type).toBe('function');
      expect(checkAuthStatusMethod?.type).toBe('function');
      expect(withAuthHOC?.type).toBe('function');
    });
  });

  describe('Context API', () => {
    test('Contextプロバイダーとフックを検出できる', () => {
      const content = `
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    loading: false
  });

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const user = await authenticateUser(email, password);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      storeAuthToken(user.id);
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = (): void => {
    dispatch({ type: 'LOGOUT' });
    clearAuthToken();
    redirectToLogin();
  };

  const updateUser = (userData: Partial<User>): void => {
    if (state.user) {
      const updatedUser = { ...state.user, ...userData };
      dispatch({ type: 'LOGIN_SUCCESS', payload: updatedUser });
    }
  };

  const contextValue: AuthContextType = {
    state,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthUser = () => {
  const { state } = useAuth();
  return state.user;
};

export const useAuthActions = () => {
  const { login, logout, updateUser } = useAuth();
  return { login, logout, updateUser };
};
`;

      const file = createTsxFile(content);
      const methods = analyzeMethodsInFile(file);

      const authReducerFunction = methods.find(m => m.name === 'authReducer');
      const authProviderComponent = methods.find(m => m.name === 'AuthProvider');
      const loginMethod = methods.find(m => m.name === 'login');
      const logoutMethod = methods.find(m => m.name === 'logout');
      const updateUserMethod = methods.find(m => m.name === 'updateUser');
      const useAuthHook = methods.find(m => m.name === 'useAuth');
      const useAuthUserHook = methods.find(m => m.name === 'useAuthUser');
      const useAuthActionsHook = methods.find(m => m.name === 'useAuthActions');

      expect(authReducerFunction?.type).toBe('function');
      expect(authProviderComponent?.type).toBe('component');
      expect(loginMethod?.type).toBe('function');
      expect(logoutMethod?.type).toBe('function');
      expect(updateUserMethod?.type).toBe('function');
      expect(useAuthHook?.type).toBe('function');
      expect(useAuthUserHook?.type).toBe('function');
      expect(useAuthActionsHook?.type).toBe('function');
    });
  });

  describe('メソッド呼び出し検出', () => {
    test('JSX内のイベントハンドラーとメソッド呼び出しを検出できる', () => {
      const content = `
const TodoList: React.FC<TodoListProps> = ({ todos, onToggle, onDelete, onEdit }) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredTodos = useMemo(() => {
    return filterTodos(todos, filter);
  }, [todos, filter]);

  const handleToggle = useCallback((id: string) => {
    const todo = findTodoById(todos, id);
    if (todo) {
      onToggle(id, !todo.completed);
      logTodoAction('toggle', id);
    }
  }, [todos, onToggle]);

  const handleDelete = useCallback((id: string) => {
    if (confirmDelete()) {
      onDelete(id);
      logTodoAction('delete', id);
      showNotification('Todo deleted');
    }
  }, [onDelete]);

  const handleEdit = useCallback((id: string, newText: string) => {
    if (validateTodoText(newText)) {
      onEdit(id, newText);
      setEditingId(null);
      logTodoAction('edit', id);
    } else {
      showValidationError('Invalid todo text');
    }
  }, [onEdit]);

  const handleFilterChange = useCallback((newFilter: 'all' | 'completed' | 'active') => {
    setFilter(newFilter);
    logFilterChange(newFilter);
  }, []);

  const renderTodoItem = useCallback((todo: Todo) => {
    const isEditing = editingId === todo.id;

    return (
      <div key={todo.id} className={getTodoClassName(todo)}>
        {isEditing ? (
          <TodoEditForm
            todo={todo}
            onSave={(text) => handleEdit(todo.id, text)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <TodoDisplay
            todo={todo}
            onToggle={() => handleToggle(todo.id)}
            onDelete={() => handleDelete(todo.id)}
            onEdit={() => setEditingId(todo.id)}
          />
        )}
      </div>
    );
  }, [editingId, handleToggle, handleDelete, handleEdit]);

  useEffect(() => {
    updateTodoStats(filteredTodos);
  }, [filteredTodos]);

  return (
    <div className="todo-list">
      <TodoFilter
        currentFilter={filter}
        onFilterChange={handleFilterChange}
      />
      <div className="todos">
        {filteredTodos.map(renderTodoItem)}
      </div>
      <TodoSummary todos={filteredTodos} />
    </div>
  );
};
`;

      const file = createTsxFile(content);
      const allMethods = new Set([
        'filterTodos', 'findTodoById', 'confirmDelete', 'logTodoAction', 
        'showNotification', 'validateTodoText', 'showValidationError',
        'logFilterChange', 'getTodoClassName', 'updateTodoStats'
      ]);
      const methods = analyzeMethodsInFile(file, allMethods);

      const handleToggleMethod = methods.find(m => m.name === 'handleToggle');
      const handleDeleteMethod = methods.find(m => m.name === 'handleDelete');
      const handleEditMethod = methods.find(m => m.name === 'handleEdit');
      const renderTodoItemMethod = methods.find(m => m.name === 'renderTodoItem');

      expect(handleToggleMethod).toBeDefined();
      expect(handleDeleteMethod).toBeDefined();
      expect(handleEditMethod).toBeDefined();
      expect(renderTodoItemMethod).toBeDefined();

      // メソッド呼び出しの検出確認
      const handleToggleCalls = handleToggleMethod?.calls.map(c => c.methodName) || [];
      const handleDeleteCalls = handleDeleteMethod?.calls.map(c => c.methodName) || [];
      const handleEditCalls = handleEditMethod?.calls.map(c => c.methodName) || [];

      expect(handleToggleCalls).toContain('findTodoById');
      expect(handleToggleCalls).toContain('logTodoAction');
      expect(handleDeleteCalls).toContain('confirmDelete');
      expect(handleDeleteCalls).toContain('showNotification');
      expect(handleEditCalls).toContain('validateTodoText');
      expect(handleEditCalls).toContain('showValidationError');
    });
  });

  describe('エラーハンドリングとエッジケース', () => {
    test('JSX構文エラーがあるファイルでも部分的に解析できる', () => {
      const content = `
const ValidComponent: React.FC = () => {
  const handleClick = () => {
    console.log('clicked');
  };

  return (
    <button onClick={handleClick}>
      Valid Button
    </button>
  );
};

// JSX構文エラー
const InvalidComponent: React.FC = () => {
  const handleAction = () => {
    processAction();
  };

  return (
    <div>
      <span>Invalid JSX
      // 閉じタグなし
    </div>
  );
};

// この後の関数は正常
const AnotherValidComponent: React.FC = () => {
  return <div>Another valid component</div>;
};
`;

      const file = createTsxFile(content);
      const methods = analyzeMethodsInFile(file);

      // エラーがあっても解析が完全に停止しないことを確認
      expect(methods.length).toBeGreaterThan(0);
      
      const validComponent = methods.find(m => m.name === 'ValidComponent');
      const handleClickMethod = methods.find(m => m.name === 'handleClick');
      
      expect(validComponent).toBeDefined();
      expect(handleClickMethod).toBeDefined();
    });
  });
});