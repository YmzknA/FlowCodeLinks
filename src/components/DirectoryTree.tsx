import React, { useState, useMemo } from 'react';
import { ParsedFile } from '@/types/codebase';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: TreeNode[];
  file?: ParsedFile;
}

interface DirectoryTreeProps {
  files: ParsedFile[];
  visibleFiles: string[];
  onFileToggle: (filePath: string) => void;
  onDirectoryToggle: (directoryPath: string) => void;
  sidebarWidth: number;
}

export const DirectoryTree: React.FC<DirectoryTreeProps> = ({
  files,
  visibleFiles,
  onFileToggle,
  onDirectoryToggle,
  sidebarWidth
}) => {
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());

  const fileTree = useMemo(() => {
    const root: TreeNode = {
      name: 'root',
      path: '',
      type: 'directory',
      children: []
    };

    files.forEach(file => {
      const pathParts = file.path.split('/').filter(part => part !== '');
      let currentNode = root;

      pathParts.forEach((part, index) => {
        const isLastPart = index === pathParts.length - 1;
        const currentPath = pathParts.slice(0, index + 1).join('/');

        let childNode = currentNode.children.find(child => child.name === part);

        if (!childNode) {
          childNode = {
            name: part,
            path: currentPath,
            type: isLastPart ? 'file' : 'directory',
            children: [],
            file: isLastPart ? file : undefined
          };
          currentNode.children.push(childNode);
        }

        currentNode = childNode;
      });
    });

    const sortTree = (node: TreeNode): TreeNode => {
      const sortedChildren = node.children
        .map(sortTree)
        .sort((a, b) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          }
          return a.type === 'directory' ? -1 : 1;
        });

      return { ...node, children: sortedChildren };
    };

    return sortTree(root);
  }, [files]);

  const toggleDirectory = (dirPath: string) => {
    const newCollapsed = new Set(collapsedDirs);
    if (newCollapsed.has(dirPath)) {
      newCollapsed.delete(dirPath);
    } else {
      newCollapsed.add(dirPath);
    }
    setCollapsedDirs(newCollapsed);
  };

  const handleDirectoryToggle = (dirPath: string) => {
    const targetNode = findNodeByPath(fileTree, dirPath);
    if (!targetNode) return;
    
    const dirFiles = getDirectoryFiles(targetNode);
    const allVisible = dirFiles.every(filePath => visibleFiles.includes(filePath));
    
    if (allVisible) {
      dirFiles.forEach(filePath => {
        if (visibleFiles.includes(filePath)) {
          onFileToggle(filePath);
        }
      });
    } else {
      dirFiles.forEach(filePath => {
        if (!visibleFiles.includes(filePath)) {
          onFileToggle(filePath);
        }
      });
    }
  };

  const findNodeByPath = (node: TreeNode, targetPath: string): TreeNode | null => {
    if (node.path === targetPath) {
      return node;
    }
    
    for (const child of node.children) {
      const found = findNodeByPath(child, targetPath);
      if (found) {
        return found;
      }
    }
    
    return null;
  };

  const getDirectoryFiles = (node: TreeNode): string[] => {
    const files: string[] = [];
    if (node.type === 'file' && node.file) {
      files.push(node.file.path);
    } else {
      node.children.forEach(child => {
        files.push(...getDirectoryFiles(child));
      });
    }
    return files;
  };

  const isDirectoryVisible = (node: TreeNode): boolean => {
    const dirFiles = getDirectoryFiles(node);
    return dirFiles.some(filePath => visibleFiles.includes(filePath));
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    if (node.name === 'root') {
      return node.children.map(child => renderTreeNode(child, depth));
    }

    const isCollapsed = collapsedDirs.has(node.path);
    const isVisible = node.type === 'file' 
      ? node.file && visibleFiles.includes(node.file.path)
      : isDirectoryVisible(node);

    const paddingLeft = depth * 20;

    if (node.type === 'directory') {
      return (
        <div key={node.path}>
          <div 
            className="flex items-center py-1 hover:bg-gray-50 cursor-pointer"
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            <button
              onClick={() => toggleDirectory(node.path)}
              className="flex items-center justify-center w-4 h-4 mr-2 text-gray-500"
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
            <div className="flex items-center flex-1 min-w-0">
              <span className="text-gray-700 font-medium text-sm mr-2 truncate" title={`📁 ${node.name}`}>
                📁 {node.name}
              </span>
              <button
                onClick={() => handleDirectoryToggle(node.path)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  isVisible 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-white border-gray-300 hover:border-blue-400'
                }`}
                title={`${node.name}ディレクトリの表示切り替え`}
              >
                {isVisible && (
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          {!isCollapsed && (
            <div>
              {node.children.map(child => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div 
          key={node.path}
          className="flex items-center py-1 hover:bg-gray-50"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <div className="w-4 mr-2"></div>
          <div className="flex items-center justify-between flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center min-w-0">
                <span className="text-gray-600 text-sm mr-2">📄</span>
                <span className="font-medium text-sm truncate" title={node.name}>
                  {node.name}
                </span>
              </div>
              {node.file && (
                <div className="ml-6 text-xs text-gray-500">
                  <span className="mr-2 truncate" title={node.file.language}>
                    {node.file.language}
                  </span>
                  <span>{node.file.methods.length} メソッド</span>
                </div>
              )}
            </div>
            <button
              onClick={() => node.file && onFileToggle(node.file.path)}
              aria-label={`${node.name} の表示切り替え`}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center ml-2 transition-colors ${
                isVisible 
                  ? 'bg-blue-500 border-blue-500 text-white' 
                  : 'bg-white border-gray-300 hover:border-blue-400'
              }`}
            >
              {isVisible && (
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="py-2">
      {renderTreeNode(fileTree)}
    </div>
  );
};