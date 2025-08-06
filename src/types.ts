import { DockerComponentBuild } from './docker/index.js';

export interface EmbContext {
  components?: Array<DockerComponentBuild>;
  injected?: boolean;
  runTime?: number;
}
