import { GoogleGenAI } from "@google/genai";

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
      As a network engineering expert, briefly explain the following network topology in a paragraph for a simulation tool: "${topology}".
      
      Your explanation should cover:
      1. A concise definition of the topology.
      2. Its primary advantages and disadvantages in the context of ad hoc networks.
      3. Common routing protocols associated with it (like AODV, DSR, OLSR if applicable).
      
      Keep the tone professional and the explanation clear and easy to understand. Do not use markdown formatting.
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

  private getMockDescription(topology: string): string {
    switch(topology.toLowerCase()) {
        case 'star topology':
            return "A star topology is a network setup where every node connects to a central hub, like a switch or router. All traffic passes through this central device. Its main advantage is simplicity and robustness; if one node fails, others are unaffected. However, if the central hub fails, the entire network goes down. It's less common in true mobile ad hoc networks but is foundational for wireless infrastructure modes using an Access Point.";
        case 'ring topology':
            return "In a ring topology, each node is connected to exactly two other nodes, forming a single continuous pathway for signals - a ring. Data travels from node to node, with each node handling every packet. While orderly and preventing collisions, a single node or cable failure can disrupt the entire network. Protocols like Token Ring were based on this, but it is not typically used for dynamic ad hoc networks due to its rigidity.";
        case 'mesh topology':
            return "A mesh topology is a highly reliable setup where nodes are interconnected with many redundant paths. In a full mesh, every node is connected to every other node. This provides excellent fault tolerance and robustness, as data can be rerouted if a path or node fails. It is the basis for many mobile ad hoc network (MANET) routing protocols like AODV and DSR, which dynamically discover routes through the mesh of nodes.";
        default:
            return "This is a custom or hybrid network configuration. It combines elements of different topologies to suit specific needs. In ad hoc networks, nodes often form dynamic clusters, which is a type of hybrid topology. This provides a balance of efficiency and scalability, where local traffic is handled within a cluster and a cluster-head communicates with other clusters. Routing protocols like ZRP (Zone Routing Protocol) are designed for such structures.";
    }
  }
}

export const geminiService = new GeminiService();