import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Alert, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const BRISTOL_TYPES = [
  { id: 1, name: 'Type 1', desc: 'Hard lumps, like nuts' },
  { id: 2, name: 'Type 2', desc: 'Lumpy & sausage-like' },
  { id: 3, name: 'Type 3', desc: 'Sausage with cracks' },
  { id: 4, name: 'Type 4', desc: 'Smooth & soft snake' },
  { id: 5, name: 'Type 5', desc: 'Soft blobs, clear edges' },
  { id: 6, name: 'Type 6', desc: 'Mushy & fluffy pieces' },
  { id: 7, name: 'Type 7', desc: 'Entirely liquid' },
];

const AMOUNTS = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Regular' },
  { id: 'large', label: 'Large' },
];

const PAIN_LEVELS = [
  { id: 0, label: 'None', emoji: '😌' },
  { id: 1, label: 'Mild', emoji: '😕' },
  { id: 2, label: 'Medium', emoji: '😣' },
  { id: 3, label: 'Bad', emoji: '😫' },
];

const STOOL_COLORS = [
  { id: 'brown', hex: '#6E4B2B', label: 'Brown' },    
  { id: 'green', hex: '#556B2F', label: 'Green' },    
  { id: 'yellow', hex: '#D4AF37', label: 'Yellow' },  
  { id: 'pale', hex: '#D2C2A3', label: 'Pale/Clay' }, 
  { id: 'black', hex: '#2B2B2B', label: 'Black' },    
  { id: 'red', hex: '#8B0000', label: 'Red' },        
];

const SYMPTOMS = [
  { id: 'blood', label: 'Blood 🩸' },
  { id: 'mucus', label: 'Mucus 💧' },
  { id: 'undigested', label: 'Undigested Food 🌽' },
  { id: 'bloating', label: 'Bloating 🎈' },
  { id: 'straining', label: 'Straining 🧱' },
];

const FOOD_TAGS = [
  { id: 'bengali', label: 'Bengali / Indian 🍛' },
  { id: 'thai_chinese', label: 'Thai / Chinese 🍜' },
  { id: 'american', label: 'American Comfort 🍔' },
  { id: 'spicy', label: 'Extra Spicy 🌶️' },
  { id: 'dairy', label: 'Heavy Dairy 🧀' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('Log'); 
  const [entryDate, setEntryDate] = useState(new Date()); 
  const [showDatePicker, setShowDatePicker] = useState(false); 
  const [selectedType, setSelectedType] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [selectedPain, setSelectedPain] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState([]);
  const [isTravelMode, setIsTravelMode] = useState(false);
  const [savedLogs, setSavedLogs] = useState([]);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') console.log('Notification permissions denied.');
    })();
    loadHistory();
  }, [activeTab]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadHistory = async () => {
    try {
      const logsString = await AsyncStorage.getItem('@gut_logs');
      if (logsString) {
        const parsedLogs = JSON.parse(logsString);
        setSavedLogs(parsedLogs);
        const todayString = new Date().toLocaleDateString('en-US');
        const countToday = parsedLogs.filter(log => new Date(log.rawDate).toLocaleDateString('en-US') === todayString).length;
        setTodayCount(countToday);
      }
    } catch (e) { console.error(e); }
  };

  const scheduleReminder = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Captain's Log ⚓",
        body: "It's been over a day since your last entry. Everything okay, Captain?",
        sound: true,
      },
      trigger: { seconds: 60 * 60 * 36 },
    });
  };

  const handleSave = async () => {
    if (!selectedType) {
      Alert.alert("Hold up!", "Please select a consistency type first.");
      return;
    }
    const newEntry = {
      id: Date.now().toString(),
      rawDate: entryDate.toISOString(), 
      date: entryDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      type: selectedType, amount: selectedAmount, pain: selectedPain, color: selectedColor,
      symptoms: selectedSymptoms, foods: selectedFoods, travel: isTravelMode
    };
    try {
      const logs = JSON.parse(await AsyncStorage.getItem('@gut_logs') || '[]');
      const updated = [newEntry, ...logs].sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
      await AsyncStorage.setItem('@gut_logs', JSON.stringify(updated));
      await scheduleReminder();
      Alert.alert("Captain's Log Updated! ⚓", "Entry saved successfully.");
      setEntryDate(new Date()); setSelectedType(null); setSelectedAmount(null); setSelectedPain(null);
      setSelectedColor(null); setSelectedSymptoms([]); setSelectedFoods([]); setIsTravelMode(false);
      loadHistory();
    } catch (e) { Alert.alert("Error", "Save failed."); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Captain's Log ⚓</Text>
        <Text style={styles.greetingText}>{getGreeting()}, Captain!</Text>
        <View style={styles.dailyTracker}><Text style={styles.trackerText}>{todayCount === 0 ? "No logs yet today." : `Logs today: ${todayCount}`}</Text></View>
      </View>

      {activeTab === 'Log' ? (
        <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Time of Entry</Text>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.datePickerText}>🗓️ {entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            <Text style={styles.editDateText}>Edit</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker value={entryDate} mode="datetime" display="default" onChange={(e, d) => { setShowDatePicker(false); if(d) setEntryDate(d); }} maximumDate={new Date()} />
          )}

          <View style={styles.travelContainer}>
            <View><Text style={styles.sectionTitle}>Travel Mode ✈️</Text></View>
            <Switch value={isTravelMode} onValueChange={setIsTravelMode} trackColor={{ false: "#E5E8E8", true: "#A3B18A" }} />
          </View>

          <Text style={styles.sectionTitle}>Consistency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
            {BRISTOL_TYPES.map((item) => (
              <TouchableOpacity key={item.id} style={[styles.typeCard, selectedType === item.id && styles.selectedCard]} onPress={() => setSelectedType(item.id)}>
                <Text style={[styles.typeName, selectedType === item.id && styles.selectedText]}>{item.name}</Text>
                <Text style={[styles.typeDesc, selectedType === item.id && styles.selectedText]}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Color</Text>
          <View style={styles.colorContainer}>
            {STOOL_COLORS.map((item) => (
              <TouchableOpacity key={item.id} style={[styles.colorCircle, { backgroundColor: item.hex }, selectedColor === item.id && styles.selectedColorCircle]} onPress={() => setSelectedColor(item.id)}/>
            ))}
          </View>

          <TouchableOpacity style={styles.logButton} onPress={handleSave}><Text style={styles.buttonText}>Log Entry</Text></TouchableOpacity>
          <View style={{height: 40}} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollBody} contentContainerStyle={{paddingHorizontal: 20}}>
          {savedLogs.map((log) => (
            <View key={log.id} style={styles.historyCard}>
              <Text style={styles.historyDate}>{log.date}</Text>
              <Text style={styles.historyMain}>Type {log.type}</Text>
              <View style={[styles.historyColorBadge, {backgroundColor: STOOL_COLORS.find(c => c.id === log.color)?.hex || '#ccc'}]} />
            </View>
          ))}
          <TouchableOpacity style={styles.clearButton} onPress={() => { AsyncStorage.removeItem('@gut_logs'); setSavedLogs([]); setTodayCount(0); }}><Text style={styles.clearButtonText}>Erase Logbook</Text></TouchableOpacity>
        </ScrollView>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navTab, activeTab === 'Log' && styles.activeNavTab]} onPress={() => setActiveTab('Log')}><Text>📝 Log</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.navTab, activeTab === 'History' && styles.activeNavTab]} onPress={() => setActiveTab('History')}><Text>📊 Logbook</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F9' },
  header: { marginTop: 50, marginBottom: 15, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#2C3E50' },
  greetingText: { fontSize: 18, color: '#34495E', marginTop: 5 },
  dailyTracker: { backgroundColor: '#E8F6F3', padding: 8, borderRadius: 20, marginTop: 10 },
  trackerText: { color: '#16A085', fontWeight: '600' },
  scrollBody: { flex: 1 },
  datePickerButton: { backgroundColor: '#FFF', marginHorizontal: 20, padding: 15, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginLeft: 20, marginBottom: 10, marginTop: 10 },
  scrollContainer: { paddingLeft: 20, paddingRight: 20, marginBottom: 20 },
  typeCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginRight: 10, width: 130 },
  selectedCard: { backgroundColor: '#A3B18A' },
  colorContainer: { flexDirection: 'row', justifyContent: 'space-around', padding: 20 },
  colorCircle: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: 'transparent' },
  selectedColorCircle: { borderColor: '#2C3E50' },
  logButton: { backgroundColor: '#2C3E50', padding: 18, margin: 20, borderRadius: 30, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  historyCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 10 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#FFF', paddingBottom: 30, paddingTop: 15, justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#EEE' },
  navTab: { padding: 10, borderRadius: 15 },
  activeNavTab: { backgroundColor: '#EEE' }
});

