import AsyncStorage from "@react-native-async-storage/async-storage";

const MEDICATIONS_KEY = "@medications";
const DOSE_HISTORY_KEY = "@dose_history";

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  startDate: string;
  duration: string;
  color: string;
  reminderEnabled: boolean;
  reminderRepeat: boolean;
  repeatCount: number;
  currentSupply: number;
  totalSupply: number;
  refillAt: number;
  refillReminder: boolean;
  lastRefillDate?: string;
}

export interface DoseHistory {
  id: string;
  medicationId: string;
  timestamp: string;
  taken: boolean;
}

export async function getMedications(): Promise<Medication[]> {
  try {
    const data = await AsyncStorage.getItem(MEDICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting medications:", error);
    return [];
  }
}

export async function addMedication(medication: Medication): Promise<void> {
  try {
    const medications = await getMedications();
    medications.push(medication);
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
  } catch (error) {
    console.error("Error adding medication:", error);
    throw error;
  }
}

export async function updateMedication(
  updatedMedication: Medication
): Promise<void> {
  try {
    const medications = await getMedications();
    const index = medications.findIndex(
      (med) => med.id === updatedMedication.id
    );
    if (index !== -1) {
      medications[index] = updatedMedication;
      await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
    }
  } catch (error) {
    console.error("Error updating medication:", error);
    throw error;
  }
}

export async function deleteMedication(id: string): Promise<void> {
  try {
    const medications = await getMedications();
    const updatedMedications = medications.filter((med) => med.id !== id);
    await AsyncStorage.setItem(
      MEDICATIONS_KEY,
      JSON.stringify(updatedMedications)
    );
  } catch (error) {
    console.error("Error deleting medication:", error);
    throw error;
  }
}

export async function getDoseHistory(): Promise<DoseHistory[]> {
  try {
    const data = await AsyncStorage.getItem(DOSE_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting dose history:", error);
    return [];
  }
}

export async function getTodaysDoses(): Promise<DoseHistory[]> {
  try {
    const history = await getDoseHistory();
    const today = new Date().toDateString();
    return history.filter(
      (dose) => new Date(dose.timestamp).toDateString() === today
    );
  } catch (error) {
    console.error("Error getting today's doses:", error);
    return [];
  }
}

export async function recordDose(
  medicationId: string,
  taken: boolean,
  timestamp: string
): Promise<void> {
  try {
    const history = await getDoseHistory();
    const newDose: DoseHistory = {
      id: Math.random().toString(36).substr(2, 9),
      medicationId,
      timestamp,
      taken,
    };

    history.push(newDose);
    await AsyncStorage.setItem(DOSE_HISTORY_KEY, JSON.stringify(history));

    // Update medication supply if taken
    if (taken) {
      const medications = await getMedications();
      const medication = medications.find((med) => med.id === medicationId);
      if (medication && medication.currentSupply > 0) {
        medication.currentSupply -= 1;
        await updateMedication(medication);
      }
    }
  } catch (error) {
    console.error("Error recording dose:", error);
    throw error;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    // Clear all medication data
    await AsyncStorage.removeItem(MEDICATIONS_KEY);
    // Clear all dose history
    await AsyncStorage.removeItem(DOSE_HISTORY_KEY);
    console.log("All data cleared successfully");
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}

export async function clearDataForDateRange(startDate: Date, endDate: Date): Promise<void> {
  try {
    const medications = await getMedications();
    const doseHistory = await getDoseHistory();
    
    // Filter out medications that start within the date range
    const filteredMedications = medications.filter(med => {
      const medStartDate = new Date(med.startDate);
      return medStartDate < startDate || medStartDate > endDate;
    });
    
    // Filter out dose history within the date range
    const filteredDoseHistory = doseHistory.filter(dose => {
      const doseDate = new Date(dose.timestamp);
      return doseDate < startDate || doseDate > endDate;
    });
    
    // Save filtered data
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(filteredMedications));
    await AsyncStorage.setItem(DOSE_HISTORY_KEY, JSON.stringify(filteredDoseHistory));
    
    console.log("Data cleared for date range:", startDate, "to", endDate);
  } catch (error) {
    console.error("Error clearing data for date range:", error);
    throw error;
  }
}

export async function clearOldData(beforeDate: Date): Promise<void> {
  try {
    const medications = await getMedications();
    const doseHistory = await getDoseHistory();
    
    // Remove medications that started before the specified date
    const filteredMedications = medications.filter(med => {
      const medStartDate = new Date(med.startDate);
      return medStartDate >= beforeDate;
    });
    
    // Remove dose history before the specified date
    const filteredDoseHistory = doseHistory.filter(dose => {
      const doseDate = new Date(dose.timestamp);
      return doseDate >= beforeDate;
    });
    
    // Save filtered data
    await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(filteredMedications));
    await AsyncStorage.setItem(DOSE_HISTORY_KEY, JSON.stringify(filteredDoseHistory));
    
    console.log("Old data cleared before:", beforeDate);
  } catch (error) {
    console.error("Error clearing old data:", error);
    throw error;
  }
}