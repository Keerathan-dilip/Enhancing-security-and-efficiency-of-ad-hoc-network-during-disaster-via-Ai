export enum Workspace {
  CODE = 'CODE',
  VISUAL = 'VISUAL',
}

export enum NetworkComponentType {
  NODE = 'NODE',
  ROUTER = 'ROUTER',
  SWITCH = 'SWITCH',
  BASE_STATION = 'BASE_STATION',
}

export type NetworkTopology = 'random' | 'grid' | 'cluster' | 'mesh' | 'ring' | 'bus';

export interface Node {
  id: string;
  type: NetworkComponentType;
  x: number;
  y: number;
  ipAddress: string;
  energyEfficiency: number; // Represents health/battery for mobile nodes
  energySpent: number; // Consumption rate
  // Optional, type-specific properties
  packetForwardingCapacity?: number; // For ROUTER (packets/sec)
  portCount?: number; // For SWITCH
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface AnimatedPacket {
  id:string;
  path: string[];
  progress: number; // 0 to 1 over the whole path
  color: string;
  startTime: number;
  duration: number;
}

export interface SimulationParameters {
  [key: string]: number;
  'Packet Delivery Ratio': number;
  'End-to-end Delay (ms)': number;
  'Energy Consumption (J)': number;
  'Network Lifetime (days)': number;
  'Scalability Index': number;
  'Computational Efficiency (ops/J)': number;
  'Energy Efficiency': number;
  'Robustness Index': number;
  'Adaptability Rate': number;
}