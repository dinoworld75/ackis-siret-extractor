import { describe, it, expect } from 'vitest';
import { extractUrls, chunkArray } from '../urlExtractor';
import { UploadedFile } from '../../types/file.types';
import { ColumnSelection } from '../../types/column.types';

describe('urlExtractor', () => {
  describe('extractUrls', () => {
    it('should extract valid HTTP URLs', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        size: 1000,
        type: 'text/csv',
        headers: ['Name', 'URL', 'Description'],
        data: [
          ['Name', 'URL', 'Description'],
          ['Company A', 'http://example.com', 'Test company'],
          ['Company B', 'https://example.org', 'Another company'],
        ],
        rowCount: 2,
      };

      const selections: ColumnSelection[] = [
        { columnName: 'URL', priority: 1, selected: true },
        { columnName: 'Name', priority: 2, selected: false },
      ];

      const result = extractUrls(file, selections);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        url: 'http://example.com',
        rowIndex: 1,
        columnName: 'URL',
      });
      expect(result[1]).toEqual({
        url: 'https://example.org',
        rowIndex: 2,
        columnName: 'URL',
      });
    });

    it('should normalize www. URLs by adding https://', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        size: 1000,
        type: 'text/csv',
        headers: ['URL'],
        data: [
          ['URL'],
          ['www.example.com'],
          ['WWW.EXAMPLE.ORG'],
        ],
        rowCount: 2,
      };

      const selections: ColumnSelection[] = [
        { columnName: 'URL', priority: 1, selected: true },
      ];

      const result = extractUrls(file, selections);

      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('https://www.example.com');
      expect(result[1].url).toBe('https://WWW.EXAMPLE.ORG');
    });

    it('should respect column priority order', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        size: 1000,
        type: 'text/csv',
        headers: ['URL1', 'URL2', 'URL3'],
        data: [
          ['URL1', 'URL2', 'URL3'],
          ['invalid', 'http://second.com', 'http://third.com'],
          ['http://first.com', 'http://second.com', 'http://third.com'],
        ],
        rowCount: 2,
      };

      const selections: ColumnSelection[] = [
        { columnName: 'URL1', priority: 1, selected: true },
        { columnName: 'URL2', priority: 2, selected: true },
        { columnName: 'URL3', priority: 3, selected: true },
      ];

      const result = extractUrls(file, selections);

      expect(result).toHaveLength(2);
      // First row should use URL2 (URL1 is invalid)
      expect(result[0].url).toBe('http://second.com');
      expect(result[0].columnName).toBe('URL2');
      // Second row should use URL1 (highest priority)
      expect(result[1].url).toBe('http://first.com');
      expect(result[1].columnName).toBe('URL1');
    });

    it('should handle empty data', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        size: 1000,
        type: 'text/csv',
        headers: ['URL'],
        data: [['URL']],
        rowCount: 0,
      };

      const selections: ColumnSelection[] = [
        { columnName: 'URL', priority: 1, selected: true },
      ];

      const result = extractUrls(file, selections);

      expect(result).toHaveLength(0);
    });

    it('should handle no selected columns', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        size: 1000,
        type: 'text/csv',
        headers: ['URL'],
        data: [['URL'], ['http://example.com']],
        rowCount: 1,
      };

      const selections: ColumnSelection[] = [
        { columnName: 'URL', priority: 1, selected: false },
      ];

      const result = extractUrls(file, selections);

      expect(result).toHaveLength(0);
    });

    it('should handle rows with no valid URLs', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        size: 1000,
        type: 'text/csv',
        headers: ['URL'],
        data: [
          ['URL'],
          ['invalid'],
          ['not a url'],
          ['http://valid.com'],
        ],
        rowCount: 3,
      };

      const selections: ColumnSelection[] = [
        { columnName: 'URL', priority: 1, selected: true },
      ];

      const result = extractUrls(file, selections);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('http://valid.com');
    });

    it('should handle URLs with whitespace', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        size: 1000,
        type: 'text/csv',
        headers: ['URL'],
        data: [
          ['URL'],
          ['  http://example.com  '],
          ['\thttps://example.org\t'],
        ],
        rowCount: 2,
      };

      const selections: ColumnSelection[] = [
        { columnName: 'URL', priority: 1, selected: true },
      ];

      const result = extractUrls(file, selections);

      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('http://example.com');
      expect(result[1].url).toBe('https://example.org');
    });

    it('should handle missing columns', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        size: 1000,
        type: 'text/csv',
        headers: ['Name', 'URL'],
        data: [
          ['Name', 'URL'],
          ['Company', 'http://example.com'],
        ],
        rowCount: 1,
      };

      const selections: ColumnSelection[] = [
        { columnName: 'NonExistent', priority: 1, selected: true },
        { columnName: 'URL', priority: 2, selected: true },
      ];

      const result = extractUrls(file, selections);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('http://example.com');
      expect(result[0].columnName).toBe('URL');
    });

    it('should reject invalid URL formats', () => {
      const file: UploadedFile = {
        name: 'test.csv',
        size: 1000,
        type: 'text/csv',
        headers: ['URL'],
        data: [
          ['URL'],
          ['ftp://example.com'], // Not http/https/www
          ['example.com'], // No protocol or www
          ['mailto:test@example.com'], // Wrong protocol
          ['http://valid.com'], // Valid
        ],
        rowCount: 4,
      };

      const selections: ColumnSelection[] = [
        { columnName: 'URL', priority: 1, selected: true },
      ];

      const result = extractUrls(file, selections);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('http://valid.com');
    });
  });

  describe('chunkArray', () => {
    it('should chunk array into specified size', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = chunkArray(array, 3);

      expect(result).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10],
      ]);
    });

    it('should handle empty array', () => {
      const result = chunkArray([], 5);
      expect(result).toEqual([]);
    });

    it('should handle array smaller than chunk size', () => {
      const array = [1, 2, 3];
      const result = chunkArray(array, 10);

      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should handle chunk size of 1', () => {
      const array = [1, 2, 3];
      const result = chunkArray(array, 1);

      expect(result).toEqual([[1], [2], [3]]);
    });

    it('should chunk exactly 100 URLs for batch API limit', () => {
      const urls = Array.from({ length: 250 }, (_, i) => `http://example${i}.com`);
      const result = chunkArray(urls, 100);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(100);
      expect(result[1]).toHaveLength(100);
      expect(result[2]).toHaveLength(50);
    });
  });
});
