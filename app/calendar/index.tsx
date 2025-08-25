import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getMedications,
  getDoseHistory,
  recordDose,
  Medication,
  DoseHistory,
} from "../../utils/storage";
import { useFocusEffect } from "@react-navigation/native";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [meds, history] = await Promise.all([
        getMedications(),
        getDoseHistory(),
      ]);
      console.log("Calendar loaded medications:", meds.length);
      console.log("Calendar loaded dose history:", history.length);
      
      // Debug: Log medication details
      meds.forEach(med => {
        console.log(`Medication: ${med.name}, Start: ${med.startDate}, Duration: ${med.duration}`);
      });
      
      setMedications(meds);
      setDoseHistory(history);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(selectedDate);

  const renderCalendar = () => {
    const calendar: React.ReactElement[] = [];
    let week: React.ReactElement[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      week.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Add days of the month
    for (let day = 1; day <= days; day++) {
      const date = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        day
      );
      const isToday = new Date().toDateString() === date.toDateString();
      const hasScheduledMedications = medications.some(medication => 
        isMedicationScheduledForDate(medication, date)
      );

      week.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.today,
            hasScheduledMedications && styles.hasEvents,
          ]}
          onPress={() => setSelectedDate(date)}
        >
          <Text style={[styles.dayText, isToday && styles.todayText]}>
            {day}
          </Text>
          {hasScheduledMedications && <View style={styles.eventDot} />}
        </TouchableOpacity>
      );

      if ((firstDay + day) % 7 === 0 || day === days) {
        calendar.push(
          <View key={day} style={styles.calendarWeek}>
            {week}
          </View>
        );
        week = [];
      }
    }

    return calendar;
  };

  const isMedicationScheduledForDate = (medication: Medication, date: Date): boolean => {
    const startDate = new Date(medication.startDate);
    const selectedDate = new Date(date);
    
    // Reset time to compare only dates
    startDate.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Check if the selected date is before the start date
    if (selectedDate < startDate) {
      console.log(`${medication.name}: Selected date ${selectedDate.toDateString()} is before start date ${startDate.toDateString()}`);
      return false;
    }
    
    // Check if medication is still active based on duration
    if (medication.duration !== "Ongoing") {
      const durationMatch = medication.duration.match(/(\d+)/);
      if (durationMatch) {
        const durationDays = parseInt(durationMatch[1]);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays - 1); // -1 because start date counts as day 1
        
        if (selectedDate > endDate) {
          console.log(`${medication.name}: Selected date ${selectedDate.toDateString()} is after end date ${endDate.toDateString()}`);
          return false;
        }
      }
    }
    
    console.log(`${medication.name}: Scheduled for ${selectedDate.toDateString()}`);
    return true;
  };

  const getScheduledTimesForDate = (medication: Medication, date: Date): string[] => {
    if (!isMedicationScheduledForDate(medication, date)) {
      return [];
    }
    
    // For now, return all times. In a more advanced implementation,
    // you could check specific days of the week or other patterns
    return medication.times;
  };

  const renderMedicationsForDate = () => {
    const dateStr = selectedDate.toDateString();
    const dayDoses = doseHistory.filter(
      (dose) => new Date(dose.timestamp).toDateString() === dateStr
    );

    const scheduledMedications = medications.filter(medication => 
      isMedicationScheduledForDate(medication, selectedDate)
    );

    if (scheduledMedications.length === 0) {
      return (
        <View style={styles.noMedicationsContainer}>
          <Ionicons name="calendar-outline" size={48} color="#ccc" />
          <Text style={styles.noMedicationsText}>No medications scheduled</Text>
          <Text style={styles.noMedicationsSubtext}>
            for {selectedDate.toLocaleDateString()}
          </Text>
        </View>
      );
    }

    return scheduledMedications.map((medication) => {
      const scheduledTimes = getScheduledTimesForDate(medication, selectedDate);
      const taken = dayDoses.some(
        (dose) => dose.medicationId === medication.id && dose.taken
      );

      return (
        <View key={medication.id} style={styles.medicationCard}>
          <View
            style={[
              styles.medicationColor,
              { backgroundColor: medication.color },
            ]}
          />
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{medication.name}</Text>
            <Text style={styles.medicationDosage}>{medication.dosage}</Text>
            <View style={styles.timesContainer}>
              {scheduledTimes.map((time, index) => (
                <Text key={index} style={styles.medicationTime}>
                  {time}
                </Text>
              ))}
            </View>
          </View>
          {taken ? (
            <View style={styles.takenBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.takenText}>Taken</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.takeDoseButton,
                { backgroundColor: medication.color },
              ]}
              onPress={async () => {
                await recordDose(medication.id, true, new Date().toISOString());
                loadData();
              }}
            >
              <Text style={styles.takeDoseText}>Take</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a8e2d", "#146922"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#1a8e2d" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calendar test</Text>
        </View>

        <View style={styles.calendarContainer}>
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={() =>
                setSelectedDate(
                  new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth() - 1,
                    1
                  )
                )
              }
            >
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {selectedDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setSelectedDate(
                  new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth() + 1,
                    1
                  )
                )
              }
            >
              <Ionicons name="chevron-forward" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayHeader}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          {renderCalendar()}
        </View>

        <View style={styles.scheduleContainer}>
          <Text style={styles.scheduleTitle}>
            {selectedDate.toLocaleDateString("default", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderMedicationsForDate()}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 140 : 120,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginLeft: 15,
  },
  calendarContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    margin: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    maxHeight: 320,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  weekdayHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    color: "#666",
    fontWeight: "600",
    fontSize: 12,
  },
  calendarWeek: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calendarDay: {
    flex: 1,
    height: 35,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  today: {
    backgroundColor: "#1a8e2d15",
  },
  todayText: {
    color: "#1a8e2d",
    fontWeight: "600",
  },
  hasEvents: {
    position: "relative",
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1a8e2d",
    position: "absolute",
    bottom: "20%",
  },
  scheduleContainer: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
  },
  medicationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medicationColor: {
    width: 12,
    height: 40,
    borderRadius: 6,
    marginRight: 15,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  medicationTime: {
    fontSize: 14,
    color: "#666",
  },
  takeDoseButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  takeDoseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  takenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  takenText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  noMedicationsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noMedicationsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  noMedicationsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  timesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});