/**
 * セキュリティポリシー体系化
 * 統一されたセキュリティポリシーと検証ロジックを提供
 */

// セキュリティポリシー型定義
export interface ContentTypePolicy {
  allowed: string[];
  strictMode: boolean;
  customValidator?: (contentType: string) => boolean;
}

export interface FileSizePolicy {
  maxSize: number;
  unit: 'bytes' | 'kb' | 'mb' | 'gb';
  customValidator?: (size: number) => boolean;
}

export interface EncodingPolicy {
  allowedEncodings: string[];
  defaultEncoding: string;
  strictMode: boolean;
}

export interface SanitizationPolicy {
  htmlSanitization: boolean;
  scriptFiltering: boolean;
  sqlInjectionProtection: boolean;
  xssProtection: boolean;
  customSanitizers?: Array<(input: string) => string>;
}

export interface RateLimitPolicy {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: Request) => string;
}

export interface AuthenticationPolicy {
  required: boolean;
  methods: ('basic' | 'bearer' | 'session' | 'apikey')[];
  tokenExpiration: number;
  refreshTokenSupport: boolean;
}

export interface AuthorizationPolicy {
  required: boolean;
  roles: string[];
  permissions: string[];
  resourceBasedAccess?: boolean;
}

export interface EncryptionPolicy {
  algorithm: string;
  keyLength: number;
  saltLength: number;
  iterations: number;
  required: boolean;
}

export interface MaskingPolicy {
  enabled: boolean;
  patterns: Array<{
    pattern: RegExp;
    replacement: string;
  }>;
  customMaskers?: Array<(input: string) => string>;
}

export interface StoragePolicy {
  encrypted: boolean;
  maxAge: number;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  httpOnly: boolean;
}

export interface LoggingPolicy {
  level: 'error' | 'warn' | 'info' | 'debug';
  includeStackTrace: boolean;
  includeSensitiveData: boolean;
  maxLogSize: number;
  retention: number;
}

export interface MonitoringPolicy {
  enabled: boolean;
  metrics: string[];
  alertThresholds: Record<string, number>;
  reportingInterval: number;
}

export interface AlertingPolicy {
  enabled: boolean;
  channels: ('email' | 'sms' | 'webhook' | 'console')[];
  severityFilters: ('low' | 'medium' | 'high' | 'critical')[];
  rateLimiting: boolean;
}

// 統一セキュリティポリシー
export interface SecurityPolicy {
  // 入力検証
  inputValidation: {
    contentType: ContentTypePolicy;
    fileSize: FileSizePolicy;
    encoding: EncodingPolicy;
    sanitization: SanitizationPolicy;
  };
  
  // アクセス制御
  accessControl: {
    authentication: AuthenticationPolicy;
    authorization: AuthorizationPolicy;
    rateLimit: RateLimitPolicy;
  };
  
  // データ保護
  dataProtection: {
    encryption: EncryptionPolicy;
    masking: MaskingPolicy;
    storage: StoragePolicy;
  };
  
  // 監査
  auditing: {
    logging: LoggingPolicy;
    monitoring: MonitoringPolicy;
    alerting: AlertingPolicy;
  };
}

// セキュリティポリシーの実装クラス
export class SecurityPolicyManager {
  private policy: SecurityPolicy;
  
  constructor(policy: SecurityPolicy) {
    this.policy = policy;
  }
  
  /**
   * Content-Type検証
   */
  validateContentType(contentType: string): boolean {
    const policy = this.policy.inputValidation.contentType;
    
    if (!contentType) {
      return !policy.strictMode;
    }
    
    // カスタムバリデーター優先
    if (policy.customValidator) {
      return policy.customValidator(contentType);
    }
    
    // 許可リストチェック
    const isAllowed = policy.allowed.some(allowed => 
      contentType.includes(allowed)
    );
    
    return isAllowed;
  }
  
  /**
   * ファイルサイズ検証
   */
  validateFileSize(size: number): boolean {
    const policy = this.policy.inputValidation.fileSize;
    
    // カスタムバリデーター優先
    if (policy.customValidator) {
      return policy.customValidator(size);
    }
    
    // 単位換算
    const multiplier = {
      'bytes': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    }[policy.unit];
    
    const maxSizeInBytes = policy.maxSize * multiplier;
    
    return size <= maxSizeInBytes;
  }
  
  /**
   * エンコーディング検証
   */
  validateEncoding(encoding: string): boolean {
    const policy = this.policy.inputValidation.encoding;
    
    if (!encoding) {
      return !policy.strictMode;
    }
    
    return policy.allowedEncodings.includes(encoding);
  }
  
  /**
   * 入力サニタイゼーション
   */
  sanitizeInput(input: string): string {
    const policy = this.policy.inputValidation.sanitization;
    let sanitized = input;
    
    // HTMLサニタイゼーション
    if (policy.htmlSanitization) {
      sanitized = this.sanitizeHtml(sanitized);
    }
    
    // スクリプトフィルタリング
    if (policy.scriptFiltering) {
      sanitized = this.filterScripts(sanitized);
    }
    
    // SQLインジェクション対策
    if (policy.sqlInjectionProtection) {
      sanitized = this.protectSqlInjection(sanitized);
    }
    
    // XSS対策
    if (policy.xssProtection) {
      sanitized = this.protectXss(sanitized);
    }
    
    // カスタムサニタイザー
    if (policy.customSanitizers) {
      policy.customSanitizers.forEach(sanitizer => {
        sanitized = sanitizer(sanitized);
      });
    }
    
    return sanitized;
  }
  
  /**
   * レート制限チェック
   */
  checkRateLimit(identifier: string): boolean {
    const policy = this.policy.accessControl.rateLimit;
    
    // 簡易実装（実際にはRedisなどを使用）
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - policy.windowMs;
    
    // メモリベースの簡易実装
    const requests = this.getStoredRequests(key);
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= policy.maxRequests) {
      return false;
    }
    
    // 新しいリクエストを記録
    this.storeRequest(key, now);
    
    return true;
  }
  
  /**
   * データマスキング
   */
  maskSensitiveData(data: string): string {
    const policy = this.policy.dataProtection.masking;
    
    if (!policy.enabled) {
      return data;
    }
    
    let masked = data;
    
    // パターンベースマスキング
    policy.patterns.forEach(({ pattern, replacement }) => {
      masked = masked.replace(pattern, replacement);
    });
    
    // カスタムマスカー
    if (policy.customMaskers) {
      policy.customMaskers.forEach(masker => {
        masked = masker(masked);
      });
    }
    
    return masked;
  }
  
  /**
   * セキュリティログ出力
   */
  logSecurityEvent(event: string, details: any): void {
    const policy = this.policy.auditing.logging;
    
    if (policy.level === 'error' && !event.includes('error')) {
      return;
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details: policy.includeSensitiveData ? details : this.maskSensitiveData(JSON.stringify(details)),
      ...(policy.includeStackTrace && { stack: new Error().stack })
    };
    
    console.log('[SECURITY]', logEntry);
  }
  
  // プライベートメソッド
  private sanitizeHtml(input: string): string {
    // 基本的なHTMLタグ除去
    return input.replace(/<[^>]*>/g, '');
  }
  
  private filterScripts(input: string): string {
    // scriptタグとjavascript:プロトコルを除去
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '');
  }
  
  private protectSqlInjection(input: string): string {
    // 基本的なSQLインジェクション対策
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|OR|AND)\b)/gi,
      /('|(\\')|(;)|(\\)|(\-\-)|(\|))/g
    ];
    
    let protected = input;
    sqlPatterns.forEach(pattern => {
      protected = protected.replace(pattern, '');
    });
    
    return protected;
  }
  
  private protectXss(input: string): string {
    // XSS対策（基本的なエスケープ）
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  private getStoredRequests(key: string): number[] {
    // 簡易実装：sessionStorageを使用
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }
  
  private storeRequest(key: string, timestamp: number): void {
    const requests = this.getStoredRequests(key);
    requests.push(timestamp);
    
    // 古いリクエストを削除
    const windowStart = Date.now() - this.policy.accessControl.rateLimit.windowMs;
    const validRequests = requests.filter(ts => ts > windowStart);
    
    sessionStorage.setItem(key, JSON.stringify(validRequests));
  }
}

// 事前定義されたセキュリティポリシー
export const DEMO_SECURITY_POLICY: SecurityPolicy = {
  inputValidation: {
    contentType: {
      allowed: ['text/markdown', 'text/plain'],
      strictMode: true
    },
    fileSize: {
      maxSize: 1,
      unit: 'mb'
    },
    encoding: {
      allowedEncodings: ['utf-8', 'utf-16'],
      defaultEncoding: 'utf-8',
      strictMode: false
    },
    sanitization: {
      htmlSanitization: true,
      scriptFiltering: true,
      sqlInjectionProtection: true,
      xssProtection: true
    }
  },
  accessControl: {
    authentication: {
      required: false,
      methods: ['session'],
      tokenExpiration: 3600000, // 1時間
      refreshTokenSupport: false
    },
    authorization: {
      required: false,
      roles: ['user'],
      permissions: ['read']
    },
    rateLimit: {
      maxRequests: 10,
      windowMs: 60000 // 1分
    }
  },
  dataProtection: {
    encryption: {
      algorithm: 'AES-256-GCM',
      keyLength: 256,
      saltLength: 16,
      iterations: 10000,
      required: false
    },
    masking: {
      enabled: true,
      patterns: [
        { pattern: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, replacement: '****-****-****-****' },
        { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '***@***.***' }
      ]
    },
    storage: {
      encrypted: false,
      maxAge: 3600000,
      secure: true,
      sameSite: 'strict',
      httpOnly: true
    }
  },
  auditing: {
    logging: {
      level: 'info',
      includeStackTrace: true,
      includeSensitiveData: false,
      maxLogSize: 1000,
      retention: 7 * 24 * 60 * 60 * 1000 // 7日間
    },
    monitoring: {
      enabled: true,
      metrics: ['requests', 'errors', 'performance'],
      alertThresholds: {
        errorRate: 0.05,
        responseTime: 1000
      },
      reportingInterval: 60000 // 1分
    },
    alerting: {
      enabled: true,
      channels: ['console'],
      severityFilters: ['high', 'critical'],
      rateLimiting: true
    }
  }
};

// 高セキュリティポリシー（将来の機能拡張用）
export const HIGH_SECURITY_POLICY: SecurityPolicy = {
  ...DEMO_SECURITY_POLICY,
  inputValidation: {
    ...DEMO_SECURITY_POLICY.inputValidation,
    contentType: {
      allowed: ['text/plain'],
      strictMode: true
    },
    fileSize: {
      maxSize: 500,
      unit: 'kb'
    }
  },
  accessControl: {
    ...DEMO_SECURITY_POLICY.accessControl,
    authentication: {
      required: true,
      methods: ['bearer'],
      tokenExpiration: 900000, // 15分
      refreshTokenSupport: true
    },
    authorization: {
      required: true,
      roles: ['admin', 'user'],
      permissions: ['read', 'write'],
      resourceBasedAccess: true
    },
    rateLimit: {
      maxRequests: 5,
      windowMs: 60000
    }
  },
  dataProtection: {
    ...DEMO_SECURITY_POLICY.dataProtection,
    encryption: {
      algorithm: 'AES-256-GCM',
      keyLength: 256,
      saltLength: 32,
      iterations: 100000,
      required: true
    },
    storage: {
      encrypted: true,
      maxAge: 900000,
      secure: true,
      sameSite: 'strict',
      httpOnly: true
    }
  }
};

// デフォルトセキュリティポリシーマネージャー
export const defaultSecurityManager = new SecurityPolicyManager(DEMO_SECURITY_POLICY);