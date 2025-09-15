
import { Node, Connection, SimulationParameters } from '../types';
import { SIMULATION_RESULTS } from '../constants';

// This is a simplified analysis service for demonstration purposes.
class NetworkAnalysisService {
  public identifyTopology(nodes: Node[], connections: Connection[]): string {
    if (nodes.length < 3) return 'Linear';
    
    const adjacency: { [key: string]: string[] } = {};
    nodes.forEach(n => adjacency[n.id] = []);
    connections.forEach(c => {
      adjacency[c.from]?.push(c.to);
      adjacency[c.to]?.push(c.from);
    });

    const nodeDegrees = nodes.map(n => adjacency[n.id]?.length || 0);

    // Check for Star: one central node connected to all others
    if (nodeDegrees.filter(d => d === nodes.length - 1).length === 1) {
      return 'Star Topology';
    }

    // Check for Ring: every node has exactly 2 connections
    if (nodeDegrees.every(d => d === 2)) {
      return 'Ring Topology';
    }

    // Check for Mesh: highly interconnected (average degree > 3)
    const avgDegree = nodeDegrees.reduce((a, b) => a + b, 0) / nodes.length;
    if (avgDegree > 3) {
      return 'Mesh Topology';
    }

    return 'Cluster / Hybrid Topology';
  }

  public simulatePerformance(topology: string, nodeCount: number): { 'AI-Based': SimulationParameters, 'Traditional': SimulationParameters } {
    // Simulate slight variations based on node count for realism
    const scaleFactor = 1 + (nodeCount / 100);
    
    const aiBased = { ...SIMULATION_RESULTS['AI-Based'] };
    const traditional = { ...SIMULATION_RESULTS['Traditional'] };
    
    // Adjust some parameters based on scale
    aiBased['End-to-end Delay (ms)'] = Math.round(aiBased['End-to-end Delay (ms)'] * scaleFactor);
    traditional['End-to-end Delay (ms)'] = Math.round(traditional['End-to-end Delay (ms)'] * scaleFactor * 1.1);

    aiBased['Energy Consumption (J)'] = Math.round(aiBased['Energy Consumption (J)'] * scaleFactor);
    traditional['Energy Consumption (J)'] = Math.round(traditional['Energy Consumption (J)'] * scaleFactor * 1.2);

    return {
      'AI-Based': aiBased,
      'Traditional': traditional,
    };
  }
}

export const networkAnalysisService = new NetworkAnalysisService();
