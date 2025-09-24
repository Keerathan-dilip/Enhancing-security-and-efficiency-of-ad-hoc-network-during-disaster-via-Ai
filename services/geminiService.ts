import { GoogleGenAI } from "@google/genai";

interface NetworkInsightsData {
  nodeCount: number;
  connectionCount: number;
  topology: string;
  avgDegree: number;
  isolatedNodes: number;
  routerCount: number;
  switchCount: number;
  baseStationCount: number;
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
      As a network engineering expert, provide a detailed analysis of the following network topology for a simulation tool: "${topology}".

      Your explanation must be structured with the following sections. Use the exact section headers provided below, wrapping them in double asterisks (e.g., **Definition:**). Also, wrap each protocol name you mention in double asterisks (e.g., **AODV**).

      **Definition:** A detailed, one-paragraph explanation of what this topology is.
      **Use Cases:** A one-paragraph description of the typical environments or scenarios where this topology is deployed.
      **Advantages:** A list of 2-3 key strengths of this topology. Start each point on a new line with an asterisk (*).
      **Disadvantages:** A list of 2-3 key weaknesses or challenges. Start each point on a new line with an asterisk (*).
      **Applicable Protocols:** State the primary ad hoc routing protocol that is most suitable. Then, briefly mention one or two common alternative protocols.
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
      The user has designed a network in the visual builder. Based on the following live data, provide a concise analysis that is **completely related** to their specific design.

      Network Data:
      - Total Node Count: ${data.nodeCount}
      - Infrastructure: ${data.routerCount} Routers, ${data.switchCount} Switches, ${data.baseStationCount} Base Stations
      - Connection Count: ${data.connectionCount}
      - Identified Topology: ${data.topology}
      - Average Node Degree (Connections per node): ${(data.avgDegree).toFixed(2)}
      - Isolated Nodes (0 connections): ${data.isolatedNodes}
      - Average Mobile Node Energy Efficiency: ${data.avgEnergyEfficiency.toFixed(1)}%
      - Weak Nodes (efficiency < 85%): ${data.weakNodes}

      Please structure your response with the following sections, using markdown bold for headers (e.g., **Overall Health**). Do not use any other markdown.

      **Overall Health:** A one-sentence summary of the network's condition based on the data.
      **Strengths:** 2-3 bullet points on what is good about this specific configuration, referencing the data provided (e.g., "Good use of routers for segmentation"). Use '*' for bullet points.
      **Risks & Weaknesses:** 2-3 bullet points on potential issues, referencing the data (e.g., "${data.isolatedNodes} isolated nodes cannot communicate"). Use '*' for bullet points.
      **Recommendations:** 2-3 bullet points with actionable advice for improvement (e.g., "Use the 'Auto-Connect' feature to integrate isolated nodes."). Use '*' for bullet points.

      Keep the language clear, direct, and helpful. Your analysis must be grounded in the provided numbers.
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
      * The cluster-based structure with ${data.routerCount} routers is efficient for scalability.
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
            return `**Definition:** A star topology is a network setup where every node connects to a central hub, like a switch or router. All traffic passes through this central point.
**Use Cases:** Commonly found in home and small office networks (e.g., Wi-Fi), where devices connect to a central wireless router.
**Advantages:**
* Easy to install and manage.
* Failure of a single node does not affect the rest of the network.
* Easy to add new nodes.
**Disadvantages:**
* If the central hub fails, the entire network goes down.
* Performance is dependent on the capability of the central hub.
* Can be more expensive due to the cost of the central device.
**Applicable Protocols:** This centralized topology does not use ad hoc protocols. A common infrastructure protocol is **802.11 (Wi-Fi)**.`;
        case 'ring topology':
            return `**Definition:** In a ring topology, each node is connected to exactly two other nodes, forming a single continuous pathway for signals through each node - like a circle.
**Use Cases:** Often used in metropolitan area networks (MANs) and some office buildings.
**Advantages:**
* Performs better than a bus topology under heavy network load.
* Prevents network collisions due to its unidirectional data flow.
* No central hub required.
**Disadvantages:**
* Failure of one node or cable can disrupt the entire network.
* Changes made to the network, like adding or removing nodes, affect the whole network.
* Troubleshooting is difficult as a single fault can be hard to locate.
**Applicable Protocols:** The primary protocol is **Token Ring**. It is not typically used for dynamic ad hoc networks.`;
        case 'mesh topology':
            return `**Definition:** A mesh topology is a highly reliable setup where nodes are interconnected with many redundant paths, meaning most nodes are connected to multiple other nodes.
**Use Cases:** Ideal for critical applications like city-wide Wi-Fi, public safety communications, and large-scale ad hoc networks where reliability is paramount.
**Advantages:**
* Highly robust; failure of one node rarely disrupts the network.
* Can handle high amounts of traffic.
* Adding new nodes does not disrupt network communication.
**Disadvantages:**
* Can be very expensive and complex to install and maintain due to extensive cabling.
* High potential for redundant connections, which can be inefficient.
**Applicable Protocols:** The primary protocol is **AODV** (Ad hoc On-Demand Distance Vector). Alternatives include **DSR** and **OLSR**.`;
        case 'cluster mesh topology':
            return `**Definition:** A hybrid topology where nodes are organized into groups or 'clusters,' each with a designated cluster head. Connections within each cluster are dense (like a mesh), and cluster heads are interconnected.
**Use Cases:** Excellent for large, scalable mobile ad hoc networks (MANETs) or wireless sensor networks where energy efficiency and organization are key.
**Advantages:**
* Combines the scalability of a cluster/star topology with the robustness of a mesh.
* Improves routing efficiency and reduces overhead.
* Enhances network lifetime by rotating cluster heads.
**Disadvantages:**
* More complex to manage due to the hierarchical structure.
* Performance can depend heavily on the cluster head selection algorithm.
**Applicable Protocols:** The primary protocol is **ZRP** (Zone Routing Protocol). An alternative for simple clustering is **LEACH**.`;
        default:
            return `**Definition:** This is a custom or hybrid network configuration, often forming dynamic clusters where nodes group together based on proximity or other criteria.
**Use Cases:** Suited for dynamic environments like mobile ad hoc networks (MANETs) or wireless sensor networks where nodes are mobile or may be added/removed frequently.
**Advantages:**
* Can be highly adaptive and energy-efficient.
* Scalable for large numbers of nodes.
**Disadvantages:**
* Overhead in maintaining clusters can be high.
* Can be complex to implement and manage.
**Applicable Protocols:** The primary protocol is **LEACH** (Low-Energy Adaptive Clustering Hierarchy). An alternative for more complex routing is **ZRP**.`;
    }
  }
}

export const geminiService = new GeminiService();