
import { SimulationParameters } from './types';

export const SIMULATION_RESULTS: { [key: string]: SimulationParameters } = {
  'AI-Based': {
    'Packet Delivery Ratio': 0.95,
    'End-to-end Delay (ms)': 25,
    'Energy Consumption (J)': 500,
    'Network Lifetime (days)': 150,
    'Scalability Index': 0.85,
    'Computational Efficiency (ops/J)': 120,
    'Energy Efficiency': 0.90,
    'Robustness Index': 0.92,
    'Adaptability Rate': 0.88,
  },
  'Traditional': { // Averaged from DVR, LSR, ACO for comparison
    'Packet Delivery Ratio': 0.88,
    'End-to-end Delay (ms)': 35,
    'Energy Consumption (J)': 577,
    'Network Lifetime (days)': 130,
    'Scalability Index': 0.78,
    'Computational Efficiency (ops/J)': 95,
    'Energy Efficiency': 0.86,
    'Robustness Index': 0.87,
    'Adaptability Rate': 0.84,
  },
};

export const MOCK_CODE_CPP = `
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
  uint32_t nNodes = 50;
  double simTime = 150.0; // seconds

  // --- Boilerplate ---
  CommandLine cmd;
  cmd.Parse (argc, argv);

  // --- Network Setup ---
  NodeContainer nodes;
  nodes.Create (nNodes);

  // Install mobility
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

  // ... rest of NS-3 setup ...

  Simulator::Stop (Seconds (simTime));
  Simulator::Run ();
  Simulator::Destroy ();

  return 0;
}
`;
