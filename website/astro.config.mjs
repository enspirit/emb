// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://enspirit.github.io',
	base: '/emb',
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
						{ label: 'Migrating from Makefile', slug: 'getting-started/migrating-from-makefile' },
					],
				},
				{
					label: 'Tutorial',
					items: [
						{ label: 'Overview', slug: 'tutorial' },
						{ label: '1. Project Setup', slug: 'tutorial/01-project-setup' },
						{ label: '2. Components', slug: 'tutorial/02-components' },
						{ label: '3. Tasks', slug: 'tutorial/03-tasks' },
						{ label: '4. Building', slug: 'tutorial/04-building' },
						{ label: '5. Running', slug: 'tutorial/05-running' },
						{ label: '6. Flavors', slug: 'tutorial/06-flavors' },
					],
				},
				{
					label: 'Day to Day',
					items: [
						{ label: 'Building Resources', slug: 'day-to-day/building-resources' },
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
