
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
            routerCount: 0,
            switchCount: 0,
            baseStationCount: 0,
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
        routerCount: nodes.filter(n => n.type === NetworkComponentType.ROUTER).length,
        switchCount: nodes.filter(n => n.type === NetworkComponentType.SWITCH).length,
        baseStationCount: nodes.filter(n => n.type === NetworkComponentType.BASE_STATION).length,
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

    // Check for Bus: two nodes with degree 1, rest with degree 2
    const degreeOneNodes = nodeDegrees.filter(d => d === 1).length;
    const degreeTwoNodes = nodeDegrees.filter(d => d === 2).length;
    if (degreeOneNodes === 2 && degreeTwoNodes === nodes.length - 2) {
        return 'Bus Topology';
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

  public findNetworkComponents(nodes: Node[], connections: Connection[]): Node[][] {
    const components: Node[][] = [];
    if (nodes.length === 0) return components;

    const visited = new Set<string>();
    const adjacency: { [key: string]: string[] } = {};
    
    nodes.forEach(n => adjacency[n.id] = []);
    connections.forEach(c => {
        adjacency[c.from]?.push(c.to);
        adjacency[c.to]?.push(c.from);
    });

    for (const node of nodes) {
        if (!visited.has(node.id)) {
            const currentComponentNodes: Node[] = [];
            const queue: Node[] = [node];
            visited.add(node.id);
            
            while (queue.length > 0) {
                const currentNode = queue.shift()!;
                currentComponentNodes.push(currentNode);
                
                const neighbors = adjacency[currentNode.id] || [];
                for (const neighborId of neighbors) {
                    if (!visited.has(neighborId)) {
                        visited.add(neighborId);
                        const neighborNode = nodes.find(n => n.id === neighborId);
                        if (neighborNode) {
                            queue.push(neighborNode);
                        }
                    }
                }
            }
            components.push(currentComponentNodes);
        }
    }
    
    return components;
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
    // 1. Packet Delivery Ratio (based on topology and node health)
    const lowerCaseTopology = topology.toLowerCase();
    let pdrRange: [number, number] = [0.70, 0.85]; // Default for Cluster
    if (lowerCaseTopology.includes('mesh') && lowerCaseTopology.includes('cluster')) pdrRange = [0.80, 0.95];
    else if (lowerCaseTopology.includes('mesh')) pdrRange = [0.85, 1.00];
    else if (lowerCaseTopology.includes('star')) pdrRange = [0.60, 0.80];
    else if (lowerCaseTopology.includes('grid')) pdrRange = [0.55, 0.75];
    else if (lowerCaseTopology.includes('ring')) pdrRange = [0.50, 0.70];
    else if (lowerCaseTopology.includes('bus')) pdrRange = [0.40, 0.60];
    
    const normalizedHealth = (avgEndNodeEfficiency - 0.8) / (1.0 - 0.8); // Maps 0.8 health -> 0, 1.0 health -> 1
    const basePdr = pdrRange[0] + (normalizedHealth * (pdrRange[1] - pdrRange[0]));
    aiBased['Packet Delivery Ratio'] = basePdr;


    // 2. Performance boost from infrastructure (Routers, Base Stations)
    const infraBoost = 1.0 + (routers.length * 0.02) + (baseStations.length * 0.05);
    aiBased['Packet Delivery Ratio'] *= infraBoost;
    aiBased['Robustness Index'] *= infraBoost;
    aiBased['Throughput (Mbps)'] *= infraBoost;
    aiBased['End-to-end Delay (ms)'] /= Math.sqrt(infraBoost); // Better infra reduces delay
    
    // 3. Energy & Lifetime (based on actual component consumption and end-node health)
    const totalBaseConsumption = 500; // From constants.ts for ~50 nodes
    const consumptionFactor = totalEnergyConsumptionRate / totalBaseConsumption;
    
    const healthBoost = 1 + Math.max(0, (avgEndNodeEfficiency - 0.85) * 0.5); // Increased impact
    aiBased['Packet Delivery Ratio'] *= healthBoost;
    aiBased['Throughput (Mbps)'] *= healthBoost;

    aiBased['Energy Consumption (J)'] *= consumptionFactor;
    traditional['Energy Consumption (J)'] *= consumptionFactor * 1.15;
    
    // Set Energy Efficiency directly based on node health
    aiBased['Energy Efficiency'] = avgEndNodeEfficiency;
    traditional['Energy Efficiency'] = aiBased['Energy Efficiency'] * 0.95;

    // Enhanced lifetime factor for more noticeable change after removing weak nodes
    const lifetimeFactor = avgEndNodeEfficiency > 0 ? ((avgEndNodeEfficiency ** 3) / (consumptionFactor * 0.4)) : 0;
    aiBased['Network Lifetime (days)'] *= lifetimeFactor;
    traditional['Network Lifetime (days)'] *= lifetimeFactor * 0.85;
    
    // 4. Scalability, Delay & Throughput (affected by node count and connection density)
    const scaleFactor = 1 + (endNodes.length / 150);
    aiBased['End-to-end Delay (ms)'] *= scaleFactor;
    traditional['End-to-end Delay (ms)'] *= scaleFactor * 1.1;

    const connectionDensity = nodeCount > 0 ? connections.length / nodeCount : 0;
    const densityModifier = 1 + (connectionDensity / 5); // Boost for dense networks
    aiBased['Throughput (Mbps)'] *= densityModifier;
    
    // Traditional protocol PDR and throughput are derived from AI's performance
    traditional['Packet Delivery Ratio'] = aiBased['Packet Delivery Ratio'] * 0.9;
    traditional['Throughput (Mbps)'] *= densityModifier * 0.9;

    // 5. Malicious Node Penalties
    if (maliciousNodeIds.length > 0) {
        const attackSeverity = 1 + maliciousNodeIds.length / nodes.length * 5;
        traditional['Packet Delivery Ratio'] *= (0.3 / attackSeverity);
        traditional['End-to-end Delay (ms)'] *= (1.5 * attackSeverity);
        traditional['Robustness Index'] *= 0.2;
        traditional['Network Lifetime (days)'] *= 0.5;
        traditional['Throughput (Mbps)'] *= (0.1 / attackSeverity);
        // AI model is resilient
        aiBased['Robustness Index'] = Math.min(0.99, aiBased['Robustness Index'] * 1.05);
    }
    
    // Final cleanup: Clamp percentage-based values and round numbers
    Object.keys(aiBased).forEach(key => {
        const paramKey = key as keyof SimulationParameters;
        
        if (['Packet Delivery Ratio', 'Energy Efficiency', 'Scalability Index', 'Robustness Index', 'Adaptability Rate'].includes(key)) {
            // Clamp AI performance between a reasonable floor and a high ceiling
            aiBased[paramKey] = Math.max(0.40, Math.min(0.99, aiBased[paramKey]));
            
            // Clamp Traditional performance to be slightly lower, with a floor
            // and ensure it's always at least a bit worse than AI for clear visual separation
            const tradUpperCap = Math.min(0.95, aiBased[paramKey] - 0.05);
            traditional[paramKey] = Math.max(0.35, Math.min(tradUpperCap, traditional[paramKey]));
        }
        
        if (['End-to-end Delay (ms)', 'Energy Consumption (J)', 'Network Lifetime (days)', 'Computational Efficiency (ops/J)', 'Throughput (Mbps)'].includes(key)) {
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
