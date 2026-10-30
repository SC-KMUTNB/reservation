import { describe, test, expect, afterEach } from 'bun:test';
import { applySecurityHeaders, handle } from '../src/hooks.server';
import type { RequestEvent } from '@sveltejs/kit';

describe('HTTP Security Headers Configuration', () => {
	const originalNodeEnv = process.env.NODE_ENV;

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
	});

	test('headers dictionary contains essential OWASP headers', () => {
		const headers: Record<string, string> = {
			'X-Frame-Options': 'DENY',
			'X-Content-Type-Options': 'nosniff',
			'Referrer-Policy': 'strict-origin-when-cross-origin',
			'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()'
		};

		expect(headers['X-Frame-Options']).toBe('DENY');
		expect(headers['X-Content-Type-Options']).toBe('nosniff');
		expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
		expect(headers['Permissions-Policy']).toContain('camera=(self)');
	});

	test('applySecurityHeaders sets all OWASP hardening headers on Response', () => {
		process.env.NODE_ENV = 'test';
		const response = new Response('Hello World', { status: 200 });
		const result = applySecurityHeaders(response);

		expect(result.headers.get('X-Frame-Options')).toBe('DENY');
		expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(result.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
		expect(result.headers.get('Permissions-Policy')).toBe(
			'camera=(self), microphone=(), geolocation=()'
		);

		// In non-production, HSTS is omitted
		expect(result.headers.get('Strict-Transport-Security')).toBeNull();

		// Balanced Content-Security-Policy
		const csp = result.headers.get('Content-Security-Policy');
		expect(csp).toBeTruthy();
		expect(csp).toContain("default-src 'self'");
		expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
		expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
		expect(csp).toContain('font-src \'self\' https://fonts.gstatic.com data:');
		expect(csp).toContain('img-src \'self\' data: blob: https:');
		expect(csp).toContain(
			"connect-src 'self' https://accounts.google.com https://api.github.com"
		);
		expect(csp).toContain("frame-ancestors 'none'");
	});

	test('applySecurityHeaders sets Strict-Transport-Security in production', () => {
		process.env.NODE_ENV = 'production';
		const response = new Response('OK', { status: 200 });
		const result = applySecurityHeaders(response);

		expect(result.headers.get('Strict-Transport-Security')).toBe(
			'max-age=31536000; includeSubDomains; preload'
		);
	});

	test('handle hook applies security headers to API and static routes (lines 33-40)', async () => {
		const mockEvent = {
			url: new URL('https://example.com/api/bookings'),
			cookies: {
				get: () => undefined,
				set: () => {},
				delete: () => {}
			},
			locals: {},
			request: new Request('https://example.com/api/bookings', {
				headers: new Headers({ 'user-agent': 'Mozilla/5.0' })
			})
		} as unknown as RequestEvent;

		const mockResolve = async () => new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		});

		const res = await handle({ event: mockEvent, resolve: mockResolve });

		expect(res.headers.get('X-Frame-Options')).toBe('DENY');
		expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
		expect(res.headers.get('Permissions-Policy')).toContain('camera=(self)');
		expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
	});

	test('handle hook applies security headers to standard rendered routes', async () => {
		const mockEvent = {
			url: new URL('https://example.com/track'),
			cookies: {
				get: () => undefined,
				set: () => {},
				delete: () => {}
			},
			locals: {},
			request: new Request('https://example.com/track', {
				headers: new Headers({ 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
			})
		} as unknown as RequestEvent;

		const mockResolve = async () => new Response('<!DOCTYPE html><html><body>Page</body></html>', {
			status: 200,
			headers: { 'content-type': 'text/html' }
		});

		const res = await handle({ event: mockEvent, resolve: mockResolve });

		expect(res.headers.get('X-Frame-Options')).toBe('DENY');
		expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
		expect(res.headers.get('Permissions-Policy')).toBe(
			'camera=(self), microphone=(), geolocation=()'
		);
		expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
	});
});
