import graphlib from 'graphlib';

import { Component } from '../component.js';

export const findBuildOrder = (
  components: Array<Component>,
): Array<Component> => {
  const graph = new graphlib.Graph();
  const hash = components.reduce<Record<string, Component>>((cmps, cmp) => {
    cmps[cmp.name] = cmp;
    return cmps;
  }, {});

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

  // Detect cycles
  const cycles = graphlib.alg.findCycles(graph);
  if (cycles.length > 0) {
    throw new Error(
      'Circular dependencies detected: ' + JSON.stringify(cycles),
    );
  }

  // Get build order
  const order = graphlib.alg.topsort(graph);
  return order.map((name) => hash[name]);
};
