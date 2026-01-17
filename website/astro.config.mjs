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
						{ label: 'Concepts', slug: 'getting-started/concepts' },
						{ label: 'Installation', slug: 'getting-started/installation' },
					],
				},
				{
					label: 'Advanced',
					autogenerate: { directory: 'advanced' },
				},
				{
					label: 'Tutorials',
					collapsed: true,
					items: [
						{ label: 'Overview', slug: 'tutorial' },
						{
							label: 'Hello World',
							items: [
								{ label: 'Introduction', slug: 'tutorial/hello-world' },
								{ label: '1. Installation', slug: 'tutorial/hello-world/01-installation' },
								{ label: '2. Minimal Config', slug: 'tutorial/hello-world/02-minimal-config' },
								{ label: '3. Auto-Discovery', slug: 'tutorial/hello-world/03-auto-discovery' },
								{ label: '4. First Commands', slug: 'tutorial/hello-world/04-first-commands' },
							],
						},
						{
							label: 'Fullstack App',
							items: [
								{ label: 'Introduction', slug: 'tutorial/fullstack-app' },
								{ label: '1. Project Structure', slug: 'tutorial/fullstack-app/01-project-structure' },
								{ label: '2. Environment', slug: 'tutorial/fullstack-app/02-environment' },
								{ label: '3. Tasks', slug: 'tutorial/fullstack-app/03-tasks' },
								{ label: '4. Docker Compose', slug: 'tutorial/fullstack-app/04-docker-compose' },
								{ label: '5. Building', slug: 'tutorial/fullstack-app/05-building' },
							],
						},
						{
							label: 'Microservices',
							items: [
								{ label: 'Introduction', slug: 'tutorial/microservices' },
								{ label: '1. Base Images', slug: 'tutorial/microservices/01-base-images' },
								{ label: '2. Dependencies', slug: 'tutorial/microservices/02-dependencies' },
								{ label: '3. Build Ordering', slug: 'tutorial/microservices/03-build-ordering' },
							],
						},
						{
							label: 'Production Ready',
							items: [
								{ label: 'Introduction', slug: 'tutorial/production-ready' },
								{ label: '1. Multi-Stage Builds', slug: 'tutorial/production-ready/01-multi-stage' },
								{ label: '2. Flavors Intro', slug: 'tutorial/production-ready/02-flavors-intro' },
								{ label: '3. JSON Patch', slug: 'tutorial/production-ready/03-json-patch' },
								{ label: '4. Using Flavors', slug: 'tutorial/production-ready/04-using-flavors' },
							],
						},
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
				{
					label: 'Resources',
					autogenerate: { directory: 'resources' },
				},
			],
		}),
	],
});
