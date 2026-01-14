// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'EMB',
			description: "Enspirit's Monorepo Builder - A CLI tool for managing Docker-based monorepos",
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/enspirit/emb' }],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Your First Monorepo', slug: 'getting-started/first-monorepo' },
					],
				},
				{
					label: 'Day to Day',
					items: [
						{ label: 'Building Images', slug: 'day-to-day/building-images' },
						{ label: 'Running Services', slug: 'day-to-day/running-services' },
						{ label: 'Managing Components', slug: 'day-to-day/managing-components' },
					],
				},
				{
					label: 'Advanced',
					autogenerate: { directory: 'advanced' },
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			],
		}),
	],
});
