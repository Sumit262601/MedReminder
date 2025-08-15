import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'white' },
          animation: 'fade',
          header: () => null,
          navigationBarHidden: true,
        }}
      >
        <Stack.Screen name='index' options={{ headerShown: false }} />
        <Stack.Screen name='medications/add'
          options={
            {
              headerShown: true,
              headerBackTitle: "",
              title: "",
            }} />
      </Stack>
    </>
  );
}