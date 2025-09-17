import { Node, Connection, NetworkComponentType } from '../types';

class PathfindingService {
  public findFarthestNodes(nodes: Node[], excludeNodeIds: string[] = []): [string, string] | null {
    const validNodes = nodes.filter(n => !excludeNodeIds.includes(n.id));
    if (validNodes.length < 2) return null;

    let maxDist = -1;
    let farthestPair: [string, string] | null = null;

    for (let i = 0; i < validNodes.length; i++) {
      for (let j = i + 1; j < validNodes.length; j++) {
        const n1 = validNodes[i];
        const n2 = validNodes[j];
        const dist = Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));
        if (dist > maxDist) {
          maxDist = dist;
          farthestPair = [n1.id, n2.id];
        }
      }
    }
    return farthestPair;
  }

  public findShortestPath(startNodeId: string, endNodeId: string, nodes: Node[], connections: Connection[], excludeNodeIds: string[] = []): string[] | null {
    if (!startNodeId || !endNodeId || nodes.length === 0 || excludeNodeIds.includes(startNodeId) || excludeNodeIds.includes(endNodeId)) return null;

    const adjacency: { [key: string]: string[] } = {};
    nodes.forEach(n => {
        if (!excludeNodeIds.includes(n.id)) {
            adjacency[n.id] = [];
        }
    });

    const disabledSwitches = new Set(nodes.filter(n => n.type === NetworkComponentType.SWITCH && n.isEnabled === false).map(n => n.id));

    connections.forEach(c => {
      if (disabledSwitches.has(c.from) || disabledSwitches.has(c.to) || excludeNodeIds.includes(c.from) || excludeNodeIds.includes(c.to)) {
        return; // Skip connections involving disabled or excluded nodes
      }
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
