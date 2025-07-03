import { parseRepomixFile } from '@/utils/parser';
import { RepomixFile, Language } from '@/types/codebase';

describe('Repomixファイルパーサーのテスト', () => {
  const sampleRepomixContent = `This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.

# Directory Structure
\`\`\`
app/
  controllers/
    application_controller.rb
  models/
    user.rb
lib/
  utils.js
\`\`\`

## File: app/controllers/application_controller.rb

\`\`\`ruby
class ApplicationController < ActionController::Base
  def index
    render json: { message: 'Hello World' }
  end

  private

  def authenticate_user
    # authentication logic
  end
end
\`\`\`

## File: app/models/user.rb

\`\`\`ruby
class User < ApplicationRecord
  def full_name
    "#{first_name} #{last_name}"
  end
end
\`\`\`

## File: lib/utils.js

\`\`\`javascript
function calculateSum(a, b) {
  return a + b;
}

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

module.exports = {
  calculateSum,
  formatDate
};
\`\`\``;

  test('Repomixファイルを正常に解析できる', () => {
    const result = parseRepomixFile(sampleRepomixContent);
    
    expect(result.files).toHaveLength(3);
    expect(result.directoryStructure).toContain('app/');
    expect(result.directoryStructure).toContain('lib/');
  });

  test('ファイルパスと内容が正しく抽出される', () => {
    const result = parseRepomixFile(sampleRepomixContent);
    
    const rubyFile = result.files.find(f => f.path === 'app/controllers/application_controller.rb');
    expect(rubyFile).toBeDefined();
    expect(rubyFile?.content).toContain('class ApplicationController');
    
    const jsFile = result.files.find(f => f.path === 'lib/utils.js');
    expect(jsFile).toBeDefined();
    expect(jsFile?.content).toContain('function calculateSum');
  });

  test('言語が正しく識別される', () => {
    const result = parseRepomixFile(sampleRepomixContent);
    
    const rubyFile = result.files.find(f => f.path.endsWith('.rb'));
    expect(rubyFile?.language).toBe('ruby');
    
    const jsFile = result.files.find(f => f.path.endsWith('.js'));
    expect(jsFile?.language).toBe('javascript');
  });

  test('ディレクトリとファイル名が正しく分離される', () => {
    const result = parseRepomixFile(sampleRepomixContent);
    
    const controllerFile = result.files.find(f => f.path === 'app/controllers/application_controller.rb');
    expect(controllerFile?.directory).toBe('app/controllers');
    expect(controllerFile?.fileName).toBe('application_controller.rb');
  });

  test('空のコンテンツでもエラーが発生しない', () => {
    const result = parseRepomixFile('');
    expect(result.files).toHaveLength(0);
    expect(result.directoryStructure).toBe('');
  });

  test('不正な形式のファイルでも部分的に解析できる', () => {
    const invalidContent = `## File: test.rb
\`\`\`ruby
def test
  puts "hello"
end
\`\`\``;
    
    const result = parseRepomixFile(invalidContent);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('test.rb');
  });
});