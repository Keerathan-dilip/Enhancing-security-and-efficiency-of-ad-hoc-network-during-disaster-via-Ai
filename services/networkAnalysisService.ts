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

  public simulatePerformance(
    topology: string,
    nodes: Node[],
    connections: Connection[]
  ): { 'AI-Based': SimulationParameters; 'Traditional': SimulationParameters } {
    const nodeCount = nodes.length;
    if (nodeCount === 0) {
      // Return default state if no nodes
      return { 
        'AI-Based': { ...SIMULATION_RESULTS['AI-Based'] }, 
        'Traditional': { ...SIMULATION_RESULTS['Traditional'] } 
      };
    }

    // --- Calculate current network metrics ---
    const averageEfficiency = nodes.reduce((sum, node) => sum + node.energyEfficiency, 0) / nodeCount / 100; // Scale to 0-1
    const density = connections.length / nodeCount; // Average connections per node

    // --- Get base simulation results ---
    const aiBased = { ...SIMULATION_RESULTS['AI-Based'] };
    const traditional = { ...SIMULATION_RESULTS['Traditional'] };
    
    // --- Apply modifiers based on network metrics ---

    // 1. Packet Delivery & Robustness (affected by density)
    // Ideal density assumed around 2.5 for a well-connected but not overly congested network.
    const densityModifier = 1 + (Math.min(density, 3.5) - 2.5) * 0.04; // Max ~4% boost from ideal density
    aiBased['Packet Delivery Ratio'] = Math.min(0.99, aiBased['Packet Delivery Ratio'] * densityModifier);
    traditional['Packet Delivery Ratio'] = Math.min(0.95, traditional['Packet Delivery Ratio'] * densityModifier);
    aiBased['Robustness Index'] = Math.min(0.98, aiBased['Robustness Index'] * densityModifier);

    // 2. Energy & Lifetime (affected by average node efficiency)
    // The report now reflects the actual efficiency of the nodes on the canvas.
    aiBased['Energy Efficiency'] = Math.min(0.98, averageEfficiency);
    traditional['Energy Efficiency'] = Math.min(0.94, averageEfficiency * 0.95); // Traditional is slightly less efficient.
    
    const baseAiEfficiency = SIMULATION_RESULTS['AI-Based']['Energy Efficiency'];
    const efficiencyFactor = averageEfficiency > 0 ? baseAiEfficiency / averageEfficiency : 1; // If avg is higher than base, factor is < 1 (less consumption)
    const lifetimeFactor = averageEfficiency > 0 ? averageEfficiency / baseAiEfficiency : 1; // If avg is higher, factor > 1 (longer lifetime)

    aiBased['Energy Consumption (J)'] = Math.round(aiBased['Energy Consumption (J)'] * (nodeCount / 50) * efficiencyFactor);
    traditional['Energy Consumption (J)'] = Math.round(traditional['Energy Consumption (J)'] * (nodeCount / 50) * (efficiencyFactor * 1.15));
    
    aiBased['Network Lifetime (days)'] = Math.round(aiBased['Network Lifetime (days)'] * lifetimeFactor);
    traditional['Network Lifetime (days)'] = Math.round(traditional['Network Lifetime (days)'] * (lifetimeFactor * 0.85));

    // 3. Delay (affected by node count)
    const scaleFactor = 1 + (nodeCount / 150);
    aiBased['End-to-end Delay (ms)'] = Math.round(aiBased['End-to-end Delay (ms)'] * scaleFactor);
    traditional['End-to-end Delay (ms)'] = Math.round(traditional['End-to-end Delay (ms)'] * scaleFactor * 1.1);

    return {
      'AI-Based': aiBased,
      'Traditional': traditional,
    };
  }
}

export const networkAnalysisService = new NetworkAnalysisService();