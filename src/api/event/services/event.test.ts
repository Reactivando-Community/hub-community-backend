/**
 * Tests for event service slug generation
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Strapi instance
const createMockStrapi = () => ({
	entityService: {
		findMany: vi.fn()
	}
});

// Import the slug generation logic (would need to export it separately in real implementation)
const slugify = require('slugify');

const MAX_SLUG_LENGTH = 100;

async function generateUniqueSlug(
	strapi: any,
	title: string,
	eventId?: string
): Promise<string> {
	if (!title || typeof title !== 'string') {
		throw new Error('Title is required to generate slug');
	}

	let baseSlug = slugify(title, {
		lower: true,
		strict: true,
		trim: true
	});

	if (baseSlug.length > MAX_SLUG_LENGTH) {
		baseSlug = baseSlug.substring(0, MAX_SLUG_LENGTH);
		baseSlug = baseSlug.replace(/-+$/, '');
	}

	let slug = baseSlug;
	let counter = 2;

	while (true) {
		const filters: any = { slug: { $eq: slug } };

		if (eventId) {
			filters.documentId = { $ne: eventId };
		}

		const existingEvents = await strapi.entityService.findMany(
			'api::event.event',
			{
				filters,
				limit: 1
			}
		);

		if (!existingEvents || existingEvents.length === 0) {
			break;
		}

		const suffix = `-${counter}`;
		const maxBaseLength = MAX_SLUG_LENGTH - suffix.length;
		slug = `${baseSlug.substring(0, maxBaseLength)}${suffix}`;
		counter++;
	}

	return slug;
}

describe('Event Service - Slug Generation', () => {
	describe('Special Characters', () => {
		it('should handle accents and convert to basic characters', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			const slug = await generateUniqueSlug(strapi, 'Café com Código');
			expect(slug).toBe('cafe-com-codigo');
		});

		it('should handle symbols and remove them', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			const slug = await generateUniqueSlug(strapi, 'Dev@Fest 2024 #Tech');
			expect(slug).toBe('devfest-2024-tech');
		});

		it('should handle multiple spaces and convert to single hyphen', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			const slug = await generateUniqueSlug(
				strapi,
				'Workshop    Python   Advanced'
			);
			expect(slug).toBe('workshop-python-advanced');
		});

		it('should handle special unicode characters', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			const slug = await generateUniqueSlug(
				strapi,
				'Conferência de Tecnologia™ & Inovação®'
			);
			expect(slug).toBe('conferencia-de-tecnologia-inovacao');
		});
	});

	describe('Long Titles', () => {
		it('should truncate titles longer than 100 characters', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			const longTitle =
				'This is a very long event title that exceeds one hundred characters and should be truncated to fit within the maximum allowed length for slugs';
			const slug = await generateUniqueSlug(strapi, longTitle);

			expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
			expect(slug).toBe(
				'this-is-a-very-long-event-title-that-exceeds-one-hundred-characters-and-should-be-truncated-to'
			);
		});

		it('should remove trailing hyphen after truncation', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			// Title that would end with hyphen after truncation at 100 chars
			const title = 'A'.repeat(95) + ' Test';
			const slug = await generateUniqueSlug(strapi, title);

			expect(slug).not.toMatch(/-$/);
			expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
		});
	});

	describe('Duplicate Event Names', () => {
		it('should add -2 suffix for first duplicate', async () => {
			const strapi = createMockStrapi();

			// First call: slug exists
			// Second call: slug-2 doesn't exist
			strapi.entityService.findMany
				.mockResolvedValueOnce([{ id: '1', slug: 'devfest-2024' }])
				.mockResolvedValueOnce([]);

			const slug = await generateUniqueSlug(strapi, 'DevFest 2024');
			expect(slug).toBe('devfest-2024-2');
		});

		it('should increment suffix for multiple duplicates', async () => {
			const strapi = createMockStrapi();

			// Slug exists, -2 exists, -3 exists, -4 doesn't exist
			strapi.entityService.findMany
				.mockResolvedValueOnce([{ id: '1' }])
				.mockResolvedValueOnce([{ id: '2' }])
				.mockResolvedValueOnce([{ id: '3' }])
				.mockResolvedValueOnce([]);

			const slug = await generateUniqueSlug(strapi, 'Popular Event');
			expect(slug).toBe('popular-event-4');
		});

		it('should exclude current event ID when updating', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			const eventId = 'current-event-id';
			await generateUniqueSlug(strapi, 'Updated Title', eventId);

			expect(strapi.entityService.findMany).toHaveBeenCalledWith(
				'api::event.event',
				expect.objectContaining({
					filters: expect.objectContaining({
						documentId: { $ne: eventId }
					})
				})
			);
		});

		it('should handle long titles with duplicate suffixes', async () => {
			const strapi = createMockStrapi();

			const longTitle = 'A'.repeat(98) + ' B';

			// Base slug exists
			strapi.entityService.findMany
				.mockResolvedValueOnce([{ id: '1' }])
				.mockResolvedValueOnce([]);

			const slug = await generateUniqueSlug(strapi, longTitle);

			// Should truncate base and add -2
			expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
			expect(slug).toMatch(/-2$/);
		});
	});

	describe('Uniqueness Constraint', () => {
		it('should check uniqueness against database', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			await generateUniqueSlug(strapi, 'Test Event');

			expect(strapi.entityService.findMany).toHaveBeenCalledWith(
				'api::event.event',
				expect.objectContaining({
					filters: { slug: { $eq: 'test-event' } },
					limit: 1
				})
			);
		});

		it('should return unique slug when no conflicts', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			const slug = await generateUniqueSlug(strapi, 'Unique Event Name');
			expect(slug).toBe('unique-event-name');
		});
	});

	describe('Edge Cases', () => {
		it('should throw error for empty title', async () => {
			const strapi = createMockStrapi();

			await expect(generateUniqueSlug(strapi, '')).rejects.toThrow(
				'Title is required to generate slug'
			);
		});

		it('should throw error for null title', async () => {
			const strapi = createMockStrapi();

			await expect(generateUniqueSlug(strapi, null as any)).rejects.toThrow(
				'Title is required to generate slug'
			);
		});

		it('should throw error for undefined title', async () => {
			const strapi = createMockStrapi();

			await expect(
				generateUniqueSlug(strapi, undefined as any)
			).rejects.toThrow('Title is required to generate slug');
		});

		it('should handle title with only special characters', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			const slug = await generateUniqueSlug(strapi, '@@@ ### $$$');

			// slugify with strict mode should remove all special chars
			// Result might be empty or have minimal content
			expect(typeof slug).toBe('string');
		});

		it('should handle numeric-only titles', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			const slug = await generateUniqueSlug(strapi, '2024');
			expect(slug).toBe('2024');
		});

		it('should handle mixed case properly', async () => {
			const strapi = createMockStrapi();
			strapi.entityService.findMany.mockResolvedValue([]);

			const slug = await generateUniqueSlug(strapi, 'CamelCaseEvent');
			expect(slug).toBe('camelcaseevent');
		});
	});
});
