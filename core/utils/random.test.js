/**
 * Unit tests for random utilities
 */

import * as random from './random.js';

describe('Random Utilities', () => {
  describe('primitives', () => {
    test('uuid should generate valid UUID', () => {
      const uuid = random.uuid();
      expect(uuid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    });

    test('int should generate integer in range', () => {
      const num = random.int(1, 10);
      expect(Number.isInteger(num)).toBe(true);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(10);
    });

    test('int should use default range', () => {
      const num = random.int();
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(100);
    });

    test('int should handle same min and max', () => {
      const num = random.int(5, 5);
      expect(num).toBe(5);
    });

    test('float should generate float in range', () => {
      const num = random.float(0, 1, 2);
      expect(typeof num).toBe('number');
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(1);
    });

    test('float should respect decimals', () => {
      const num = random.float(0, 10, 2);
      const decimals = (num.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    });

    test('boolean should return true or false', () => {
      const bool = random.boolean();
      expect(typeof bool).toBe('boolean');
    });

    test('boolean should produce both values over time', () => {
      const values = new Set();
      for (let i = 0; i < 100; i++) {
        values.add(random.boolean());
      }
      expect(values.size).toBe(2); // Should have both true and false
    });

    test('alphanumeric should generate correct length', () => {
      expect(random.alphanumeric(5)).toHaveLength(5);
      expect(random.alphanumeric(10)).toHaveLength(10);
      expect(random.alphanumeric(20)).toHaveLength(20);
    });

    test('alphanumeric should contain only valid chars', () => {
      const str = random.alphanumeric(100);
      expect(str).toMatch(/^[a-zA-Z0-9]+$/);
    });

    test('hex should generate correct length', () => {
      expect(random.hex(8)).toHaveLength(8);
      expect(random.hex(16)).toHaveLength(16);
    });

    test('hex should contain only hex chars', () => {
      const str = random.hex(100);
      expect(str).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('identifiers', () => {
    test('email should generate valid email format', () => {
      const email = random.email();
      expect(email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
    });

    test('username should generate valid username', () => {
      const username = random.username();
      expect(username).toBeTruthy();
      expect(typeof username).toBe('string');
      expect(username.length).toBeGreaterThan(0);
    });

    test('password should generate correct length', () => {
      expect(random.password(8).length).toBeGreaterThanOrEqual(8);
      expect(random.password(16).length).toBeGreaterThanOrEqual(16);
      expect(random.password(32).length).toBeGreaterThanOrEqual(32);
    });

    test('password should be different each time', () => {
      const pass1 = random.password(16);
      const pass2 = random.password(16);
      expect(pass1).not.toBe(pass2);
    });

    test('ipv4 should generate valid IPv4', () => {
      const ip = random.ipv4();
      expect(ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      const parts = ip.split('.');
      parts.forEach(part => {
        const num = parseInt(part);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(255);
      });
    });

    test('ipv6 should generate valid format', () => {
      const ip = random.ipv6();
      expect(ip).toBeTruthy();
      expect(typeof ip).toBe('string');
      expect(ip).toContain(':');
    });

    test('mac should generate valid MAC address', () => {
      const mac = random.mac();
      expect(mac).toBeTruthy();
      expect(typeof mac).toBe('string');
    });

    test('url should generate valid URL', () => {
      const url = random.url();
      expect(url).toMatch(/^https?:\/\/.+/);
    });

    test('domain should generate valid domain', () => {
      const domain = random.domain();
      expect(domain).toBeTruthy();
      expect(domain).toContain('.');
    });
  });

  describe('personal data', () => {
    test('firstName should return string', () => {
      const name = random.firstName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    test('lastName should return string', () => {
      const name = random.lastName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    test('fullName should contain space', () => {
      const name = random.fullName();
      expect(name).toContain(' ');
      expect(name.split(' ').length).toBeGreaterThanOrEqual(2);
    });

    test('phoneNumber should return string', () => {
      const phone = random.phoneNumber();
      expect(typeof phone).toBe('string');
      expect(phone.length).toBeGreaterThan(0);
    });

    test('address should return string', () => {
      const addr = random.address();
      expect(typeof addr).toBe('string');
      expect(addr.length).toBeGreaterThan(0);
    });

    test('city should return string', () => {
      const city = random.city();
      expect(typeof city).toBe('string');
      expect(city.length).toBeGreaterThan(0);
    });

    test('country should return string', () => {
      const country = random.country();
      expect(typeof country).toBe('string');
      expect(country.length).toBeGreaterThan(0);
    });

    test('zipCode should return string', () => {
      const zip = random.zipCode();
      expect(typeof zip).toBe('string');
    });

    test('latitude should be in valid range', () => {
      const lat = random.latitude();
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
    });

    test('longitude should be in valid range', () => {
      const lon = random.longitude();
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(180);
    });
  });

  describe('business data', () => {
    test('companyName should return string', () => {
      const company = random.companyName();
      expect(typeof company).toBe('string');
      expect(company.length).toBeGreaterThan(0);
    });

    test('jobTitle should return string', () => {
      const job = random.jobTitle();
      expect(typeof job).toBe('string');
      expect(job.length).toBeGreaterThan(0);
    });

    test('creditCard should return valid format', () => {
      const cc = random.creditCard();
      expect(typeof cc).toBe('string');
      expect(cc.replace(/\D/g, '').length).toBeGreaterThanOrEqual(13);
    });

    test('currencyCode should return 3-letter code', () => {
      const code = random.currencyCode();
      expect(typeof code).toBe('string');
      expect(code).toMatch(/^[A-Z]{3}$/);
    });

    test('amount should generate valid amount', () => {
      const amt = random.amount(10, 100, 2);
      const num = parseFloat(amt);
      expect(num).toBeGreaterThanOrEqual(10);
      expect(num).toBeLessThanOrEqual(100);
    });
  });

  describe('text generation', () => {
    test('words should generate correct count', () => {
      const words3 = random.words(3);
      expect(words3.split(' ')).toHaveLength(3);

      const words5 = random.words(5);
      expect(words5.split(' ')).toHaveLength(5);
    });

    test('sentence should return string ending with period', () => {
      const sentence = random.sentence();
      expect(typeof sentence).toBe('string');
      expect(sentence).toMatch(/\.$/);
    });

    test('paragraph should return multi-sentence string', () => {
      const para = random.paragraph();
      expect(typeof para).toBe('string');
      expect(para.length).toBeGreaterThan(50); // Reasonable length
    });
  });

  describe('array operations', () => {
    const testArray = ['a', 'b', 'c', 'd', 'e'];

    test('arrayElement should pick element from array', () => {
      const element = random.arrayElement(testArray);
      expect(testArray).toContain(element);
    });

    test('arrayElement should throw for empty array', () => {
      expect(() => random.arrayElement([])).toThrow('Array must be non-empty');
    });

    test('arrayElement should throw for non-array', () => {
      expect(() => random.arrayElement('not array')).toThrow('Array must be non-empty');
    });

    test('arrayElements should pick multiple elements', () => {
      const elements = random.arrayElements(testArray, 3);
      expect(elements).toHaveLength(3);
      elements.forEach(el => expect(testArray).toContain(el));
    });

    test('arrayElements should throw for empty array', () => {
      expect(() => random.arrayElements([], 2)).toThrow('Array must be non-empty');
    });

    test('shuffle should return same length', () => {
      const shuffled = random.shuffle(testArray);
      expect(shuffled).toHaveLength(testArray.length);
    });

    test('shuffle should contain all original elements', () => {
      const shuffled = random.shuffle(testArray);
      testArray.forEach(el => expect(shuffled).toContain(el));
    });

    test('shuffle should not mutate original', () => {
      const original = [...testArray];
      random.shuffle(testArray);
      expect(testArray).toEqual(original);
    });

    test('shuffle should throw for non-array', () => {
      expect(() => random.shuffle('not array')).toThrow('Input must be an array');
    });

    test('shuffle should produce different results', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => i);
      const shuffled1 = random.shuffle(largeArray);
      const shuffled2 = random.shuffle(largeArray);
      expect(shuffled1).not.toEqual(shuffled2);
    });
  });

  describe('randomness distribution', () => {
    test('int should produce diverse results', () => {
      const values = new Set();
      for (let i = 0; i < 100; i++) {
        values.add(random.int(1, 100));
      }
      expect(values.size).toBeGreaterThan(50); // At least 50 unique values
    });

    test('alphanumeric should produce diverse results', () => {
      const values = new Set();
      for (let i = 0; i < 100; i++) {
        values.add(random.alphanumeric(10));
      }
      expect(values.size).toBe(100); // All should be unique
    });

    test('uuid should always be unique', () => {
      const uuids = new Set();
      for (let i = 0; i < 1000; i++) {
        uuids.add(random.uuid());
      }
      expect(uuids.size).toBe(1000); // All should be unique
    });
  });

  describe('edge cases', () => {
    test('should handle boundary values', () => {
      expect(() => random.int(0, 0)).not.toThrow();
      expect(() => random.float(0, 0, 0)).not.toThrow();
    });

    test('should handle large ranges', () => {
      const num = random.int(1, 1000000);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(1000000);
    });

    test('should handle small arrays', () => {
      const singleElement = random.arrayElement([1]);
      expect(singleElement).toBe(1);
    });
  });
});
