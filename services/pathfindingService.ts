import { Node, Connection } from '../types';

class PathfindingService {
  public findFarthestNodes(nodes: Node[]): [string, string] | null {
    if (nodes.length < 2) return null;

    let maxDist = -1;
    let farthestPair: [string, string] | null = null;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const dist = Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));
        if (dist > maxDist) {
          maxDist = dist;
          farthestPair = [n1.id, n2.id];
        }
      }
    }
    return farthestPair;
  }

  public findShortestPath(startNodeId: string, endNodeId: string, nodes: Node[], connections: Connection[]): string[] | null {
    if (!startNodeId || !endNodeId || nodes.length === 0) return null;

    const adjacency: { [key: string]: string[] } = {};
    nodes.forEach(n => adjacency[n.id] = []);
    connections.forEach(c => {
      adjacency[c.from]?.push(c.to);
      adjacency[c.to]?.push(c.from);
    });

    const queue: string[][] = [[startNodeId]];
    const visited = new Set<string>([startNodeId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const nodeId = path[path.length - 1];

      if (nodeId === endNodeId) {
        return path;
      }

      const neighbors = adjacency[nodeId] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const newPath = [...path, neighbor];
          queue.push(newPath);
        }
      }
    }

    return null; // No path found
  }
}

export const pathfindingService = new PathfindingService();
