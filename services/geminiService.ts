import { GoogleGenAI } from "@google/genai";

interface NetworkInsightsData {
  nodeCount: number;
  connectionCount: number;
  topology: string;
  avgDegree: number;
  isolatedNodes: number;
  bottlenecks: number;
  avgEnergyEfficiency: number;
  weakNodes: number;
}

class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }

  public async getTopologyDescription(topology: string): Promise<string> {
    if (!this.ai) {
      console.warn("API_KEY not found. Using mock data for Gemini service.");
      return this.getMockDescription(topology);
    }
    
    const prompt = `
      As a network engineering expert, explain the following network topology in a structured way for a simulation tool: "${topology}".
      
      Your explanation should have three parts:
      1.  **Definition**: A concise definition of the topology.
      2.  **Protocols**: List the common routing protocols associated with it (like AODV, DSR, OLSR). It is very important that you wrap each protocol name in double asterisks, for example: **AODV**.
      3.  **Mechanism**: Explain how the topology and its protocols work in an ad hoc network. Describe how data is routed or how the network structure is maintained.
      
      Keep the tone professional and the explanation clear. Use section headers like "Definition:", "Protocols:", and "Mechanism:". Do not use markdown headings (like '#').
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Error fetching from Gemini API:", error);
      return "Could not retrieve description. The API may be unavailable or the key may be invalid.";
    }
  }

  public async getNetworkInsights(data: NetworkInsightsData): Promise<string> {
    if (!this.ai) {
      console.warn("API_KEY not found. Using mock data for Gemini insights.");
      return this.getMockInsights(data);
    }

    const prompt = `
      You are an expert network analyst providing insights for a network simulation tool.
      Based on the following data from a user-designed ad hoc network, provide a concise analysis.

      Network Data:
      - Node Count: ${data.nodeCount}
      - Connection Count: ${data.connectionCount}
      - Identified Topology: ${data.topology}
      - Average Node Degree: ${(data.avgDegree).toFixed(2)}
      - Isolated Nodes (0 connections): ${data.isolatedNodes}
      - Potential Bottlenecks (nodes with high connectivity): ${data.bottlenecks}
      - Average Energy Efficiency: ${data.avgEnergyEfficiency.toFixed(1)}%
      - Weak Nodes (efficiency < 85%): ${data.weakNodes}

      Please structure your response with the following sections, using markdown bold for headers (e.g., **Overall Health**). Do not use any other markdown.

      **Overall Health:** A one-sentence summary of the network's condition.
      **Strengths:** 2-3 bullet points on what is good about this configuration. Use '*' for bullet points.
      **Risks & Weaknesses:** 2-3 bullet points on potential issues or risks. Use '*' for bullet points.
      **Recommendations:** 2-3 bullet points with actionable advice for improvement. Use '*' for bullet points.

      Keep the language clear, direct, and helpful for someone designing a network.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Error fetching insights from Gemini API:", error);
      return "**Error:** Could not generate network insights. The API may be unavailable.";
    }
  }

  private getMockInsights(data: NetworkInsightsData): string {
    return `
      **Overall Health:** A moderately robust network with good potential, but requires attention to connectivity and node health.
      **Strengths:**
      * The cluster-based structure is efficient for scalability.
      * A majority of nodes have high energy efficiency.
      **Risks & Weaknesses:**
      * ${data.isolatedNodes > 0 ? `There are ${data.isolatedNodes} isolated nodes that cannot communicate.` : 'Connectivity seems generally good.'}
      * The presence of ${data.weakNodes} weak nodes will negatively impact the network's lifetime.
      **Recommendations:**
      * Use the 'Auto-Connect' feature to ensure all nodes are part of the network.
      * Consider removing weak nodes using the 'Reconstruct' option in the report dashboard.
    `;
  }

  private getMockDescription(topology: string): string {
    switch(topology.toLowerCase()) {
        case 'star topology':
            return `Definition: A star topology is a network setup where every node connects to a central hub. All traffic passes through this central device.
Protocols: This is a centralized topology, so it doesn't use ad hoc routing protocols like **AODV**. It relies on the central hub's logic, similar to infrastructure-based Wi-Fi.
Mechanism: The central hub (e.g., an Access Point) manages all connections and routes data between nodes. If a node wants to communicate with another, it sends the data to the hub, which then forwards it to the destination node. This is efficient but creates a single point of failure.`;
        case 'ring topology':
            return `Definition: In a ring topology, each node is connected to exactly two other nodes, forming a single continuous pathway for signals.
Protocols: **Token Ring** is a classic protocol for this topology. It is not typically used for dynamic ad hoc networks.
Mechanism: A special data packet called a "token" circulates around the ring. A node can only transmit data when it possesses the token. This prevents data collisions but can be inefficient as nodes must wait for the token. A single node failure can break the ring.`;
        case 'mesh topology':
            return `Definition: A mesh topology is a highly reliable setup where nodes are interconnected with many redundant paths.
Protocols: Common ad hoc protocols include **AODV** (Ad hoc On-Demand Distance Vector), **DSR** (Dynamic Source Routing), and **OLSR** (Optimized Link State Routing).
Mechanism: Nodes act as routers for each other to forward data. When a node wants to send a packet, protocols like **AODV** discover a route by broadcasting a request. Intermediate nodes relay this request until it reaches the destination, establishing a path. This allows the network to be self-healing and adapt to node failures or movement.`;
        case 'cluster mesh topology':
            return `Definition: A hybrid topology that combines features of cluster and mesh networks. Nodes are organized into clusters, and within each cluster, nodes are highly interconnected in a mesh-like fashion.
Protocols: This topology benefits from hybrid protocols like **ZRP** (Zone Routing Protocol). Intra-cluster routing can use proactive protocols (like **OLSR**), while inter-cluster routing can use reactive protocols (like **AODV**).
Mechanism: Cluster-heads manage their respective clusters and form a backbone for inter-cluster communication. Within a cluster, the mesh structure provides robust, redundant paths, making it resilient to node failure. This approach offers both the scalability of a clustered network and the reliability of a mesh network.`;
        default:
            return `Definition: This is a custom or hybrid network configuration, often forming dynamic clusters. It combines elements of different topologies to suit specific needs.
Protocols: Hierarchical or hybrid protocols like **ZRP** (Zone Routing Protocol) and **LEACH** (Low-Energy Adaptive Clustering Hierarchy) are common.
Mechanism: Nodes are grouped into clusters, each with a cluster-head. Communication within a cluster is direct, while communication between clusters goes through the cluster-heads. This reduces routing overhead and saves energy, providing a balance of efficiency and scalability.`;
    }
  }
}

export const geminiService = new GeminiService();