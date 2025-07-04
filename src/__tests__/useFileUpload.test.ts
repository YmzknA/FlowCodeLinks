import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileUpload } from '@/hooks/useFileUpload';

// File.prototype.textをモック
const mockFileText = jest.fn();
global.File = class MockFile {
  name: string;
  size: number;
  type: string;

  constructor(parts: any[], filename: string, options: any = {}) {
    this.name = filename;
    this.size = options.size || 1000;
    this.type = options.type || 'text/markdown';
  }

  text = mockFileText;
} as any;

const createMockEvent = (file: File | null) => ({
  target: {
    files: file ? [file] : null
  }
} as React.ChangeEvent<HTMLInputElement>);

const mockFile = new File(['mock content'], 'test.md', { type: 'text/markdown' });

describe('useFileUpload hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileText.mockResolvedValue('mock file content');
  });

  test('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.uploadResult).toEqual({
      content: '',
      isLoading: false,
      error: null
    });
    expect(typeof result.current.handleFileUpload).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    expect(typeof result.current.resetUpload).toBe('function');
  });

  test('ファイルアップロードが成功する', async () => {
    const { result } = renderHook(() => useFileUpload());
    const event = createMockEvent(mockFile);

    await act(async () => {
      await result.current.handleFileUpload(event);
    });

    expect(result.current.uploadResult.content).toBe('mock file content');
    expect(result.current.uploadResult.isLoading).toBe(false);
    expect(result.current.uploadResult.error).toBeNull();
  });

  test('不正なファイル形式でエラーになる', async () => {
    const { result } = renderHook(() => useFileUpload());
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    const event = createMockEvent(invalidFile);

    await act(async () => {
      await result.current.handleFileUpload(event);
    });

    expect(result.current.uploadResult.error).toBe('mdファイルのみアップロード可能です。');
    expect(result.current.uploadResult.isLoading).toBe(false);
  });

  test('大きすぎるファイルでエラーになる', async () => {
    const { result } = renderHook(() => useFileUpload());
    
    // 10MB超のファイルをモック
    const largeFile = new File(['content'], 'large.md', { 
      type: 'text/markdown',
      size: 11 * 1024 * 1024 // 11MB
    });
    const event = createMockEvent(largeFile);

    await act(async () => {
      await result.current.handleFileUpload(event);
    });

    expect(result.current.uploadResult.error).toBe('ファイルサイズが10MBを超えています。より小さなファイルを選択してください。');
    expect(result.current.uploadResult.isLoading).toBe(false);
  });

  test('ファイル読み込みエラーが処理される', async () => {
    const { result } = renderHook(() => useFileUpload());
    
    // file.text()でエラーを発生させる
    mockFileText.mockRejectedValue(new Error('File read error'));
    const event = createMockEvent(mockFile);

    await act(async () => {
      await result.current.handleFileUpload(event);
    });

    expect(result.current.uploadResult.error).toBe('ファイルの読み込みに失敗しました。');
    expect(result.current.uploadResult.isLoading).toBe(false);
  });

  test('アップロードリセットが動作する', async () => {
    const { result } = renderHook(() => useFileUpload());
    const event = createMockEvent(mockFile);

    // まずファイルをアップロード
    await act(async () => {
      await result.current.handleFileUpload(event);
    });

    expect(result.current.uploadResult.content).toBe('mock file content');

    // リセット実行
    act(() => {
      result.current.resetUpload();
    });

    expect(result.current.uploadResult).toEqual({
      content: '',
      isLoading: false,
      error: null
    });
  });

  test('ファイルが選択されていない場合は何もしない', async () => {
    const { result } = renderHook(() => useFileUpload());
    const event = createMockEvent(null);

    await act(async () => {
      await result.current.handleFileUpload(event);
    });

    // 何も変更されない
    expect(result.current.uploadResult).toEqual({
      content: '',
      isLoading: false,
      error: null
    });
  });

  test('clearError関数が動作する', () => {
    const { result } = renderHook(() => useFileUpload());

    // まずエラー状態にする
    act(() => {
      result.current.uploadResult.error = 'テストエラー';
    });

    // エラーをクリア
    act(() => {
      result.current.clearError();
    });

    expect(result.current.uploadResult.error).toBeNull();
  });

  test('空のファイルでエラーになる', async () => {
    const { result } = renderHook(() => useFileUpload());
    
    // 空の内容を返すモック
    mockFileText.mockResolvedValue('   \n\t  '); // 空白文字のみ
    const event = createMockEvent(mockFile);

    await act(async () => {
      await result.current.handleFileUpload(event);
    });

    expect(result.current.uploadResult.error).toBe('ファイルが空です。内容のあるファイルを選択してください。');
  });
});