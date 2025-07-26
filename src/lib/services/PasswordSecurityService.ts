/**
 * Password Security Service
 * Implements enhanced password policies and security measures
 */

export interface PasswordStrength {
  score: number; // 0-5 (0 = very weak, 5 = very strong)
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
    notCommon: boolean;
    notPersonalInfo: boolean;
  };
  isValid: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  blockCommonPasswords: boolean;
  blockPersonalInfo: boolean;
  maxConsecutiveRepeats: number;
}

export class PasswordSecurityService {
  // SECURITY ENHANCED: Stronger password policy (was 6 chars minimum)
  static readonly DEFAULT_POLICY: PasswordPolicy = {
    minLength: 12, // Increased from 6 to 12
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    blockCommonPasswords: true,
    blockPersonalInfo: true,
    maxConsecutiveRepeats: 2,
  };

  // Common passwords to block (top 100 most common)
  private static readonly COMMON_PASSWORDS = new Set([
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
    'qwerty123', 'dragon', 'master', 'hello', 'login', 'access',
    'superman', 'batman', 'trustno1', 'freedom', 'whatever', 'shadow',
    'michael', 'jordan', 'harley', 'ranger', 'iwantu', 'jennifer',
    'hunter', 'fuckyou', '2000', 'test', 'batman', 'trustno1',
    'thomas', 'robert', 'access', 'love', 'buster', 'soccer',
    // Add more as needed
  ]);

  /**
   * Validate password against security policy
   */
  static validatePassword(
    password: string, 
    policy: PasswordPolicy = this.DEFAULT_POLICY,
    userInfo?: { email?: string; name?: string; phone?: string }
  ): PasswordStrength {
    const requirements = {
      minLength: password.length >= policy.minLength,
      hasUppercase: policy.requireUppercase ? /[A-Z]/.test(password) : true,
      hasLowercase: policy.requireLowercase ? /[a-z]/.test(password) : true,
      hasNumbers: policy.requireNumbers ? /\d/.test(password) : true,
      hasSpecialChars: policy.requireSpecialChars ? /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) : true,
      notCommon: policy.blockCommonPasswords ? !this.isCommonPassword(password) : true,
      notPersonalInfo: policy.blockPersonalInfo ? !this.containsPersonalInfo(password, userInfo) : true,
    };

    const feedback: string[] = [];
    let score = 0;

    // Check each requirement
    if (!requirements.minLength) {
      feedback.push(`Password must be at least ${policy.minLength} characters long`);
    } else {
      score += 1;
    }

    if (!requirements.hasUppercase) {
      feedback.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    if (!requirements.hasLowercase) {
      feedback.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    if (!requirements.hasNumbers) {
      feedback.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    if (!requirements.hasSpecialChars) {
      feedback.push('Password must contain at least one special character (!@#$%^&*...)');
    } else {
      score += 1;
    }

    if (!requirements.notCommon) {
      feedback.push('Password is too common. Please choose a more unique password');
    }

    if (!requirements.notPersonalInfo) {
      feedback.push('Password should not contain personal information');
    }

    // Check for consecutive repeating characters
    if (this.hasConsecutiveRepeats(password, policy.maxConsecutiveRepeats)) {
      feedback.push(`Password should not have more than ${policy.maxConsecutiveRepeats} consecutive repeating characters`);
    }

    // Additional strength checks
    if (password.length >= 16) score += 1; // Bonus for extra length
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{2,}/.test(password)) score += 1; // Multiple special chars

    const isValid = Object.values(requirements).every(req => req) && 
                   !this.hasConsecutiveRepeats(password, policy.maxConsecutiveRepeats);

    if (isValid && feedback.length === 0) {
      if (score >= 6) {
        feedback.push('Very strong password');
      } else if (score >= 5) {
        feedback.push('Strong password');
      } else {
        feedback.push('Good password');
      }
    }

    return {
      score: Math.min(score, 5),
      feedback,
      requirements,
      isValid,
    };
  }

  /**
   * Check if password is in common passwords list
   */
  private static isCommonPassword(password: string): boolean {
    return this.COMMON_PASSWORDS.has(password.toLowerCase());
  }

  /**
   * Check if password contains personal information
   */
  private static containsPersonalInfo(password: string, userInfo?: { email?: string; name?: string; phone?: string }): boolean {
    if (!userInfo) return false;

    const lowerPassword = password.toLowerCase();
    
    // Check email parts
    if (userInfo.email) {
      const emailParts = userInfo.email.toLowerCase().split('@')[0].split(/[.\-_]/);
      for (const part of emailParts) {
        if (part.length >= 3 && lowerPassword.includes(part)) {
          return true;
        }
      }
    }

    // Check name parts
    if (userInfo.name) {
      const nameParts = userInfo.name.toLowerCase().split(/\s+/);
      for (const part of nameParts) {
        if (part.length >= 3 && lowerPassword.includes(part)) {
          return true;
        }
      }
    }

    // Check phone number
    if (userInfo.phone) {
      const phoneDigits = userInfo.phone.replace(/\D/g, '');
      if (phoneDigits.length >= 4 && password.includes(phoneDigits.slice(-4))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for consecutive repeating characters
   */
  private static hasConsecutiveRepeats(password: string, maxRepeats: number): boolean {
    let consecutiveCount = 1;
    
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        consecutiveCount++;
        if (consecutiveCount > maxRepeats) {
          return true;
        }
      } else {
        consecutiveCount = 1;
      }
    }
    
    return false;
  }

  /**
   * Generate a secure password suggestion
   */
  static generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];
    
    // Fill the rest randomly
    const allChars = uppercase + lowercase + numbers + specialChars;
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password has been compromised in data breaches
   * (In production, this would call an API like HaveIBeenPwned)
   */
  static async checkBreachedPassword(password: string): Promise<{ isBreached: boolean; breachCount?: number }> {
    // For demo purposes, return false
    // In production, implement SHA-1 hash check against HaveIBeenPwned API
    
    // Example implementation:
    // const sha1Hash = CryptoJS.SHA1(password).toString();
    // const prefix = sha1Hash.substring(0, 5);
    // const suffix = sha1Hash.substring(5).toUpperCase();
    // 
    // const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    // const hashes = await response.text();
    // 
    // const breachLine = hashes.split('\n').find(line => line.startsWith(suffix));
    // if (breachLine) {
    //   const count = parseInt(breachLine.split(':')[1]);
    //   return { isBreached: true, breachCount: count };
    // }
    
    return { isBreached: false };
  }
}