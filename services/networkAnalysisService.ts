import { Node, Connection, SimulationParameters, NetworkComponentType } from '../types';
import { SIMULATION_RESULTS } from '../constants';

// This is a simplified analysis service for demonstration purposes.
class NetworkAnalysisService {
  public getNetworkStats(nodes: Node[], connections: Connection[]) {
    const nodeCount = nodes.length;
    if (nodeCount === 0) {
        return {
            nodeCount: 0,
            connectionCount: 0,
            avgDegree: 0,
            isolatedNodes: 0,
            bottlenecks: 0,
            avgEnergyEfficiency: 0,
            weakNodes: 0,
        };
    }

    const adjacency: { [key: string]: string[] } = {};
    nodes.forEach(n => adjacency[n.id] = []);
    connections.forEach(c => {
      adjacency[c.from]?.push(c.to);
      adjacency[c.to]?.push(c.from);
    });

    const nodeDegrees = nodes.map(n => adjacency[n.id]?.length || 0);
    const avgDegree = nodeDegrees.reduce((a, b) => a + b, 0) / nodeCount;
    const endNodes = nodes.filter(n => n.type === NetworkComponentType.NODE);
    
    return {
        nodeCount: nodeCount,
        connectionCount: connections.length,
        avgDegree: avgDegree,
        isolatedNodes: nodeDegrees.filter(d => d === 0).length,
        bottlenecks: nodes.filter(n => n.type === NetworkComponentType.ROUTER).length,
        avgEnergyEfficiency: endNodes.length > 0 ? endNodes.reduce((sum, node) => sum + node.energyEfficiency, 0) / endNodes.length : 100,
        weakNodes: endNodes.filter(n => n.energyEfficiency < 85).length,
    };
  }

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
      return { 
        'AI-Based': { ...SIMULATION_RESULTS['AI-Based'] }, 
        'Traditional': { ...SIMULATION_RESULTS['Traditional'] } 
      };
    }

    // --- Component analysis ---
    const endNodes = nodes.filter(n => n.type === NetworkComponentType.NODE);
    const routers = nodes.filter(n => n.type === NetworkComponentType.ROUTER);
    const baseStations = nodes.filter(n => n.type === NetworkComponentType.BASE_STATION);
    
    // --- Network health and power metrics ---
    const avgEndNodeEfficiency = endNodes.length > 0 ? endNodes.reduce((sum, n) => sum + n.energyEfficiency, 0) / endNodes.length / 100 : 1.0;
    const totalEnergyConsumptionRate = nodes.reduce((sum, n) => sum + n.energySpent, 0);

    // --- Get base simulation results ---
    const aiBased = { ...SIMULATION_RESULTS['AI-Based'] };
    const traditional = { ...SIMULATION_RESULTS['Traditional'] };
    
    // --- Apply modifiers ---
    // 1. Performance boost from infrastructure (Routers, Base Stations)
    const infraBoost = 1.0 + (routers.length * 0.02) + (baseStations.length * 0.05);
    aiBased['Packet Delivery Ratio'] = Math.min(0.99, aiBased['Packet Delivery Ratio'] * infraBoost);
    traditional['Packet Delivery Ratio'] = Math.min(0.95, traditional['Packet Delivery Ratio'] * infraBoost * 0.95);
    aiBased['Robustness Index'] = Math.min(0.98, aiBased['Robustness Index'] * infraBoost);
    aiBased['End-to-end Delay (ms)'] = Math.round(aiBased['End-to-end Delay (ms)'] / Math.sqrt(infraBoost)); // Better infra reduces delay
    
    // 2. Energy & Lifetime (based on actual component consumption and end-node health)
    const totalBaseConsumption = 500; // From constants.ts for 50 nodes
    const consumptionFactor = totalEnergyConsumptionRate / totalBaseConsumption;

    aiBased['Energy Consumption (J)'] = Math.round(aiBased['Energy Consumption (J)'] * consumptionFactor);
    traditional['Energy Consumption (J)'] = Math.round(traditional['Energy Consumption (J)'] * consumptionFactor * 1.15);

    const lifetimeFactor = avgEndNodeEfficiency > 0 ? (avgEndNodeEfficiency / (consumptionFactor * 0.5)) : 0;
    aiBased['Network Lifetime (days)'] = Math.round(aiBased['Network Lifetime (days)'] * lifetimeFactor);
    traditional['Network Lifetime (days)'] = Math.round(traditional['Network Lifetime (days)'] * lifetimeFactor * 0.85);
    
    aiBased['Energy Efficiency'] = Math.min(0.98, avgEndNodeEfficiency);
    traditional['Energy Efficiency'] = Math.min(0.94, avgEndNodeEfficiency * 0.95);

    // 3. Scalability & Delay (affected by node count)
    const scaleFactor = 1 + (endNodes.length / 150);
    aiBased['End-to-end Delay (ms)'] = Math.round(aiBased['End-to-end Delay (ms)'] * scaleFactor);
    traditional['End-to-end Delay (ms)'] = Math.round(traditional['End-to-end Delay (ms)'] * scaleFactor * 1.1);

    return {
      'AI-Based': aiBased,
      'Traditional': traditional,
    };
  }
}

export const networkAnalysisService = new NetworkAnalysisService();