import graphlib from 'graphlib';

import { Component } from '@/monorepo';

const toGraph = (components: Array<Component>) => {
  const graph = new graphlib.Graph();
  // Add all components as nodes
  for (const comp of components) {
    graph.setNode(comp.name);
  }

  // Add edges
  for (const comp of components) {
    for (const dep of comp.dependencies ?? []) {
      graph.setEdge(dep.name, comp.name);
    }
  }

  return graph;
};

export const findBuildOrder = (
  components: Array<Component>,
  selection?: Array<string>,
): Array<Component> => {
  const hash = components.reduce<Record<string, Component>>((cmps, cmp) => {
    cmps[cmp.name] = cmp;
    return cmps;
  }, {});

  const graph = toGraph(components);

  // Detect cycles
  const cycles = graphlib.alg.findCycles(graph);
  if (cycles.length > 0) {
    throw new Error(
      'Circular dependencies detected: ' + JSON.stringify(cycles),
    );
  }

  // Pick nodes that we want to build and rebuild a graph only with these
  const toBuild = selection || components.map((c) => c.name);
  const includingDeps = toBuild
    .reduce<Set<string>>((set, name) => {
      graph.predecessors(name)?.forEach((name) => {
        set.add(name);
      });
      return set;
    }, new Set(toBuild))
    .values();

  const newGraph = toGraph([...includingDeps].map((name) => hash[name]));

  // Get build order
  const order = graphlib.alg.topsort(newGraph);
  return order.map((name) => hash[name]);
};
