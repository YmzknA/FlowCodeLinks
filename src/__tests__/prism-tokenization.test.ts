import Prism from 'prismjs';

describe('Prism.js Tokenization Debug', () => {
  beforeAll(() => {
    // Load Ruby language for Prism
    require('prismjs/components/prism-ruby');
  });

  it('should show how Prism tokenizes Ruby methods with ?', () => {
    const rubyCode = `def notifications_enabled?
  is_notifications_enabled == true
end

def check_status
  return false unless notifications_enabled?
  true
end`;

    const highlighted = Prism.highlight(rubyCode, Prism.languages.ruby, 'ruby');
    
    console.log('Original code:');
    console.log(rubyCode);
    console.log('\nPrism highlighted HTML:');
    console.log(highlighted);
    
    // Check if notifications_enabled? is split
    expect(highlighted).toContain('notifications_enabled');
    
    // Print lines to see tokenization
    const lines = highlighted.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('notifications_enabled')) {
        console.log(`Line ${index + 1}: ${line}`);
      }
    });
  });

  it('should show how Prism tokenizes various Ruby methods', () => {
    const rubyCode = `def save!
  @saved = true
end

def admin?
  @role == 'admin'
end

def valid=
  @valid = true
end`;

    const highlighted = Prism.highlight(rubyCode, Prism.languages.ruby, 'ruby');
    
    console.log('\nVarious Ruby methods:');
    console.log('Original:', rubyCode);
    console.log('Highlighted:', highlighted);
  });
});