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

    const avgDegree = nodeDegrees.reduce((a, b) => a + b, 0) / nodes.length;

    // Check for dense Mesh
    if (avgDegree > 4) {
      return 'Mesh Topology';
    }

    // Check for Cluster Mesh
    const highDegreeNodes = nodeDegrees.filter(d => d > 5).length;
    if (highDegreeNodes > 1 && highDegreeNodes < nodes.length / 4 && avgDegree > 2.5) {
      return 'Cluster Mesh Topology';
    }

    // Check for standard Mesh
    if (avgDegree > 3) {
      return 'Mesh Topology';
    }
    
    return 'Cluster / Hybrid Topology';
  }

  public simulatePerformance(
    topology: string,
    nodes: Node[],
    connections: Connection[],
    maliciousNodeIds: string[] = []
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
    aiBased['Packet Delivery Ratio'] *= infraBoost;
    traditional['Packet Delivery Ratio'] *= infraBoost * 0.95;
    aiBased['Robustness Index'] *= infraBoost;
    aiBased['End-to-end Delay (ms)'] /= Math.sqrt(infraBoost); // Better infra reduces delay
    
    // 2. Energy & Lifetime (based on actual component consumption and end-node health)
    const totalBaseConsumption = 500; // From constants.ts for 50 nodes
    const consumptionFactor = totalEnergyConsumptionRate / totalBaseConsumption;

    aiBased['Energy Consumption (J)'] *= consumptionFactor;
    traditional['Energy Consumption (J)'] *= consumptionFactor * 1.15;

    // Enhanced lifetime factor for more noticeable change after removing weak nodes
    const lifetimeFactor = avgEndNodeEfficiency > 0 ? ((avgEndNodeEfficiency ** 1.5) / (consumptionFactor * 0.45)) : 0;
    aiBased['Network Lifetime (days)'] *= lifetimeFactor;
    traditional['Network Lifetime (days)'] *= lifetimeFactor * 0.85;
    
    // Remap energy efficiency to user-specified range
    // avgEndNodeEfficiency realistically varies from 0.8 (all weak nodes) to 1.0 (all perfect nodes)
    const normalizedEfficiency = (avgEndNodeEfficiency - 0.8) / (1.0 - 0.8); // Maps 0.8 -> 0, 1.0 -> 1
    const aiEnergyEfficiency = 0.85 + (normalizedEfficiency * (0.92 - 0.85)); // Map to 85-92% range
    aiBased['Energy Efficiency'] = Math.max(0.85, Math.min(0.92, aiEnergyEfficiency));
    traditional['Energy Efficiency'] = aiBased['Energy Efficiency'] - 0.05;

    // 3. Scalability & Delay (affected by node count)
    const scaleFactor = 1 + (endNodes.length / 150);
    aiBased['End-to-end Delay (ms)'] *= scaleFactor;
    traditional['End-to-end Delay (ms)'] *= scaleFactor * 1.1;

    // 4. Malicious Node Penalties
    if (maliciousNodeIds.length > 0) {
        const attackSeverity = 1 + maliciousNodeIds.length / nodes.length * 5;
        traditional['Packet Delivery Ratio'] *= (0.3 / attackSeverity);
        traditional['End-to-end Delay (ms)'] *= (1.5 * attackSeverity);
        traditional['Robustness Index'] *= 0.2;
        traditional['Network Lifetime (days)'] *= 0.5;
        // AI model is resilient
        aiBased['Robustness Index'] = Math.min(0.99, aiBased['Robustness Index'] * 1.05);
    }
    
    // 5. Topology-specific performance scaling based on user-defined hierarchy
    let topologyModifier = 1.0;
    if (topology.includes('Cluster Mesh')) {
        topologyModifier = 1.15; // Primary: Best performance
    } else if (topology.includes('Mesh')) {
        topologyModifier = 1.08; // Secondary: Good performance
    } else if (topology.includes('Cluster')) {
        topologyModifier = 1.0;   // Tertiary: Baseline performance
    } else if (topology.includes('Grid') || topology.includes('Random')) {
        topologyModifier = 0.98;
    } else { // Star, Ring, Bus - less efficient for ad hoc
        topologyModifier = 0.92;
    }
    
    const lowerIsBetterKeys: (keyof SimulationParameters)[] = ['End-to-end Delay (ms)', 'Energy Consumption (J)'];

    Object.keys(aiBased).forEach(key => {
        const paramKey = key as keyof SimulationParameters;
        const aiTopologyModifier = topologyModifier;
        const tradTopologyModifier = 1 + (topologyModifier - 1) * 0.7; // Traditional benefits less

        if (lowerIsBetterKeys.includes(paramKey)) {
            aiBased[paramKey] /= aiTopologyModifier;
            traditional[paramKey] /= tradTopologyModifier;
        } else {
            aiBased[paramKey] *= aiTopologyModifier;
            traditional[paramKey] *= tradTopologyModifier;
        }
    });

    // Final cleanup: Clamp percentage-based values and round numbers
    Object.keys(aiBased).forEach(key => {
        const paramKey = key as keyof SimulationParameters;
        
        if (key === 'Packet Delivery Ratio') {
            // After all modifiers, the value could be e.g. 0.7 to 1.1. Let's normalize this variation.
            const normalize = (val: number) => (val - 0.7) / (1.1 - 0.7); // Map 0.7 -> 0, 1.1 -> 1
            const normalizedAI = normalize(aiBased[paramKey]);
            
            // Map normalized value to the user's desired 85-92% range
            const aiPdr = 0.85 + (normalizedAI * (0.92 - 0.85));
            aiBased[paramKey] = Math.max(0.85, Math.min(0.92, aiPdr)); // Firm clamp

            // Traditional is 5 percentage points lower
            traditional[paramKey] = aiBased[paramKey] - 0.05;
        }
        else if (['Energy Efficiency', 'Scalability Index', 'Robustness Index', 'Adaptability Rate'].includes(key)) {
             // General clamping for other percentage metrics. Energy Efficiency is already handled.
             aiBased[paramKey] = Math.min(0.99, aiBased[paramKey]);
             traditional[paramKey] = Math.min(0.95, traditional[paramKey]);
        }
        
        if (['End-to-end Delay (ms)', 'Energy Consumption (J)', 'Network Lifetime (days)', 'Computational Efficiency (ops/J)'].includes(key)) {
            aiBased[paramKey] = Math.round(aiBased[paramKey]);
            traditional[paramKey] = Math.round(traditional[paramKey]);
        }
    });

    return {
      'AI-Based': aiBased,
      'Traditional': traditional,
    };
  }
}

export const networkAnalysisService = new NetworkAnalysisService();