import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';

type Camera = {
  id: string;
  name: string;
  status: 'Live' | 'Recording' | 'Offline';
  location: string;
  events: number;
};

const cameras: Camera[] = [
  { id: 'cam-01', name: 'Gate A', status: 'Live', location: 'South Entrance', events: 2 },
  { id: 'cam-02', name: 'Parking 2', status: 'Recording', location: 'Lot B', events: 5 },
  { id: 'cam-03', name: 'Warehouse', status: 'Offline', location: 'Building 1', events: 0 },
  { id: 'cam-04', name: 'Main Hall', status: 'Live', location: 'Lobby', events: 1 },
];

const metrics = [
  { label: 'Online', value: '17/21' },
  { label: 'Threats', value: '3' },
  { label: 'Alerts', value: '08' },
];

const recentEvents = [
  'Motion detected - Gate A',
  'Door opened - South Entrance',
  'Storage zone disconnected',
];

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#101828" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Monitoring</Text>
            <Text style={styles.title}>VMS Dashboard</Text>
          </View>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Live</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricRow}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metricCard}>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Camera Grid</Text>
        <View style={styles.grid}>
          {cameras.map((camera) => (
            <View key={camera.id} style={styles.cameraCard}>
              <View style={styles.cameraPreview} />
              <View style={styles.cameraMeta}>
                <Text style={styles.cameraName}>{camera.name}</Text>
                <Text style={styles.cameraLocation}>{camera.location}</Text>
              </View>
              <View style={styles.cameraFooter}>
                <Text style={[styles.status, camera.status === 'Live' ? styles.live : camera.status === 'Recording' ? styles.recording : styles.offline]}>
                  {camera.status}
                </Text>
                <Text style={styles.eventCount}>{camera.events} events</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Events</Text>
        <View style={styles.eventsCard}>
          {recentEvents.map((event) => (
            <View key={event} style={styles.eventRow}>
              <View style={styles.eventDot} />
              <Text style={styles.eventText}>{event}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101828',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  eyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#ecfeff',
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 14,
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 12,
  },
  cameraCard: {
    width: '48%',
    backgroundColor: '#111827',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cameraPreview: {
    height: 120,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  cameraMeta: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  cameraName: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 16,
  },
  cameraLocation: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  cameraFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
  },
  live: {
    color: '#34d399',
  },
  recording: {
    color: '#fbbf24',
  },
  offline: {
    color: '#f87171',
  },
  eventCount: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  eventsCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#1f2937',
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#22c55e',
    marginRight: 12,
  },
  eventText: {
    color: '#e2e8f0',
    fontSize: 14,
  },
});
