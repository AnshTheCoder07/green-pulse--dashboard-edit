/**
 * Tests for user utility functions
 */

import { generateInitials, getDisplayName } from '../userUtils';

describe('userUtils', () => {
  describe('generateInitials', () => {
    it('should generate initials from full name', () => {
      expect(generateInitials('John Doe')).toBe('JD');
      expect(generateInitials('Jane Smith')).toBe('JS');
      expect(generateInitials('Alice Johnson Brown')).toBe('AJ');
    });

    it('should handle single names', () => {
      expect(generateInitials('John')).toBe('JO');
      expect(generateInitials('A')).toBe('A');
    });

    it('should handle empty or invalid input', () => {
      expect(generateInitials('')).toBe('U');
      expect(generateInitials(null)).toBe('U');
      expect(generateInitials(undefined)).toBe('U');
      expect(generateInitials(123)).toBe('U');
    });

    it('should handle names with extra spaces', () => {
      expect(generateInitials('  John   Doe  ')).toBe('JD');
      expect(generateInitials('  Alice  ')).toBe('AL');
    });
  });

  describe('getDisplayName', () => {
    it('should return first name from full name', () => {
      expect(getDisplayName('John Doe')).toBe('John');
      expect(getDisplayName('Jane Smith')).toBe('Jane');
      expect(getDisplayName('Alice Johnson Brown')).toBe('Alice');
    });

    it('should handle single names', () => {
      expect(getDisplayName('John')).toBe('John');
      expect(getDisplayName('A')).toBe('A');
    });

    it('should handle empty or invalid input', () => {
      expect(getDisplayName('')).toBe('User');
      expect(getDisplayName(null)).toBe('User');
      expect(getDisplayName(undefined)).toBe('User');
      expect(getDisplayName(123)).toBe('User');
    });

    it('should handle names with extra spaces', () => {
      expect(getDisplayName('  John   Doe  ')).toBe('John');
      expect(getDisplayName('  Alice  ')).toBe('Alice');
    });
  });
});
