import { Node, Connection } from '../types';

class CodeGenerationService {
  public generateCppCode(nodes: Node[], connections: Connection[]): string {
    if (nodes.length === 0) {
      return "# Create a network in the Visual Builder to generate C++ code.";
    }
    const nodeCount = nodes.length;

    return `
#include "ns3/core-module.h"
#include "ns3/network-module.h"
#include "ns3/internet-module.h"
#include "ns3/point-to-point-module.h"
#include "ns3/applications-module.h"
#include "ns3/aodv-helper.h"
#include "ns3/mobility-module.h"

using namespace ns3;

int main (int argc, char *argv[])
{
  // --- Simulation Parameters ---
  // Node count based on the visual builder
  uint32_t nNodes = ${nodeCount};
  double simTime = 150.0; // seconds

  // --- Boilerplate ---
  CommandLine cmd;
  cmd.Parse (argc, argv);

  // --- Network Setup ---
  NodeContainer nodes;
  nodes.Create (nNodes);

  // Install mobility for ad hoc simulation
  MobilityHelper mobility;
  mobility.SetPositionAllocator ("ns3::GridPositionAllocator",
                                  "MinX", DoubleValue (0.0),
                                  "MinY", DoubleValue (0.0),
                                  "DeltaX", DoubleValue (5.0),
                                  "DeltaY", DoubleValue (10.0),
                                  "GridWidth", UintegerValue (10),
                                  "LayoutType", StringValue ("RowFirst"));
  mobility.SetMobilityModel ("ns3::RandomWalk2dMobilityModel",
                             "Bounds", RectangleValue (Rectangle (-50, 50, -50, 50)));
  mobility.Install (nodes);

  // --- AI-Enhanced AODV Routing ---
  // This custom helper would contain the AI logic for route selection
  AodvHelper aodv;

  // --- Internet Stack ---
  InternetStackHelper stack;
  stack.SetRoutingHelper (aodv);
  stack.Install (nodes);

  // ... rest of NS-3 setup for devices and applications ...

  Simulator::Stop (Seconds (simTime));
  Simulator::Run ();
  Simulator::Destroy ();

  return 0;
}
`;
  }

  public generateTclCode(nodes: Node[], connections: Connection[]): string {
    if (nodes.length === 0) {
      return "# Create a network in the Visual Builder to generate TCL code.";
    }

    const nodeMap = new Map<string, number>();
    nodes.forEach((node, index) => {
      nodeMap.set(node.id, index);
    });

    const nodeCreationCode = nodes.map((_, index) => `set n${index} [$ns node]`).join('\n');
    
    const connectionCreationCode = connections.map(conn => {
      const fromIndex = nodeMap.get(conn.from);
      const toIndex = nodeMap.get(conn.to);
      if (fromIndex === undefined || toIndex === undefined) {
        return `# Skipping invalid connection: ${conn.id}`;
      }
      return `$ns duplex-link $n${fromIndex} $n${toIndex} 1Mb 10ms DropTail`;
    }).join('\n');

    // Add some sample traffic for demonstration
    let trafficCode = '# No traffic configured (requires at least 2 nodes).';
    if (nodes.length >= 2) {
      const sourceNodeIndex = 0;
      const sinkNodeIndex = nodes.length - 1;
      trafficCode = `
# Setup a TCP connection between node 0 and node ${sinkNodeIndex}
set tcp [new Agent/TCP]
$ns attach-agent $n${sourceNodeIndex} $tcp
set sink [new Agent/TCPSink]
$ns attach-agent $n${sinkNodeIndex} $sink
$ns connect $tcp $sink

# Setup a FTP over TCP connection
set ftp [new Application/FTP]
$ftp attach-agent $tcp
$ns at 0.5 "$ftp start"
      `;
    }


    return `
# TCL script for configuring network scenarios, often used with NS-2.
# This script is generated based on the network designed in the Visual Builder.
# ---
# Create a simulator object
set ns [new Simulator]

# Open the trace file for analysis
set tf [open out.tr w]
$ns trace-all $tf

# Define a 'finish' procedure
proc finish {} {
    global ns tf
    $ns flush-trace
    # Close the trace file
    close $tf
    exit 0
}

# --- Node Creation (${nodes.length} nodes) ---
${nodeCreationCode}

# --- Link Creation (${connections.length} connections) ---
${connectionCreationCode}

# --- Traffic Setup ---
${trafficCode}

# Call the finish procedure at the end of the simulation
$ns at 5.0 "finish"

# Run the simulation
$ns run
`;
  }
}

export const codeGenerationService = new CodeGenerationService();
